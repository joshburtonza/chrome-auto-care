import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Calendar, Users, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Haptic feedback utility
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

export const StaffBottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/staff/work-queue', label: 'Queue', icon: ListTodo },
    { path: '/staff/bookings', label: 'Bookings', icon: Calendar },
    { path: '/staff/customers', label: 'Customers', icon: Users },
    { path: '/staff/team', label: 'Team', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Frosted glass background with staff theme */}
      <div className="absolute inset-0 bg-[hsl(215,20%,8%)]/95 backdrop-blur-xl border-t border-white/[0.06]" />
      
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
                        className="absolute -inset-2 bg-[hsl(35,65%,50%)]/15 rounded-xl"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon 
                      className={`w-5 h-5 relative z-10 transition-colors ${
                        isActive ? 'text-[hsl(35,65%,50%)]' : 'text-[hsl(215,12%,55%)]'
                      }`}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                  </div>
                  <span 
                    className={`text-[10px] mt-1 font-medium transition-colors ${
                      isActive ? 'text-[hsl(35,65%,50%)]' : 'text-[hsl(215,12%,55%)]'
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
