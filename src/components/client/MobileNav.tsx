import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Store, ClipboardCheck, ShoppingBag, LogOut, Menu, MoreHorizontal, Trophy, Users, MessageSquare, Image } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';
import { BottomNav } from './BottomNav';

export const MobileNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { cartCount } = useCart();
  const [open, setOpen] = useState(false);

  // Secondary nav items (not in bottom nav)
  const moreItems = [
    { path: '/job-tracking', label: 'Job Tracking', icon: ClipboardCheck },
    { path: '/store', label: 'Store', icon: Store },
    { path: '/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/rewards', label: 'Rewards', icon: Trophy },
    { path: '/referrals', label: 'Refer Friends', icon: Users },
    { path: '/gallery', label: 'Gallery', icon: Image },
    { path: '/reviews', label: 'Reviews', icon: MessageSquare },
  ];

  return (
    <>
      {/* Mobile Top Header - Clean & Minimal */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/30 sticky top-0 z-50 md:hidden">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/dashboard" className="text-sm font-semibold text-foreground tracking-tight">
              RACE TECHNIK
            </Link>
            
            <div className="flex items-center gap-1">
              {/* Store with cart badge */}
              <Link to="/store" className="relative">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                  <Store className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] rounded-full"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              
              <ThemeToggle />
              <NotificationBell />
              
              {/* More menu for secondary items */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0 bg-card/95 backdrop-blur-xl border-border/30">
                  <div className="flex flex-col h-full">
                    <div className="p-5 border-b border-border/30">
                      <div className="text-sm font-semibold text-foreground">More</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-3">
                      {moreItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const showBadge = item.path === '/store' && cartCount > 0;
                        
                        return (
                          <SheetClose asChild key={item.path}>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-all relative ${
                                isActive 
                                  ? 'bg-muted/80 text-foreground font-medium' 
                                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                            >
                              <Icon className="w-5 h-5" strokeWidth={1.5} />
                              {item.label}
                              {showBadge && (
                                <Badge 
                                  variant="destructive" 
                                  className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] rounded-full"
                                >
                                  {cartCount}
                                </Badge>
                              )}
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 border-t border-border/30">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 h-11 rounded-xl"
                        onClick={() => {
                          setOpen(false);
                          signOut();
                        }}
                      >
                        <LogOut className="w-5 h-5" strokeWidth={1.5} />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </>
  );
};
