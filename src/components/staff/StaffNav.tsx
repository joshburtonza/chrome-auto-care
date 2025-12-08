import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Calendar, Users, LogOut, Package, Store, ShoppingBag, ListTodo, UsersRound } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MobileStaffNav } from './MobileStaffNav';
import { cn } from '@/lib/utils';

export const StaffNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/staff/work-queue', label: 'Work Queue', icon: ListTodo },
    { path: '/staff/bookings', label: 'Bookings', icon: Calendar },
    { path: '/staff/customers', label: 'Customers', icon: Users },
    { path: '/staff/services', label: 'Services', icon: Package },
    { path: '/staff/merchandise', label: 'Merchandise', icon: Store },
    { path: '/staff/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/staff/team', label: 'Team', icon: UsersRound },
  ];

  return (
    <>
      {/* Mobile Navigation */}
      <MobileStaffNav />
      
      {/* Desktop Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-10">
              <Link 
                to="/staff/dashboard" 
                className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Staff Portal
              </Link>
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={cn(
                          "relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md",
                          isActive 
                            ? "text-foreground" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        <span className="hidden lg:inline">{item.label}</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-accent-soft to-primary rounded-full" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
              <button 
                onClick={signOut} 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-md"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
