import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, AlertCircle, Phone, Eye, EyeOff } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { getAuthProviderSettings } from '../lib/authProviderSettings';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn, signUp, signInWithGoogle, signInWithFacebook, signInWithApple, resendVerificationEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [authSettings, setAuthSettings] = useState<any>({
    googleEnabled: true,
    facebookEnabled: true,
    appleEnabled: false,
    maxProviders: 2
  });
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    try {
      // Load general settings
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: any = {};
      (data as any[])?.forEach((item) => {
        const key = item.setting_key;
        const value = item.setting_value;
        settingsObj[key] = typeof value === 'string' ? value : value?.value || '';
      });
      setSiteSettings(settingsObj);

      // Load Auth Provider Settings
      const authConfig = await getAuthProviderSettings();
      setAuthSettings(authConfig);

    } catch (error) {
      console.error('Error loading site settings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setShowResendVerification(false);
    setLoading(true);

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    try {
      if (isSignUp) {
        if (!phone) {
          setError('Phone number is required');
          setLoading(false);
          return;
        }
        // NOTE: This logic is now handled centrally in AuthContext to prevent duplicates
        const { error, needsEmailVerification } = await signUp(email, password, fullName, phone);
        if (error) {
          console.error('Signup Error Details:', error);
          // Show technical details if available to help debugging
          const technicalDetails = error.status ? ` (Status: ${error.status})` : '';
          setError(`Supabase Error: ${error.message}${technicalDetails}`);
          setShowResendVerification(false);
        } else if (needsEmailVerification) {
          setSuccessMessage('Account created successfully! Please check your email to verify your account before signing in.');
          setShowResendVerification(true);
          setPassword('');
          setFullName('');
          setPhone('');
        } else {
          setEmail('');
          setPassword('');
          setFullName('');
          setPhone('');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          if (error.message.toLowerCase().includes('email') &&
              (error.message.toLowerCase().includes('verify') ||
               error.message.toLowerCase().includes('confirm') ||
               error.message.toLowerCase().includes('not confirmed'))) {
            setShowResendVerification(true);
          } else {
            setShowResendVerification(false);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setResendingEmail(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error, success } = await resendVerificationEmail(email);

      if (error) {
        setError(error.message);
      } else if (success) {
        setSuccessMessage('Verification email sent! Please check your inbox and spam folder.');
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      // Determine the redirect URL based on environment
      const isDev = window.location.hostname === 'localhost';
      const redirectTo = isDev 
        ? `${window.location.origin}/reset-password` 
        : 'https://thelockout.ae/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Password reset email sent! Please check your inbox.');
        setEmail('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setSocialLoading(provider);

    try {
      let result;
      if (provider === 'google') {
        result = await signInWithGoogle();
      } else if (provider === 'facebook') {
        result = await signInWithFacebook();
      } else {
        result = await signInWithApple();
      }

      if (result.error) {
        setError(result.error.message);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <>
      <Navigation onNavigate={onNavigate} />
      <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 pb-20">
        <div className="max-w-md w-full">
          <div className="bg-black/50 rounded-2xl shadow-2xl p-8 border border-red-900/30">
          <div className="text-center mb-8">
            {siteSettings.logo_url ? (
              <div className="flex justify-center mb-4">
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings.company_name || 'Logo'}
                  className="h-20 w-auto"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
            )}
            <h1 className="text-3xl font-bold mb-2 text-white">
              {siteSettings.company_name || 'Welcome'}
            </h1>
            <p className="text-slate-400">
              {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{error}</p>
              </div>
              {showResendVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="text-sm text-primary-400 hover:text-primary-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingEmail ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Mail className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{successMessage}</p>
              </div>
              {showResendVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="text-sm text-green-400 hover:text-green-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendingEmail ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-5">
            {isSignUp && !isForgotPassword && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                      placeholder="+971 XX XXX XXXX"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {!isForgotPassword && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-red-900/30 bg-slate-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 select-none cursor-pointer">
                  Remember my details
                </label>
              </div>
            )}

            {!isSignUp && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-sm text-primary-500 hover:text-primary-600"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {!isForgotPassword && (
            <div className="mt-6">
              {/* Dynamic Social Login Buttons */}
              {(() => {
                const providers = [
                  authSettings.googleEnabled ? 'google' : null,
                  authSettings.facebookEnabled ? 'facebook' : null,
                  authSettings.appleEnabled ? 'apple' : null
                ].filter(Boolean).slice(0, authSettings.maxProviders);

                if (providers.length === 0) return null;

                return (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-red-900/30"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-black/50 text-slate-400">Or continue with</span>
                      </div>
                    </div>

                    <div className={`mt-6 grid gap-3 ${providers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {providers.includes('google') && (
                        <button
                          onClick={() => handleSocialSignIn('google')}
                          disabled={socialLoading !== null}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {socialLoading === 'google' ? (
                            <div className="w-5 h-5 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium text-white">Google</span>
                        </button>
                      )}

                      {providers.includes('facebook') && (
                        <button
                          onClick={() => handleSocialSignIn('facebook')}
                          disabled={socialLoading !== null}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {socialLoading === 'facebook' ? (
                            <div className="w-5 h-5 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium text-white">Facebook</span>
                        </button>
                      )}

                      {providers.includes('apple') && (
                        <button
                          onClick={() => handleSocialSignIn('apple')}
                          disabled={socialLoading !== null}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {socialLoading === 'apple' ? (
                            <div className="w-5 h-5 border-2 border-slate-700 border-t-primary-500 rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-1.04 3.52-.76c.74.08 2.37.5 3.3 1.83-2.92 1.6-2.43 5.4 1.12 6.8-.75 1.77-1.83 3.52-3.02 4.36zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium text-white">Apple</span>
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-primary-500 hover:text-primary-600 font-medium text-sm"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-primary-500 hover:text-primary-600 font-medium text-sm"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-red-900/30 text-center text-xs text-slate-500">
            Demo: Create an account or use your credentials
          </div>
        </div>
      </div>
    </div>
    <Footer onNavigate={onNavigate} />
    </>
  );
}
