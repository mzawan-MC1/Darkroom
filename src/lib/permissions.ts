export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface ModulePermissions {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  approve?: boolean;
}

export interface Module {
  id: string;
  name: string;
  actions: PermissionAction[];
}

export const MODULES: Module[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    actions: ['view'],
  },
  {
    id: 'games',
    name: 'Games',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'game_schedules',
    name: 'Game Schedules',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'bookings',
    name: 'Bookings',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
  },
  {
    id: 'lobby_games',
    name: 'Lobby Games',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'lobby_passes',
    name: 'Lobby Passes',
    actions: ['view', 'create', 'edit', 'delete', 'approve'],
  },
  {
    id: 'waivers',
    name: 'Waivers',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'waiver_templates',
    name: 'Waiver Templates',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'users',
    name: 'Users (Admins / Customers)',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'roles',
    name: 'Roles & Permissions',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'merchandise',
    name: 'Merchandise',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'orders',
    name: 'Orders / Invoices',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'blog',
    name: 'Blog',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'pages',
    name: 'Pages / CMS',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'seo',
    name: 'SEO Settings',
    actions: ['view', 'edit'],
  },
  {
    id: 'site_settings',
    name: 'Site Settings',
    actions: ['view', 'edit'],
  },
  {
    id: 'email_settings',
    name: 'Email Settings',
    actions: ['view', 'edit'],
  },
  {
    id: 'payment_settings',
    name: 'Payment Settings',
    actions: ['view', 'edit'],
  },
  {
    id: 'promotions',
    name: 'Promotions',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    id: 'reports',
    name: 'Reports',
    actions: ['view'],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    actions: ['view'],
  },
  {
    id: 'pos',
    name: 'POS System',
    actions: ['view', 'create'],
  },
  {
    id: 'calendar',
    name: 'Calendar View',
    actions: ['view'],
  },
];

export const getPermissionKey = (moduleId: string, action: PermissionAction): string => {
  return `${moduleId}.${action}`;
};

export const parsePermissionKey = (key: string): { moduleId: string; action: PermissionAction } | null => {
  const parts = key.split('.');
  if (parts.length !== 2) return null;
  return {
    moduleId: parts[0],
    action: parts[1] as PermissionAction,
  };
};

export const getAllPermissionKeys = (): string[] => {
  const keys: string[] = [];
  MODULES.forEach(module => {
    module.actions.forEach(action => {
      keys.push(getPermissionKey(module.id, action));
    });
  });
  return keys;
};

export const hasPermission = (
  permissions: Record<string, boolean> | undefined,
  moduleId: string,
  action: PermissionAction
): boolean => {
  if (!permissions) return false;
  const key = getPermissionKey(moduleId, action);
  return permissions[key] === true;
};

export const hasAnyPermission = (
  permissions: Record<string, boolean> | undefined,
  moduleId: string
): boolean => {
  if (!permissions) return false;
  const module = MODULES.find(m => m.id === moduleId);
  if (!module) return false;
  return module.actions.some(action => hasPermission(permissions, moduleId, action));
};

export const hasAnyAdminPermission = (permissions: Record<string, boolean> | undefined): boolean => {
  if (!permissions) return false;
  return MODULES.some(module => hasAnyPermission(permissions, module.id));
};

export const getModulePermissions = (
  permissions: Record<string, boolean> | undefined,
  moduleId: string
): ModulePermissions => {
  const result: ModulePermissions = {};
  const module = MODULES.find(m => m.id === moduleId);
  if (!module) return result;

  module.actions.forEach(action => {
    result[action] = hasPermission(permissions, moduleId, action);
  });

  return result;
};
