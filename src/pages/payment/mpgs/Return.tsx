import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Loader, XCircle } from 'lucide-react';

export default function MPGSReturnPage() {
  const [status, setStatus] = useState<'loading' | 'failed'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || params.get('order_id');

    if (orderId) {
      verifyPayment(orderId);
    } else {
      setStatus('failed');
      setMessage('Missing Order ID in return URL');
    }
  }, []);

  const verifyPayment = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-mpgs-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.success && data.status === 'paid') {
        // Fetch the payment record to get the session ID for the success page
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('provider_session_id')
          .eq('payment_reference', orderId)
          .single();

        if (paymentError || !payment) {
          throw new Error('Payment record not found after verification');
        }

        // Redirect to standard success page
        window.location.href = `/payment/success?session_id=${payment.provider_session_id}`;
      } else {
        setStatus('failed');
        setMessage(data.error || 'Payment verification failed or payment was not successful.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setStatus('failed');
      setMessage(err.message || 'Error verifying payment');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Verifying Payment...</h2>
          <p className="text-gray-400">Please wait while we confirm your transaction with the bank.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-700">
        <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
        <p className="text-gray-400 mb-6">{message}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
