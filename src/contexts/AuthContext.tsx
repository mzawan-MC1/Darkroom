import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';
import { hasAnyAdminPermission } from '../lib/permissions';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  welcome_email_sent?: boolean | null;
}

interface UserRoleData {
  role_id: string;
  role_name: string;
  is_active: boolean;
  permissions?: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  userRoles: UserRoleData[];
  activeRole: UserRoleData | null;
  isAdmin: boolean;
  isCustomer: boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, captchaToken?: string) => Promise<{ error: AuthError | null; needsEmailVerification?: boolean | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithFacebook: () => Promise<{ error: AuthError | null }>;
  signInWithApple: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshRoles: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null; success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [activeRole, setActiveRole] = useState<UserRoleData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.error('Auth initialization timeout - forcing loading to complete');
        setLoading(false);
      }
    }, 8000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (isMounted) setLoading(false);
          return;
        }

        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await Promise.all([
            fetchProfile(session.user.id),
            fetchUserRoles(session.user.id)
          ]);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        try {
          if (!isMounted) return;

          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await fetchProfile(session.user.id);
            await fetchUserRoles(session.user.id);
          } else {
            setProfile(null);
            setUserRoles([]);
            setActiveRole(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
          const phone = user.user_metadata?.phone || null;

          const { data: result, error: rpcError } = await (supabase.rpc as any)('create_user_profile', {
            p_user_id: userId,
            p_email: user.email,
            p_full_name: fullName,
            p_phone: phone,
          });

          if (rpcError) {
            console.error('Error calling create_user_profile:', rpcError);
            return;
          }

          if (result && !(result as any).success) {
            console.error('Error creating profile:', (result as any).error);
            return;
          }

          const { data: newProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (fetchError) {
            console.error('Error fetching newly created profile:', fetchError);
            return;
          }

          if (newProfile) {
            setProfile(newProfile);
            // Check and send welcome emails for newly created profile
            await checkAndSendWelcomeEmails(user, newProfile);
          }
        }
      } else {
        setProfile(data);
        // Check and send welcome emails for existing profile (e.g. login after verify)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await checkAndSendWelcomeEmails(user, data);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  const checkAndSendWelcomeEmails = async (user: User, profileData: Profile) => {
    // Only send if not already sent
    if (profileData.welcome_email_sent) return;

    try {
      console.log('Checking welcome email for:', user.email);

      // Define Unique Deduplication IDs
      const userWelcomeId = `welcome_user_${user.id}`;
      const adminNotifyId = `welcome_admin_${user.id}`;

      // 1. Attempt to log intent for User Welcome Email (Idempotency Check)
      // We try to insert a 'pending' log. If it fails due to unique constraint, we know it's already being handled.
      const { error: userLogCheck } = await (supabase
        .from('email_logs') as any)
        .insert({
          to_email: user.email || '',
          from_email: 'info@thelockout.ae', // Default sender
          subject: 'Welcome to The Lockout',
          template_key: 'welcome_email',
          status: 'pending',
          deduplication_id: userWelcomeId
        });

      if (userLogCheck) {
        if (userLogCheck.code === '23505') { // Unique violation
          console.log('Skipping duplicate welcome email for user:', user.email);
        } else {
          console.error('Error checking idempotency for user email:', userLogCheck);
        }
        // If we can't log unique, we assume sent or processing, so we skip user email.
        // But we should still check admin email separately in case one succeeded and other failed previously?
        // Ideally yes, but for simplicity let's treat them as a batch or separate checks.
        // Let's proceed to check admin email separately to be robust.
      } else {
        // Log inserted successfully, safe to send User Email
        const loginUrl = `${window.location.origin}/login`;
        const fullName = profileData.full_name || user.user_metadata?.full_name || 'Adventurer';

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: user.email,
              template_key: 'welcome_email',
              variables: {
                user_name: fullName,
                login_url: loginUrl,
                current_year: new Date().getFullYear(),
              },
            }),
          }
        ).catch(e => console.error('Failed to send user welcome email:', e));
        
        // We could update the log status to 'sent' here, but the edge function usually does its own logging.
        // Since we created the log entry to reserve the slot, we should ideally update it.
        // But for now, the existence of the row serves as the lock.
      }

      // 2. Attempt to log intent for Admin Notification (Idempotency Check)
      const { data: settings } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'admin_notification_emails')
        .maybeSingle();

      const adminEmails = (settings as any)?.setting_value || 'info@thelockout.ae';
      
      const { error: adminLogCheck } = await (supabase
        .from('email_logs') as any)
        .insert({
          to_email: adminEmails.toString(),
          from_email: 'info@thelockout.ae',
          subject: '[ADMIN] New Customer Signup',
          template_key: 'admin_new_user_notification',
          status: 'pending',
          deduplication_id: adminNotifyId
        });

      if (adminLogCheck) {
        if (adminLogCheck.code === '23505') {
           console.log('Skipping duplicate admin notification for user:', user.email);
        } else {
           console.error('Error checking idempotency for admin email:', adminLogCheck);
        }
      } else {
        // Log inserted successfully, safe to send Admin Email
        const fullName = profileData.full_name || user.user_metadata?.full_name || 'Adventurer';
        const signupMethod = user.app_metadata?.provider || 'email';

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              to: adminEmails,
              template_key: 'admin_new_user_notification',
              variables: {
                user_name: fullName,
                user_email: user.email,
                signup_method: signupMethod,
                signup_time: new Date().toLocaleString(),
              },
            }),
          }
        ).catch(e => console.error('Failed to send admin notification:', e));
      }

      // Finally update the profile flag as a secondary check
      await (supabase
        .from('profiles') as any)
        .update({ welcome_email_sent: true })
        .eq('id', user.id);

      console.log('Welcome email process completed');

      // Update local state
      setProfile(prev => prev ? { ...prev, welcome_email_sent: true } : null);

    } catch (error) {
      console.error('Error in checkAndSendWelcomeEmails:', error);
    }
  };

  const fetchUserRoles = async (userId: string, retryCount: number = 0) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          is_active,
          roles:role_id (
            name,
            permissions
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRoles([]);
        setActiveRole(null);
        return;
      }

      if (data && data.length > 0) {
        const rolesData: UserRoleData[] = data.map((ur: any) => ({
          role_id: ur.role_id,
          role_name: ur.roles?.name || '',
          is_active: ur.is_active || false,
          permissions: ur.roles?.permissions || {},
        }));

        setUserRoles(rolesData);

        const active = rolesData.find(r => r.is_active);
        setActiveRole(active || null);

        if (!active && rolesData.length > 0 && retryCount === 0) {
          const { error: rpcError } = await (supabase.rpc as any)('set_active_role', {
            p_user_id: userId,
            p_role_id: rolesData[0].role_id,
          });

          if (!rpcError) {
            await fetchUserRoles(userId, 1);
            return;
          } else {
            console.error('Error setting active role:', rpcError);
            setActiveRole(rolesData[0]);
          }
        }
      } else {
        setUserRoles([]);
        setActiveRole(null);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
      setActiveRole(null);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchUserRoles(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (data) {
        // do nothing
      }

      if (error) {
        let friendlyMessage = error.message;

        if (error.message.includes('Email not confirmed')) {
          friendlyMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.';
        } else if (error.message.includes('Invalid login credentials')) {
          friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not found') || error.message.includes('User not found')) {
          friendlyMessage = 'No account found with this email address. Please sign up first.';
        } else if (error.message.includes('Invalid password')) {
          friendlyMessage = 'Incorrect password. Please try again.';
        } else if (error.message.includes('Too many requests')) {
          friendlyMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else if (error.message.includes('Network')) {
          friendlyMessage = 'Network error. Please check your internet connection and try again.';
        }

        return {
          error: {
            ...error,
            message: friendlyMessage
          } as AuthError
        };
      }

      return { error: null };
    } catch (error) {
      return {
        error: {
          message: 'An unexpected error occurred. Please try again.',
          name: 'Error',
          status: 500
        } as AuthError
      };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, captchaToken?: string) => {
    try {
      console.log('Attempting signup with URL:', import.meta.env.VITE_SUPABASE_URL);
      // Masked key logging for debugging
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      console.log('Using Anon Key:', key.substring(0, 5) + '...' + key.substring(key.length - 5));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          captchaToken,
          data: {
            full_name: fullName,
            phone: phone || null,
          }
        }
      });

      if (error) return { error };

      // Check if email confirmation is required
      // If the user is returned but doesn't have a session, email confirmation is enabled
      const needsEmailVerification = data.user && !data.session;

      // Send welcome email after successful signup
      if (data.user) {
        try {
          const loginUrl = `${window.location.origin}/login`;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                to: email,
                template_key: 'user_signup',
                variables: {
                  user_name: fullName,
                  login_url: loginUrl,
                },
              }),
            }
          );

          if (!response.ok) {
            console.error('Failed to send welcome email:', await response.text());
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
      }

      // Profile will be automatically created by fetchProfile when onAuthStateChange fires
      return { error: null, needsEmailVerification: needsEmailVerification || null };
    } catch (error) {
      return { error: error as AuthError, needsEmailVerification: null };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        return {
          error: {
            ...error,
            message: 'Google sign-in is not configured. Please contact support or use email/password sign-in.'
          } as AuthError
        };
      }

      return { error };
    } catch (error) {
      return {
        error: {
          message: 'Google sign-in is not configured. Please contact support or use email/password sign-in.',
          name: 'OAuthError',
          status: 400
        } as AuthError
      };
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        return {
          error: {
            ...error,
            message: 'Facebook sign-in is not configured. Please contact support or use email/password sign-in.'
          } as AuthError
        };
      }

      return { error };
    } catch (error) {
      return {
        error: {
          message: 'Facebook sign-in is not configured. Please contact support or use email/password sign-in.',
          name: 'OAuthError',
          status: 400
        } as AuthError
      };
    }
  };

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        return {
          error: {
            ...error,
            message: 'Apple sign-in is not configured. Please contact support or use email/password sign-in.'
          } as AuthError
        };
      }

      return { error };
    } catch (error) {
      return {
        error: {
          message: 'Apple sign-in is not configured. Please contact support or use email/password sign-in.',
          name: 'OAuthError',
          status: 400
        } as AuthError
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        return { error: new Error(error.message), success: false };
      }

      return { error: null, success: true };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to resend verification email'),
        success: false
      };
    }
  };

  const isAdmin =
    activeRole?.role_name === 'Admin' ||
    profile?.role === 'admin' ||
    hasAnyAdminPermission(activeRole?.permissions) ||
    false;

  const isCustomer = activeRole?.role_name === 'Customer' || profile?.role === 'customer' || false;

  const hasPermission = (permission: string): boolean => {
    if (!activeRole?.permissions) return false;
    return activeRole.permissions[permission] === true;
  };

  const value = {
    user,
    profile,
    session,
    loading,
    userRoles,
    activeRole,
    isAdmin,
    isCustomer,
    hasPermission,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithFacebook,
    signInWithApple,
    signOut,
    updateProfile,
    refreshRoles,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
