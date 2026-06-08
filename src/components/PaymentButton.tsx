import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, Loader, AlertCircle } from 'lucide-react';

interface PaymentButtonProps {
  type: 'booking' | 'order' | 'lobby_pass';
  itemId: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function PaymentButton({
  type,
  itemId,
  amount,
  currency = 'AED',
  metadata = {},
  // onSuccess, // kept for future use
  onError,
  className = '',
  disabled = false,
}: PaymentButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPaymentEnabled();
  }, []);

  const checkPaymentEnabled = async () => {
    try {
      const { data, error } = await supabase
        .from('public_payment_settings')
        .select('is_active')
        .limit(1)
        .maybeSingle();

      // Cast data to any to avoid TS error if the View type isn't picked up yet
      const settings = data as any;

      if (!error && settings && settings.is_active) {
        setPaymentEnabled(true);
      }
    } catch (err) {
      console.error('Error checking payment settings:', err);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
        'create-payment-session',
        {
          body: {
            type,
            itemId,
            amount,
            currency,
            metadata,
          },
        }
      );

      if (sessionError) throw sessionError;

      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to create payment session');
      }

      if (sessionData.provider === 'mpgs_adib0') {
        // Handle MPGS Hosted Checkout
        await handleMPGSPayment(sessionData.sessionId);
      } else if (sessionData.checkoutUrl) {
        window.location.href = sessionData.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'Payment initiation failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleMPGSPayment = (sessionId: string) => {
    return new Promise<void>((resolve, reject) => {
      const scriptUrl = 'https://eu-gateway.mastercard.com/static/checkout/checkout.min.js';
      
      // Check if script is already loaded
      if (document.querySelector(`script[src="${scriptUrl}"]`)) {
        configureAndShow(sessionId, resolve, reject);
        return;
      }

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.dataset.error = 'errorCallback';
      script.dataset.cancel = 'cancelCallback';
      script.onload = () => configureAndShow(sessionId, resolve, reject);
      script.onerror = () => reject(new Error('Failed to load MPGS checkout script'));
      document.body.appendChild(script);
    });
  };

  const configureAndShow = (sessionId: string, resolve: () => void, reject: (err: any) => void) => {
    try {
      if (!(window as any).Checkout) {
        reject(new Error('MPGS Checkout library not found'));
        return;
      }

      console.log('Configuring MPGS Checkout (PaymentButton) with session:', sessionId);

      (window as any).Checkout.configure({
        session: {
          id: sessionId
        }
      });

      (window as any).Checkout.showPaymentPage();
      resolve();
    } catch (err) {
      reject(err);
    }
  };

  if (!paymentEnabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={disabled || processing}
        className={`dr-btn-primary w-full px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {processing ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {currency} {amount.toFixed(2)}
          </>
        )}
      </button>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-primary-500/10 border border-red-900/30 text-primary-200 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary-300" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
