import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Plus, Edit2, Trash2, Lock, Check, Eye, FilePlus, Edit, Trash, CheckCircle } from 'lucide-react';
import { MODULES, getPermissionKey, type PermissionAction } from '../../lib/permissions';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  created_at: string;
}

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
};

const ACTION_ICONS: Record<PermissionAction, any> = {
  view: Eye,
  create: FilePlus,
  edit: Edit,
  delete: Trash,
  approve: CheckCircle,
};

export default function RolesManagement() {
  const { profile } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, boolean>,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: {},
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        const { error } = await (supabase
          .from('roles') as any)
          .update({
            name: formData.name,
            description: formData.description,
            permissions: formData.permissions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRole.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase.from('roles') as any).insert({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
          is_system_role: false,
          created_by: profile?.id,
        });

        if (error) throw error;
      }

      setShowModal(false);
      fetchRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert(error.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const { error } = await (supabase.from('roles') as any).delete().eq('id', roleId);
      if (error) throw error;
      fetchRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.message || 'Failed to delete role');
    }
  };

  const togglePermission = (moduleId: string, action: PermissionAction) => {
    const key = getPermissionKey(moduleId, action);
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key],
      },
    });
  };

  const toggleAllModulePermissions = (moduleId: string, value: boolean) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return;

    const newPermissions = { ...formData.permissions };
    module.actions.forEach(action => {
      const key = getPermissionKey(moduleId, action);
      newPermissions[key] = value;
    });

    setFormData({
      ...formData,
      permissions: newPermissions,
    });
  };

  const isModuleFullyEnabled = (moduleId: string): boolean => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    return module.actions.every(action => {
      const key = getPermissionKey(moduleId, action);
      return formData.permissions[key] === true;
    });
  };

  const isModulePartiallyEnabled = (moduleId: string): boolean => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    const hasAny = module.actions.some(action => {
      const key = getPermissionKey(moduleId, action);
      return formData.permissions[key] === true;
    });
    return hasAny && !isModuleFullyEnabled(moduleId);
  };

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Role Management</h1>
          <p className="text-slate-300 mt-1">Create and manage custom roles with specific permissions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  role.is_system_role ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <Shield className={`w-6 h-6 ${
                    role.is_system_role ? 'text-red-600' : 'text-primary-500'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">{role.name}</h3>
                  {role.is_system_role && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                      <Lock className="w-3 h-3" />
                      System Role
                    </span>
                  )}
                </div>
              </div>
              {!role.is_system_role && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(role)}
                    className="p-2 text-slate-600 hover:text-primary-500 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit Role"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-600 mb-4 min-h-[40px]">
              {role.description}
            </p>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">Permissions</span>
                <span className="font-medium text-slate-900">
                  {getPermissionCount(role.permissions)} granted
                </span>
              </div>
              <div className="space-y-1">
                {MODULES.filter(module => {
                  return module.actions.some(action => {
                    const key = getPermissionKey(module.id, action);
                    return role.permissions[key] === true;
                  });
                })
                  .slice(0, 3)
                  .map(module => (
                    <div key={module.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-3 h-3 text-green-600" />
                      {module.name}
                    </div>
                  ))}
                {MODULES.filter(module => {
                  return module.actions.some(action => {
                    const key = getPermissionKey(module.id, action);
                    return role.permissions[key] === true;
                  });
                }).length > 3 && (
                  <div className="text-sm text-slate-500 pl-5">
                    +{MODULES.filter(module => {
                      return module.actions.some(action => {
                        const key = getPermissionKey(module.id, action);
                        return role.permissions[key] === true;
                      });
                    }).length - 3} more modules
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  disabled={editingRole?.is_system_role}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Permissions (Module-Action Matrix)
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-4">
                  {MODULES.map(module => {
                    const isFullyEnabled = isModuleFullyEnabled(module.id);
                    const isPartiallyEnabled = isModulePartiallyEnabled(module.id);

                    return (
                      <div key={module.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isFullyEnabled}
                              ref={input => {
                                if (input) {
                                  input.indeterminate = isPartiallyEnabled;
                                }
                              }}
                              onChange={(e) => toggleAllModulePermissions(module.id, e.target.checked)}
                              className="rounded text-primary-500 focus:ring-primary-500"
                            />
                            <span className="font-medium text-slate-900 text-sm">{module.name}</span>
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {module.actions.map(action => {
                            const key = getPermissionKey(module.id, action);
                            const Icon = ACTION_ICONS[action];
                            return (
                              <label
                                key={action}
                                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors ${
                                  formData.permissions[key]
                                    ? 'border-primary-500 bg-orange-50 text-primary-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions[key] || false}
                                  onChange={() => togglePermission(module.id, action)}
                                  className="sr-only"
                                />
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{ACTION_LABELS[action]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
