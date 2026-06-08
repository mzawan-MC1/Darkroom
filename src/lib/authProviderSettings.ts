import { supabase } from './supabase';

export interface AuthProviderSettings {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  appleEnabled: boolean;
  maxProviders: number;
}

const DEFAULT_SETTINGS: AuthProviderSettings = {
  googleEnabled: true,
  facebookEnabled: true,
  appleEnabled: false,
  maxProviders: 2,
};

let cachedSettings: AuthProviderSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export const getAuthProviderSettings = async (): Promise<AuthProviderSettings> => {
  const now = Date.now();
  if (cachedSettings && now - cacheTimestamp < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'oauth_google_enabled',
        'oauth_facebook_enabled',
        'oauth_apple_enabled',
        'oauth_max_providers',
      ]);

    if (error) {
      console.error('Error fetching auth settings:', error);
      return DEFAULT_SETTINGS;
    }

    const settings: any = {};
    (data as any[])?.forEach((row) => {
      settings[row.setting_key] = row.setting_value;
    });

    cachedSettings = {
      googleEnabled: settings.oauth_google_enabled ?? DEFAULT_SETTINGS.googleEnabled,
      facebookEnabled: settings.oauth_facebook_enabled ?? DEFAULT_SETTINGS.facebookEnabled,
      appleEnabled: settings.oauth_apple_enabled ?? DEFAULT_SETTINGS.appleEnabled,
      maxProviders: Number(settings.oauth_max_providers ?? DEFAULT_SETTINGS.maxProviders),
    };
    cacheTimestamp = now;

    return cachedSettings;
  } catch (err) {
    console.error('Failed to fetch auth provider settings:', err);
    return DEFAULT_SETTINGS;
  }
};

export const getEnabledProviders = async () => {
  const settings = await getAuthProviderSettings();
  const providers = [];

  if (settings.googleEnabled) providers.push('google');
  if (settings.facebookEnabled) providers.push('facebook');
  if (settings.appleEnabled) providers.push('apple');

  // If we have more than allowed, we slice (though UI should handle this gracefully too)
  return providers.slice(0, settings.maxProviders);
};
