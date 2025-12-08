import { useState, useEffect } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if user dismissed the banner recently
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
    }

    // Show banner if installable or on iOS (not installed)
    if ((isInstallable || isIOS) && !isInstalled) {
      // Delay showing to not interrupt initial experience
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, isIOS]);

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      const installed = await promptInstall();
      if (installed) {
        setShowBanner(false);
      }
    }
  };

  if (!showBanner || isInstalled) return null;

  return (
    <>
      {/* Install Banner */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      >
        <div 
          className="bg-surface-dark/95 backdrop-blur-lg border border-chrome-400/30 rounded-xl p-5 shadow-2xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-accent-red to-accent-red/60 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-chrome-100 font-semibold text-sm">
                Install Race Technik
              </h3>
              <p className="text-chrome-400 text-xs mt-0.5">
                {isIOS 
                  ? 'Add to your home screen for quick access'
                  : 'Install for offline access & faster loading'
                }
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-chrome-500 hover:text-chrome-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1 bg-accent-red hover:bg-accent-red/80 text-white"
            >
              {isIOS ? 'How to Install' : 'Install App'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-chrome-500/30 text-chrome-300 hover:bg-chrome-700/30"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-dark border border-chrome-400/30 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-chrome-100 font-bold text-lg">Install on iOS</h3>
              <button
                onClick={handleDismiss}
                className="text-chrome-500 hover:text-chrome-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-blue font-bold text-sm">1</span>
                </div>
                <div>
                  <p className="text-chrome-200 text-sm">
                    Tap the <Share className="inline w-4 h-4 mx-1" /> Share button in Safari
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-blue font-bold text-sm">2</span>
                </div>
                <div>
                  <p className="text-chrome-200 text-sm">
                    Scroll down and tap <Plus className="inline w-4 h-4 mx-1" /> "Add to Home Screen"
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent-blue font-bold text-sm">3</span>
                </div>
                <div>
                  <p className="text-chrome-200 text-sm">
                    Tap "Add" to install Race Technik
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              className="w-full mt-6 bg-accent-red hover:bg-accent-red/80 text-white"
            >
              Got it!
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
