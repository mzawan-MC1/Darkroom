# Permission System Guide

## Overview

The Escape Room Management System uses a centralized, role-based permission system that automatically keeps permissions synchronized across all components.

---

## Architecture

### Centralized Permission Definitions

All permissions are defined in `/src/lib/permissions.ts`:

```typescript
export const PERMISSION_CATEGORIES = {
  'System Management': {
    manage_users: 'Manage Users',
    manage_roles: 'Manage Roles',
  },
  'Games & Bookings': {
    manage_games: 'Manage Games',
    manage_bookings: 'Manage Bookings',
    view_games: 'View Games',
    create_bookings: 'Create Bookings',
  },
  'Waivers': {
    manage_waivers: 'Manage Waivers',
    sign_waivers: 'Sign Waivers',
  },
  'Financial': {
    manage_merchandise: 'Manage Merchandise',
    purchase_merchandise: 'Purchase Merchandise',
    manage_promotions: 'Manage Promotions',
  },
  'Content & Analytics': {
    manage_cms: 'Manage CMS',
    view_reports: 'View Reports',
    view_own_bookings: 'View Own Bookings',
  },
};
```

---

## Current Permissions

### System Management
- **manage_users** - Access to Users Management (create, edit, delete users)
- **manage_roles** - Access to Roles Management (create, edit, delete roles)

### Games & Bookings
- **manage_games** - Access to Games, Lobby Games management
- **manage_bookings** - Access to Bookings, Calendar, Invoices, Lobby Passes, POS
- **view_games** - View games (customer-level access)
- **create_bookings** - Create bookings (customer-level access)

### Waivers
- **manage_waivers** - Access to Waiver Templates and Signed Waivers management
- **sign_waivers** - Sign waivers (customer-level access)

### Financial
- **manage_merchandise** - Access to Merchandise Management
- **purchase_merchandise** - Purchase merchandise (customer-level access)
- **manage_promotions** - Access to Promotions Management

### Content & Analytics
- **manage_cms** - Access to CMS (content management)
- **view_reports** - Access to Reports & Analytics
- **view_own_bookings** - View own bookings (customer-level access)

---

## Admin Dashboard Menu Permissions

Each menu item requires specific permissions:

| Menu Item | Required Permission |
|-----------|-------------------|
| Dashboard | Always visible |
| Users | `manage_users` |
| Roles | `manage_roles` |
| Games | `manage_games` |
| Bookings | `manage_bookings` |
| Calendar | `manage_bookings` |
| Invoices | `manage_bookings` |
| Reports & Analytics | `view_reports` |
| Lobby Games | `manage_games` |
| Lobby Passes | `manage_bookings` |
| Merchandise | `manage_merchandise` |
| Waiver Templates | `manage_waivers` |
| Signed Waivers | `manage_waivers` |
| Promotions | `manage_promotions` |
| CMS | `manage_cms` |
| POS | `manage_bookings` |
| Old Analytics | `view_reports` |

---

## Adding New Permissions

### Step 1: Add to Permission Categories

Edit `/src/lib/permissions.ts` and add your new permission to the appropriate category:

```typescript
export const PERMISSION_CATEGORIES = {
  'System Management': {
    manage_users: 'Manage Users',
    manage_roles: 'Manage Roles',
    // Add new system permission here
    manage_settings: 'Manage Settings',
  },
  // ... other categories
};
```

### Step 2: Use in Admin Dashboard

Edit `/src/pages/admin/AdminDashboard.tsx` to add menu items with the new permission:

```typescript
const allMenuItems: MenuItem[] = [
  // ... existing items
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: <Settings />, 
    component: SettingsManagement, 
    requiredPermission: 'manage_settings' 
  },
];
```

### Step 3: Automatic Sync

The permission will automatically appear in:
- ✅ Role Management "Edit Role" dialog (organized by category)
- ✅ Admin Dashboard menu filtering
- ✅ Permission checking functions

