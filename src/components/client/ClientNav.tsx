import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Car, Package, User, LogOut, Store, ClipboardCheck, ShoppingBag } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';

import { MobileNav } from './MobileNav';

export const ClientNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { cartCount } = useCart();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/services', label: 'Services', icon: Package },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/job-tracking', label: 'Tracking', icon: ClipboardCheck },
    { path: '/garage', label: 'Garage', icon: Car },
    { path: '/store', label: 'Store', icon: Store },
    { path: '/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Desktop Navigation */}
      <nav className="bg-card/50 backdrop-blur-md border-b border-border/30 sticky top-0 z-50 hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors tracking-wide">
                RACE TECHNIK
              </Link>
              <div className="flex gap-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const showBadge = item.path === '/store' && cartCount > 0;
                  return (
                    <Link key={item.path} to={item.path}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1.5 relative px-3 h-9 text-xs font-medium transition-colors ${
                          isActive 
                            ? 'text-primary bg-primary/5' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span className="hidden lg:inline">{item.label}</span>
                        {showBadge && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px]"
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
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut} 
                className="gap-1.5 h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden lg:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
