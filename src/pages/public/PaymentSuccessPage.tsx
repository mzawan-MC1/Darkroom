import { useEffect, useState } from 'react';
import { CheckCircle, Loader, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function PaymentSuccessPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setError('No payment session found');
      setLoading(false);
    }
  }, []);

  const verifyPayment = async (sessionId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          bookings(booking_number, game_id, scheduled_date),
          orders(order_number),
          lobby_game_passes(*)
        `)
        .eq('provider_session_id', sessionId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPaymentDetails(data);
      } else {
        setError('Payment not found');
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (user) {
      window.location.href = '/customer';
    } else {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-green-100">Your payment has been processed successfully</p>
        </div>

        <div className="p-8">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-semibold text-gray-900">
                {paymentDetails?.currency} {paymentDetails?.amount?.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Payment Status</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {paymentDetails?.status === 'paid' ? 'Paid' : paymentDetails?.status}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-semibold text-gray-900 capitalize">
                {paymentDetails?.payment_method || 'Card'}
              </span>
            </div>

            {paymentDetails?.provider_payment_id && (
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-mono text-sm text-gray-900">
                  {paymentDetails.provider_payment_id}
                </span>
              </div>
            )}

            {paymentDetails?.bookings && (
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Booking Reference</span>
                <span className="font-semibold text-gray-900">
                  {paymentDetails.bookings.booking_number}
                </span>
              </div>
            )}

            {paymentDetails?.orders && (
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Order Reference</span>
                <span className="font-semibold text-gray-900">
                  {paymentDetails.orders.order_number}
                </span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              <li>A confirmation email has been sent to your registered email address</li>
              <li>You can view your booking details in your customer portal</li>
              <li>Please arrive 15 minutes before your scheduled time</li>
            </ul>
          </div>

          <button
            onClick={handleContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {user ? 'Go to My Bookings' : 'Return Home'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
