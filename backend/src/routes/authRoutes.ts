import express from 'express';
import jwt from 'jsonwebtoken';
import { findOrCreateOAuthUser, getUserRoles, assignRoleToUser, getRoleByName } from '../repositories/userRepo';

const router = express.Router();

/**
 * OAuth2 Login Endpoint
 * Initiates OAuth2 flow by redirecting to OAuth provider
 * 
 * In production: Redirect to real OAuth2 provider (DigiLocker, Aadhaar)
 * In development: Use mock OAuth2 flow
 */
router.get('/login', (req, res) => {
  const useMockAuth = process.env.OAUTH2_ISSUER === 'mock' || process.env.NODE_ENV !== 'production';
  const portal = (req.query.portal as string) || 'dp'; // dp or df

  if (useMockAuth) {
    // Mock OAuth2 flow (development + demo mode)
    // Redirect to own callback which will handle JWT creation and redirect to frontend
    const backendUrl = `${req.protocol}://${req.get('host')}`;
    const mockCallbackUrl = `${backendUrl}/auth/callback?code=dev-mock-${Date.now()}&portal=${portal}`;
    return res.redirect(mockCallbackUrl);
  }

  // Production mode: Redirect to real OAuth2 provider
  const clientId = process.env.OAUTH2_CLIENT_ID;
  const redirectUri = process.env.OAUTH2_REDIRECT_URI;
  const authorizationEndpoint = process.env.OAUTH2_AUTHORIZATION_URL;

  if (!clientId || !redirectUri || !authorizationEndpoint) {
    return res.status(500).json({
      error: 'OAuth2 configuration missing',
      message: 'OAuth2 environment variables not configured',
    });
  }

  const authUrl = new URL(authorizationEndpoint);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', portal); // Pass portal type through OAuth state

  res.redirect(authUrl.toString());
});

/**
 * OAuth2 Callback Endpoint
 * Handles OAuth2 authorization code and exchanges it for user info
 */
router.get('/callback', async (req, res) => {
  const { code, portal, state } = req.query;
  // portal comes from mock flow, state comes from real OAuth2 flow
  const portalType = (portal as string) || (state as string) || 'dp';

  if (!code) {
    return res.status(400).json({
      error: 'Missing authorization code',
      message: 'No authorization code provided',
    });
  }

  try {
    let userInfo;

    const useMockAuth = process.env.OAUTH2_ISSUER === 'mock' || process.env.NODE_ENV !== 'production';
    if (useMockAuth && code.toString().startsWith('dev-mock-')) {
      // Development mode: Mock user info
      // Use different mock users for DP vs DF to demonstrate role separation
      if (portalType === 'df') {
        userInfo = {
          sub: 'dev-df-user-67890',
          iss: 'consent-manager-dev',
          email: 'fiduciary@example.com',
          name: 'Demo Data Fiduciary',
        };
      } else {
        userInfo = {
          sub: 'dev-user-12345',
          iss: 'consent-manager-dev',
          email: 'developer@example.com',
          name: 'Development User',
        };
      }
    } else {
      // Production mode: Exchange code for access token
      const tokenResponse = await fetch(process.env.OAUTH2_TOKEN_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code.toString(),
          client_id: process.env.OAUTH2_CLIENT_ID!,
          client_secret: process.env.OAUTH2_CLIENT_SECRET!,
          redirect_uri: process.env.OAUTH2_REDIRECT_URI!,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch user info from OAuth2 provider
      const userInfoResponse = await fetch(process.env.OAUTH2_USERINFO_URL!, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      userInfo = await userInfoResponse.json();
    }

    // Create or update user in database
    const user = await findOrCreateOAuthUser({
      oauthSubject: userInfo.sub,
      oauthIssuer: userInfo.iss || 'unknown',
      email: userInfo.email,
      name: userInfo.name,
    });

    // Ensure user has the appropriate role for their portal
    const existingRoles = await getUserRoles(user.userId);
    const roleNames = existingRoles.map(r => r.roleName);
    if (portalType === 'df') {
      if (!roleNames.includes('DF_CLIENT') && !roleNames.includes('ADMIN') && !roleNames.includes('SUPER_ADMIN')) {
        const dfRole = await getRoleByName('DF_CLIENT');
        if (dfRole) await assignRoleToUser({ userId: user.userId, roleId: dfRole.roleId });
      }
    } else {
      if (!roleNames.includes('DP_USER')) {
        const dpRole = await getRoleByName('DP_USER');
        if (dpRole) await assignRoleToUser({ userId: user.userId, roleId: dpRole.roleId });
      }
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      {
        sub: userInfo.sub,
        iss: userInfo.iss || 'consent-manager',
        email: userInfo.email,
        name: userInfo.name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Set JWT as httpOnly cookie (for same-domain deployments)
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // P1-7: Redirect to frontend without token in URL
    // The httpOnly cookie (set above) handles auth via withCredentials: true
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?portal=${portalType}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Logout Endpoint
 * Clears authentication cookie
 */
router.post('/logout', (req, res) => {
  // Options MUST match what was used in res.cookie() — otherwise browsers ignore the clear
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});

export default router;
