import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Save, Send, AlertCircle, CheckCircle, Eye, EyeOff, Edit, X, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminPagination from '../../components/AdminPagination';

interface SMTPSettings {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
}

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[] | Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const getVariablesArray = (variables: string[] | Record<string, string>): string[] => {
  if (Array.isArray(variables)) {
    return variables;
  }
  if (typeof variables === 'object' && variables !== null) {
    return Object.keys(variables);
  }
  return [];
};

export default function EmailSettings() {
  const [settings, setSettings] = useState<SMTPSettings>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: 'Escape Room',
    use_tls: true,
    is_active: true,
  });
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(12);
  const [totalLogs, setTotalLogs] = useState(0);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [adminEmails, setAdminEmails] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchEmailLogs();
    fetchTemplates();
    fetchAdminEmails();
  }, []);

  useEffect(() => {
    if (showLogs) {
      fetchEmailLogs();
    }
  }, [logPage, logPageSize]);

  const fetchAdminEmails = async () => {
    try {
      const { data, error } = await (supabase
        .from('site_settings') as any)
        .select('setting_value')
        .eq('setting_key', 'admin_notification_emails')
        .maybeSingle();

      if (error) throw error;
      if (data && data.setting_value) {
        setAdminEmails(data.setting_value as string);
      }
    } catch (error) {
      console.error('Error fetching admin emails:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase
        .from('smtp_settings') as any)
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data as any);
      }
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const from = (logPage - 1) * logPageSize;
      const to = from + logPageSize - 1;

      const { data, error, count } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setEmailLogs((data as any[]) || []);
      setTotalLogs(count || 0);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await (supabase
        .from('email_templates') as any)
        .select('*')
        .order('template_key', { ascending: true });

      if (error) throw error;
      setTemplates((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching email templates:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (settings.id) {
        const { error } = await (supabase
          .from('smtp_settings') as any)
          .update(settings)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('smtp_settings') as any)
          .insert([settings]);

        if (error) throw error;
      }

      // Save Admin Emails
      const { data: existingSetting } = await (supabase
        .from('site_settings') as any)
        .select('id')
        .eq('setting_key', 'admin_notification_emails')
        .maybeSingle();

      if (existingSetting) {
        const { error } = await (supabase
          .from('site_settings') as any)
          .update({ 
            setting_value: adminEmails,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSetting.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('site_settings') as any)
          .insert([{
            setting_key: 'admin_notification_emails',
            setting_value: adminEmails,
            setting_type: 'text',
            description: 'Comma-separated list of admin emails for notifications'
          }]);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      fetchSettings();
      fetchAdminEmails();
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          template_key: 'user_signup',
          variables: {
            user_name: 'Test User',
            login_url: window.location.origin + '/login',
            site_name: settings.from_name,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: `Test email sent successfully to ${testEmail}!` });
        fetchEmailLogs();
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send test email. Please check your SMTP settings.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await (supabase
        .from('email_templates') as any)
        .update({
          subject: editingTemplate.subject,
          html_body: editingTemplate.html_body,
          text_body: editingTemplate.text_body,
          is_active: editingTemplate.is_active,
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Template updated successfully!' });
      setShowTemplateModal(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: 'Failed to save template. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTemplateStatus = async (template: EmailTemplate) => {
    try {
      const { error } = await (supabase
        .from('email_templates') as any)
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `Template ${!template.is_active ? 'activated' : 'deactivated'} successfully!` });
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
      setMessage({ type: 'error', text: 'Failed to update template status.' });
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-6 h-6 text-orange-600" />
          Email Settings
        </h1>
        <p className="text-slate-600 mt-1">Configure SMTP settings for sending transactional emails</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Google SMTP Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Use your Gmail address as the SMTP username</li>
              <li>Generate an App Password (not your regular Gmail password)</li>
              <li>Go to: Google Account → Security → 2-Step Verification → App Passwords</li>
              <li>Generate a new app password and use it below</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Admin Notification Emails
            </label>
            <input
              type="text"
              value={adminEmails}
              onChange={(e) => setAdminEmails(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="booking@thelockout.ae, admin@thelockout.ae"
            />
            <p className="text-xs text-slate-500 mt-1">Comma-separated list of emails to receive booking and payment notifications.</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.smtp_host}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={settings.smtp_port}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="587"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Use 587 for TLS, 465 for SSL</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              SMTP Username (Email)
            </label>
            <input
              type="email"
              value={settings.smtp_username}
              onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="your-email@gmail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              SMTP Password (App Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={settings.smtp_password}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Google App Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                From Email
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="noreply@yourdomain.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Escape Room"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="use_tls"
              checked={settings.use_tls}
              onChange={(e) => setSettings({ ...settings, use_tls: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
            <label htmlFor="use_tls" className="text-sm font-medium text-slate-700">
              Use TLS (Recommended for port 587)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={settings.is_active}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
              Active (Enable email sending)
            </label>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-200 p-6 bg-slate-50">
          <h3 className="font-semibold text-slate-900 mb-4">Test Email Configuration</h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={handleTestEmail}
              disabled={loading || !settings.id}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          {!settings.id && (
            <p className="text-sm text-amber-600 mt-2">Please save your settings before sending a test email.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="text-orange-600 hover:text-orange-700 font-medium"
        >
          {showLogs ? 'Hide' : 'Show'} Recent Email Logs
        </button>

        {showLogs && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {emailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        No email logs yet. Send a test email to see it here.
                      </td>
                    </tr>
                  ) : (
                    emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">{log.to_email}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{log.subject}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : log.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status}
                          </span>
                          {log.error_message && (
                            <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(log.sent_at || log.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination
              currentPage={logPage}
              totalPages={Math.ceil(totalLogs / logPageSize)}
              pageSize={logPageSize}
              totalItems={totalLogs}
              onPageChange={setLogPage}
              onPageSizeChange={(size) => {
                setLogPageSize(size);
                setLogPage(1);
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          Email Templates
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Variables</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No email templates found.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {template.template_key}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{template.subject}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {getVariablesArray(template.variables).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleTemplateStatus(template)}
                          className="flex items-center gap-1"
                        >
                          {template.is_active ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                              <span className="text-xs text-slate-400 font-medium">Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Edit Email Template</h2>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Template Key (Read-only)
                </label>
                <input
                  type="text"
                  value={editingTemplate.template_key}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {'{{variable_name}}'} for dynamic content (e.g., {'{{customer_name}}'})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Variables
                </label>
                <div className="flex flex-wrap gap-2">
                  {getVariablesArray(editingTemplate.variables).map((variable) => (
                    <span key={variable} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                      {'{{' + variable + '}}'}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  HTML Body
                </label>
                <textarea
                  value={editingTemplate.html_body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, html_body: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  HTML email template with inline CSS. Use variables like {'{{variable_name}}'}.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Plain Text Body (Optional)
                </label>
                <textarea
                  value={editingTemplate.text_body || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, text_body: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Plain text version for email clients that don't support HTML.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="template_active"
                  checked={editingTemplate.is_active}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label htmlFor="template_active" className="text-sm font-medium text-slate-700">
                  Active
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
