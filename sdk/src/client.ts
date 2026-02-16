import {
  ConsentManagerOptions,
  ConsentSDKError,
  ApiResponse,
} from './types';

// ============================================================
// HTTP Client — lightweight fetch-based API client
// ============================================================

export class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private debug: boolean;

  constructor(options: ConsentManagerOptions) {
    this.baseUrl = (options.baseUrl || 'https://api.concurin.com').replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 10000;
    this.debug = options.debug || false;
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[ConsentSDK] ${message}`, data || '');
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | undefined>
  ): Promise<ApiResponse<T>> {
    let url = `${this.baseUrl}${path}`;

    // Append query params
    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    this.log(`${method} ${url}`, body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new ConsentSDKError(
          responseBody.error || responseBody.message || `HTTP ${response.status}`,
          response.status,
          responseBody.code || 'API_ERROR'
        );
      }

      this.log(`Response ${response.status}`, responseBody);
      return responseBody as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ConsentSDKError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ConsentSDKError(
          `Request timed out after ${this.timeout}ms`,
          408,
          'TIMEOUT'
        );
      }

      throw new ConsentSDKError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
        0,
        'NETWORK_ERROR'
      );
    }
  }

  async get<T>(path: string, queryParams?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, queryParams);
  }

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}
