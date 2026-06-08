import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function MPGSTimeoutPage() {
  const handleRetry = () => {
    window.history.back();
  };

  const handleHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden text-center p-8">
        <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Payment Timed Out</h1>
        <p className="text-gray-400 mb-8">Your payment session has expired. Please try again.</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <button
              onClick={handleHome}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Return Home
            </button>
        </div>
      </div>
    </div>
  );
}
