import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export const PushNotificationPrompt = () => {
  const { user } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    subscribe, 
    isLoading,
    iosInstructions,
    dismissIosInstructions,
    isIOS,
    isInstalledPWA,
  } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || isSubscribed || permission === 'denied' || dismissed) {
      return;
    }

    // For iOS not installed as PWA, we still want to show instructions
    if (!isSupported && !isIOS) {
      return;
    }

    // Check if user has dismissed before
    const dismissedAt = localStorage.getItem('push_notification_dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, isSupported, isSubscribed, permission, dismissed, isIOS]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    dismissIosInstructions();
    localStorage.setItem('push_notification_dismissed', Date.now().toString());
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  // Show iOS installation instructions
  if (showPrompt && isIOS && !isInstalledPWA) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                Install Race Technik
              </h3>

              <p className="text-sm text-muted-foreground mb-4">
                To receive push notifications on iPhone, install the app to your home screen:
              </p>

              <div className="w-full space-y-3 text-left mb-6">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Share className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">1. Tap Share</p>
                    <p className="text-xs text-muted-foreground">In Safari's bottom menu</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">2. Add to Home Screen</p>
                    <p className="text-xs text-muted-foreground">Scroll down and tap this option</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">3. Enable Notifications</p>
                    <p className="text-xs text-muted-foreground">Open from home screen & allow notifications</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleDismiss}
                className="w-full"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!showPrompt || iosInstructions) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-primary" />
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">
              Stay Updated
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              Get instant notifications when your vehicle service progresses, 
              including stage updates and pickup readiness.
            </p>

            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1"
              >
                Not Now
              </Button>
              <Button
                onClick={handleEnable}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
