export interface User {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  aadhaarId?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserWithRoles extends User {
  roles: Role[];
  permissions: Permission[];
}

export interface Role {
  roleName: string;
  description: string;
}

export interface Permission {
  permissionName: string;
  resource: string;
  action: string;
}
