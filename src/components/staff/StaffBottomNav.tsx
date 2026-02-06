import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Calendar, Target, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

// Haptic feedback utility
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export const StaffBottomNav = () => {
  const location = useLocation();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const navItems = [
    { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/staff/leads', label: 'Leads', icon: Target },
    { path: '/staff/work-queue', label: 'Queue', icon: ListTodo },
    { path: '/staff/bookings', label: 'Bookings', icon: Calendar },
    ...(isAdmin ? [{ path: '/staff/team', label: 'Team', icon: User }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background */}
      <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border" />
      
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
                        layoutId="staffBottomNavIndicator"
                        className="absolute -inset-2 bg-primary/15 rounded-xl"
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
