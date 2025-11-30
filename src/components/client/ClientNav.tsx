import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Car, Package, User, LogOut, Store, ClipboardCheck, ShoppingBag } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

export const ClientNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { cartCount } = useCart();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/services', label: 'Services', icon: Package },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/job-tracking', label: 'Job Tracking', icon: ClipboardCheck },
    { path: '/garage', label: 'Garage', icon: Car },
    { path: '/store', label: 'Store', icon: Store },
    { path: '/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="chrome-label text-primary hover:text-primary/80 transition-colors">
              CHROMATICS
            </Link>
            <div className="hidden md:flex gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const showBadge = item.path === '/store' && cartCount > 0;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-2 relative"
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                      {showBadge && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                        >
                          {cartCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
