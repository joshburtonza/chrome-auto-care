import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Store, ShoppingBag, LogOut, MoreHorizontal } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StaffBottomNav } from './StaffBottomNav';

export const MobileStaffNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Secondary nav items (not in bottom nav)
  const moreItems = [
    { path: '/staff/services', label: 'Services', icon: Package },
    { path: '/staff/merchandise', label: 'Merchandise', icon: Store },
    { path: '/staff/orders', label: 'Orders', icon: ShoppingBag },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border sticky top-0 z-50 md:hidden">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link 
              to="/staff/dashboard" 
              className="text-sm font-semibold text-foreground tracking-tight"
            >
              STAFF PORTAL
            </Link>
            
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
              
              {/* More menu for secondary items */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[280px] p-0 bg-card border-l border-border"
                >
                  <div className="flex flex-col h-full">
                    <div className="p-5 border-b border-border">
                      <div className="text-sm font-semibold text-primary">More</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto py-3">
                      {moreItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        
                        return (
                          <SheetClose asChild key={item.path}>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-all ${
                                isActive 
                                  ? 'bg-muted text-foreground font-medium' 
                                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                            >
                              <Icon className="w-5 h-5" strokeWidth={1.5} />
                              {item.label}
                              {isActive && (
                                <span className="ml-auto w-1 h-1 rounded-full bg-primary" />
                              )}
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 border-t border-border">
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
      <StaffBottomNav />
    </>
  );
};
