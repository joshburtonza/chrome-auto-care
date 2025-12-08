import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Calendar, Car, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Haptic feedback utility
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10); // Short 10ms vibration
  }
};

export const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/services', label: 'Services', icon: Package },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/garage', label: 'Garage', icon: Car },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-xl border-t border-border/30" />
      
      {/* Safe area padding for iOS */}
      <div className="relative px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={triggerHaptic}
                className="flex flex-col items-center justify-center flex-1 py-2 relative"
              >
                <motion.div 
                  className="relative flex flex-col items-center"
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -inset-2 bg-primary/10 rounded-xl"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon 
                      className={`w-5 h-5 relative z-10 transition-colors ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                  </div>
                  <span 
                    className={`text-[10px] mt-1 font-medium transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
