import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentCancelPage() {
  const handleRetry = () => {
    window.history.back();
  };

  const handleHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Payment Cancelled</h1>
          <p className="text-yellow-100">Your payment was not completed</p>
        </div>

        <div className="p-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>What happened?</strong>
            </p>
            <p className="text-sm text-yellow-700">
              You cancelled the payment process or closed the payment window. Your booking has not
              been confirmed and no charges were made to your account.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-gray-900 mb-1">Want to complete your booking?</h3>
              <p className="text-sm text-gray-600">
                You can return to the previous page and try the payment again.
              </p>
            </div>

            <div className="border-l-4 border-gray-400 pl-4 py-2">
              <h3 className="font-semibold text-gray-900 mb-1">Need help?</h3>
              <p className="text-sm text-gray-600">
                If you're experiencing issues with payment, please contact our support team or try a
                different payment method.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <button
              onClick={handleHome}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
