export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  whatsappInstance: string;
  permissions: Permission[];
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  profile: UserProfile;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  department: string;
  phone?: string;
}

export enum UserRole {
  ADMIN = 'administrativo',
  MARKETING = 'marketing', 
  ECONOMY = 'economia'
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  whatsappConfig: WhatsAppConfig;
}

export interface WhatsAppConfig {
  instanceId: string;
  instanceName: string;
  qrEndpoint: string;
  apiEndpoint: string;
  allowedFeatures: string[];
}

// Configuraciones por rol
export const ROLE_CONFIGS: Record<UserRole, WhatsAppConfig> = {
  [UserRole.ADMIN]: {
    instanceId: 'admin-instance',
    instanceName: 'WhatsApp Administrativo',
    qrEndpoint: '/api/admin/qr',
    apiEndpoint: '/api/admin',
    allowedFeatures: ['contacts', 'messages', 'campaigns', 'settings', 'users', 'reports']
  },
  [UserRole.MARKETING]: {
    instanceId: 'marketing-instance', 
    instanceName: 'WhatsApp Marketing',
    qrEndpoint: '/api/marketing/qr',
    apiEndpoint: '/api/marketing',
    allowedFeatures: ['contacts', 'campaigns', 'flows', 'broadcasts', 'analytics']
  },
  [UserRole.ECONOMY]: {
    instanceId: 'economy-instance',
    instanceName: 'WhatsApp Economía', 
    qrEndpoint: '/api/economy/qr',
    apiEndpoint: '/api/economy',
    allowedFeatures: ['contacts', 'messages', 'reports', 'billing']
  }
};

// Permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'whatsapp', actions: ['connect', 'disconnect', 'configure'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'delete', 'execute'] },
    { resource: 'contacts', actions: ['create', 'read', 'update', 'delete', 'import'] },
    { resource: 'messages', actions: ['send', 'read', 'delete'] },
    { resource: 'reports', actions: ['read', 'export'] }
  ],
  [UserRole.MARKETING]: [
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'execute'] },
    { resource: 'contacts', actions: ['create', 'read', 'update', 'import'] },
    { resource: 'flows', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'broadcasts', actions: ['create', 'execute'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'messages', actions: ['send', 'read'] }
  ],
  [UserRole.ECONOMY]: [
    { resource: 'contacts', actions: ['read', 'import'] },
    { resource: 'messages', actions: ['send', 'read'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'billing', actions: ['read', 'update'] }
  ]
};