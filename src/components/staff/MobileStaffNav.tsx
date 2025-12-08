import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Package, Store, ShoppingBag, LogOut, MoreHorizontal, UsersRound } from 'lucide-react';
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
      <header className="bg-[hsl(215,20%,8%)]/95 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-50 md:hidden">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            <Link 
              to="/staff/dashboard" 
              className="text-sm font-semibold text-[hsl(218,15%,93%)] tracking-tight"
            >
              STAFF PORTAL
            </Link>
            
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell />
              
              {/* More menu for secondary items */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[hsl(215,12%,60%)] hover:text-[hsl(218,15%,93%)] hover:bg-white/[0.03]">
                    <MoreHorizontal className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="right" 
                  className="w-[280px] p-0 bg-[hsl(215,20%,8%)] border-l border-white/[0.06]"
                >
                  <div className="flex flex-col h-full">
                    <div className="p-5 border-b border-white/[0.06]">
                      <div className="text-sm font-semibold text-[hsl(35,65%,50%)]">More</div>
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
                                  ? 'bg-white/[0.04] text-[hsl(218,15%,93%)] font-medium' 
                                  : 'text-[hsl(215,12%,55%)] hover:bg-white/[0.02] hover:text-[hsl(218,15%,80%)]'
                              }`}
                            >
                              <Icon className="w-5 h-5" strokeWidth={1.5} />
                              {item.label}
                              {isActive && (
                                <span className="ml-auto w-1 h-1 rounded-full bg-[hsl(35,65%,50%)]" />
                              )}
                            </Link>
                          </SheetClose>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 border-t border-white/[0.06]">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 text-[hsl(0,55%,60%)] hover:text-[hsl(0,55%,70%)] hover:bg-white/[0.02] h-11 rounded-xl"
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
