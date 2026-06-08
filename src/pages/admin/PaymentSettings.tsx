import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Save, AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react';

interface PaymentSettings {
  id?: string;
  provider: 'stripe' | 'network_international' | 'mpgs_adib0';
  mode: 'test' | 'live';
  publishable_key: string;
  secret_key: string;
  webhook_secret: string;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  is_active: boolean;
  // MPGS specific
  merchant_name?: string;
  merchant_logo_url?: string;
  gateway_region_base_url?: string;
  api_version?: number;
  timeout_url?: string;
  timeout_seconds?: number;
  require_billing_address?: boolean;
  require_customer_email?: boolean;
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    provider: 'stripe',
    mode: 'test',
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    merchant_id: '',
    return_url: '/payment/success',
    cancel_url: '/payment/cancel',
    is_active: true,
    // MPGS defaults
    merchant_name: 'LockOut Recreational Playground',
    gateway_region_base_url: 'https://eu-gateway.mastercard.com',
    api_version: 74,
    timeout_url: '/payment/timeout',
    timeout_seconds: 1800,
    require_billing_address: true,
    require_customer_email: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from('payment_settings') as any)
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error loading payment settings:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      if (!settings.secret_key || !settings.webhook_secret) {
        throw new Error('Secret Key and Webhook Secret are required');
      }

      if (settings.provider === 'network_international' && !settings.merchant_id) {
        throw new Error('Merchant ID is required for Network International');
      }

      if (settings.id) {
        const { error } = await (supabase
          .from('payment_settings') as any)
          .update({
            provider: settings.provider,
            mode: settings.mode,
            publishable_key: settings.publishable_key,
            secret_key: settings.secret_key,
            webhook_secret: settings.webhook_secret,
            merchant_id: settings.merchant_id,
            return_url: settings.return_url,
            cancel_url: settings.cancel_url,
            is_active: settings.is_active,
            // MPGS specific
            merchant_name: settings.merchant_name,
            merchant_logo_url: settings.merchant_logo_url,
            gateway_region_base_url: settings.gateway_region_base_url,
            api_version: settings.api_version,
            timeout_url: settings.timeout_url,
            timeout_seconds: settings.timeout_seconds,
            require_billing_address: settings.require_billing_address,
            require_customer_email: settings.require_customer_email,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await (supabase
          .from('payment_settings') as any)
          .insert([settings])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings({ ...settings, id: data.id });
        }
      }

      setMessage({ type: 'success', text: 'Payment settings saved successfully' });
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const { data, error } = await supabase.functions.invoke('test-payment-connection', {
        body: { settings },
      });

      if (error) throw error;

      if (data.success) {
        setMessage({ type: 'success', text: 'Payment connection test successful!' });
      } else {
        throw new Error(data.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Error testing payment connection:', error);
      setMessage({ type: 'error', text: `Test failed: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
              <p className="text-sm text-gray-600">Configure online payment integration</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Security Notice</p>
                <p>
                  Secret keys are stored securely and never exposed to the frontend. All payment
                  operations are processed through secure backend functions.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Provider <span className="text-red-500">*</span>
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      provider: e.target.value as 'stripe' | 'network_international' | 'mpgs_adib0',
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="stripe">Stripe</option>
                  <option value="network_international">Network International</option>
                  <option value="mpgs_adib0">ADIB0 - MasterCard Gateway (MPGS)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={settings.mode}
                  onChange={(e) =>
                    setSettings({ ...settings, mode: e.target.value as 'test' | 'live' })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publishable Key
                {settings.provider === 'stripe' && (
                  <span className="text-xs text-gray-500 ml-2">
                    (starts with pk_test_ or pk_live_)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={settings.publishable_key}
                onChange={(e) =>
                  setSettings({ ...settings, publishable_key: e.target.value })
                }
                placeholder={
                  settings.provider === 'stripe'
                    ? 'pk_test_...'
                    : 'Enter publishable key'
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Safe to use in frontend code. Used for client-side initialization.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key <span className="text-red-500">*</span>
                {settings.provider === 'stripe' && (
                  <span className="text-xs text-gray-500 ml-2">
                    (starts with sk_test_ or sk_live_)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={settings.secret_key}
                  onChange={(e) =>
                    setSettings({ ...settings, secret_key: e.target.value })
                  }
                  placeholder={
                    settings.provider === 'stripe'
                      ? 'sk_test_...'
                      : 'Enter secret API key'
                  }
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showSecretKey ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-red-600 mt-1">
                Keep this secret! Only used on backend. Never exposed to frontend.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret <span className="text-red-500">*</span>
                {settings.provider === 'stripe' && (
                  <span className="text-xs text-gray-500 ml-2">
                    (starts with whsec_)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={settings.webhook_secret}
                  onChange={(e) =>
                    setSettings({ ...settings, webhook_secret: e.target.value })
                  }
                  placeholder={
                    settings.provider === 'stripe'
                      ? 'whsec_...'
                      : 'Enter webhook signing secret'
                  }
                  className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showWebhookSecret ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used to verify webhook signatures for security.
              </p>
            </div>

            {settings.provider === 'network_international' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Merchant/Outlet ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.merchant_id}
                  onChange={(e) =>
                    setSettings({ ...settings, merchant_id: e.target.value })
                  }
                  placeholder="Enter merchant or outlet ID"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {settings.provider === 'mpgs_adib0' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Merchant ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.merchant_id}
                    onChange={(e) =>
                      setSettings({ ...settings, merchant_id: e.target.value })
                    }
                    placeholder="Enter MPGS Merchant ID"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={settings.merchant_name || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, merchant_name: e.target.value })
                    }
                    placeholder="LockOut Recreational Playground"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gateway Base URL
                    </label>
                    <input
                      type="text"
                      value={settings.gateway_region_base_url || ''}
                      onChange={(e) =>
                        setSettings({ ...settings, gateway_region_base_url: e.target.value })
                      }
                      placeholder="https://eu-gateway.mastercard.com"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Version
                    </label>
                    <input
                      type="number"
                      value={settings.api_version || 74}
                      onChange={(e) =>
                        setSettings({ ...settings, api_version: parseInt(e.target.value) || 74 })
                      }
                      placeholder="74"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout URL
                  </label>
                  <input
                    type="text"
                    value={settings.timeout_url || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, timeout_url: e.target.value })
                    }
                    placeholder="/payment/timeout"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Success Return URL
                </label>
                <input
                  type="text"
                  value={settings.return_url}
                  onChange={(e) =>
                    setSettings({ ...settings, return_url: e.target.value })
                  }
                  placeholder="/payment/success"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Where to redirect after successful payment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cancel Return URL
                </label>
                <input
                  type="text"
                  value={settings.cancel_url}
                  onChange={(e) =>
                    setSettings({ ...settings, cancel_url: e.target.value })
                  }
                  placeholder="/payment/cancel"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Where to redirect if payment is cancelled
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.is_active}
                  onChange={(e) =>
                    setSettings({ ...settings, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Payment Integration
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                When enabled, online payment options will be available to customers
              </p>
            </div>
          </div>

          <div className="border-t pt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Settings
            </button>

            <button
              onClick={testConnection}
              disabled={saving || !settings.secret_key || !settings.webhook_secret}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Webhook Endpoint</h3>
            <p className="text-sm text-blue-800 mb-2">
              Configure this webhook URL in your payment provider dashboard:
            </p>
            <code className="block bg-white px-3 py-2 rounded border text-sm text-blue-900 break-all">
              {window.location.origin}/functions/v1/payment-webhook
            </code>
            <p className="text-xs text-blue-700 mt-2">
              This endpoint receives payment status updates and automatically processes them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
