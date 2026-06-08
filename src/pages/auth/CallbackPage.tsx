import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { sendWelcomeEmail, sendAdminNotification } from '../../lib/emailService';
import LoadingSpinner from '../../components/LoadingSpinner';

interface CallbackPageProps {
  onNavigate: (page: string) => void;
}

export default function CallbackPage({ onNavigate }: CallbackPageProps) {
  const [status, setStatus] = useState('Verifying authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Get Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (!session) {
          console.error('No session found in callback');
          onNavigate('login');
          return;
        }

        const user = session.user;
        setStatus('Checking profile...');

        // 2. Check Profile (with retry logic)
        let profile = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!profile && attempts < maxAttempts) {
          const { data } = await (supabase
            .from('profiles') as any)
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            profile = data;
          } else {
            // Profile might be creating in background by AuthContext or Trigger
            // Wait 1 second and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        // If profile still missing, force creation (backup plan)
        if (!profile) {
           const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
           const { error: createError } = await (supabase.rpc as any)('create_user_profile', {
             p_user_id: user.id,
             p_email: user.email,
             p_full_name: fullName,
             p_phone: user.user_metadata?.phone || null,
           });
           
           if (!createError) {
             // Fetch again
             const { data } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).single();
             profile = data;
           }
        }

        // 3. Send Welcome Email if not sent
        if (profile && !profile.welcome_email_sent) {
          setStatus('Setting up your account...');
          
          // Update flag first to prevent double sends
          await (supabase
            .from('profiles') as any)
            .update({ welcome_email_sent: true })
            .eq('id', user.id);

          // Send Welcome Email
          await sendWelcomeEmail(user.email!, user.user_metadata.full_name || 'Adventurer');
          
          // Send Admin Notification
          await sendAdminNotification(user.email!, user.user_metadata.full_name || 'Adventurer', 'Google OAuth');
        }

        // 4. Redirect to Customer Portal
        setStatus('Redirecting...');
        setTimeout(() => {
          onNavigate('customer');
        }, 500);

      } catch (error) {
        console.error('Callback error:', error);
        onNavigate('login');
      }
    };

    handleCallback();
  }, [onNavigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <LoadingSpinner />
      <p className="mt-4 text-white text-lg font-medium">{status}</p>
    </div>
  );
}