**No additional code changes needed!**

---

## How It Works

### 1. Permission Categories

Permissions are organized into logical categories for better UX in the "Edit Role" dialog:
- System Management
- Games & Bookings
- Waivers
- Financial
- Content & Analytics

### 2. Auto-Generated Permission List

The `getAllPermissions()` function automatically flattens all permissions from categories:

```typescript
const allPermissions = getAllPermissions();
// Returns: { manage_users: 'Manage Users', manage_roles: 'Manage Roles', ... }
```

### 3. Menu Filtering

Admin dashboard filters menu items based on user permissions:

```typescript
const menuItems = allMenuItems.filter((item) => {
  if (!item.requiredPermission) return true; // Always show items without requirements
  return hasPermission(item.requiredPermission); // Check user permission
});
```

### 4. Permission Checking

Use the `hasPermission()` function from AuthContext:

```typescript
const { hasPermission } = useAuth();

if (hasPermission('manage_users')) {
  // User can manage users
}
```

---

## System Roles

### Admin (System Role)
- Has ALL permissions by default
- Cannot be deleted or modified
- Always returns `true` for any permission check

### Customer (System Role)
- Has limited permissions:
  - view_games
  - sign_waivers
  - create_bookings
  - view_own_bookings
  - purchase_merchandise
- Cannot be deleted
- Can be modified (permissions only)

### Custom Roles
- Created by admins
- Can have any combination of permissions
- Can be edited or deleted
- Automatically get admin dashboard access if they have any of:
  - manage_users
  - manage_roles
  - manage_games
  - manage_bookings

---

## Best Practices

### 1. Group Related Permissions
When adding new features, group related permissions under existing categories or create new ones:

```typescript
'System Management': {
  manage_users: 'Manage Users',
  manage_roles: 'Manage Roles',
  manage_settings: 'Manage Settings', // Related to system management
},
```

### 2. Use Clear Permission Names
- Use verb + noun format: `manage_users`, `view_reports`
- Be specific: `manage_bookings` not just `bookings`
- Use consistent naming patterns

### 3. Reuse Permissions
Don't create duplicate permissions. For example:
- Calendar, Invoices, and POS all use `manage_bookings`
- Games and Lobby Games both use `manage_games`

### 4. Document New Permissions
When adding new permissions, update this guide with:
- Permission key and label
- Which menu items require it
- What functionality it grants access to

---

## Migration for Existing Roles

When new permissions are added, existing roles will NOT automatically receive them. This is by design for security.

To add new permissions to existing roles:
1. Go to Admin Dashboard → Roles
2. Click "Edit" on the role
3. Check the new permission checkboxes
4. Click "Update Role"

---

## Troubleshooting

### Permission Not Showing in Edit Role Dialog
- Check that it's added to `PERMISSION_CATEGORIES` in `/src/lib/permissions.ts`
- Rebuild the project: `npm run build`

### Menu Item Still Visible Despite No Permission
- Check the `requiredPermission` field in AdminDashboard
- Verify the permission key matches exactly
- Check if user has Admin role (admins see everything)

### User Can't Access Feature They Should Have Access To
- Check the role's permissions in the database
- Verify the user has the role assigned and it's active
- Check browser console for permission-related errors
- Log out and log back in to refresh permissions

---

## Security Notes

- Permissions are checked on the frontend for UX (hiding menu items)
- **Always implement server-side permission checks** via RLS policies in Supabase
- Never trust client-side permission checks alone
- Admin role bypasses all permission checks (by design)

---

## Future Enhancements

Potential improvements to the permission system:
1. **Permission Dependencies**: Automatically grant related permissions
2. **Permission Groups**: Create permission templates for common roles
3. **Audit Log**: Track who changed permissions and when
4. **Permission Testing**: UI to test permissions for different roles
5. **Dynamic Permissions**: Load permissions from database instead of code
