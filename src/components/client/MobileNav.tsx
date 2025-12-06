import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Calendar, Car, Package, User, LogOut, Store, ClipboardCheck, ShoppingBag, Menu, X } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';

export const MobileNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { cartCount } = useCart();
  const [open, setOpen] = useState(false);

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
    <nav className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50 md:hidden">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/dashboard" className="chrome-label text-sm text-primary hover:text-primary/80 transition-colors">
            RACE TECHNIK
          </Link>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border/50">
                    <div className="chrome-label text-sm text-primary">MENU</div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const showBadge = item.path === '/store' && cartCount > 0;
                      
                      return (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors relative ${
                              isActive 
                                ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                                : 'text-foreground hover:bg-muted/50'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {item.label}
                            {showBadge && (
                              <Badge 
                                variant="destructive" 
                                className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px]"
                              >
                                {cartCount}
                              </Badge>
                            )}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </div>
                  
                  <div className="p-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};
