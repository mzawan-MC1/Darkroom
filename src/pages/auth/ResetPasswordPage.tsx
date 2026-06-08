import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
}

export default function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // No session means they didn't come from a magic link or it expired
        setError('Invalid or expired reset link. Please request a new one.');
      }
      setSessionChecked(true);
    };

    checkSession();

    // Listen for auth state changes (in case the link sets the session after load)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionChecked(true);
        setError(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onNavigate('login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navigation onNavigate={onNavigate} />
      <div className="min-h-screen bg-black flex items-center justify-center p-4 pt-24 pb-20">
        <div className="max-w-md w-full">
          <div className="bg-black/50 rounded-2xl shadow-2xl p-8 border border-red-900/30">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-white">Reset Password</h1>
              <p className="text-slate-400">Enter your new password below</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">{error}</p>
              </div>
            )}

            {success ? (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Password Updated!</h3>
                <p className="text-slate-400 mb-6">
                  Your password has been changed successfully. Redirecting to login...
                </p>
                <button
                  onClick={() => onNavigate('login')}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-white placeholder-slate-500"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !!error}
                  className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </>
  );
}
