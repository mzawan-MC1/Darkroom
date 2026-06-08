import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LoadingSpinner() {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHelp(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-charcoal-950 bg-horror-radial flex items-center justify-center px-4">
      <div className="text-center max-w-md px-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(244,63,94,0.35)]" />
        <p className="text-slate-200 font-medium mb-2">Loading...</p>
        {showHelp && (
          <div className="mt-6 p-5 dr-panel">
            <p className="text-sm text-slate-200 mb-2">
              Taking longer than expected?
            </p>
            <p className="text-xs text-slate-400">
              Check your internet connection or try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 dr-btn-primary"
            >
              Refresh Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
