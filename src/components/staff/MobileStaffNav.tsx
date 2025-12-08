import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Calendar, Users, LogOut, Package, Store, ShoppingBag, ListTodo, Menu, UsersRound } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const MobileStaffNav = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

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
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[hsl(215,20%,8%)]/95 backdrop-blur-md md:hidden">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <Link 
            to="/staff/dashboard" 
            className="text-[11px] font-medium uppercase tracking-[0.15em] text-[hsl(215,12%,60%)]"
          >
            Staff Portal
          </Link>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="p-2 text-[hsl(215,12%,60%)] hover:text-[hsl(218,15%,93%)] hover:bg-white/[0.03] rounded-md transition-colors">
                  <Menu className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[280px] p-0 bg-[hsl(215,20%,8%)] border-l border-white/[0.06]"
              >
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-[hsl(35,65%,50%)]">
                      Staff Menu
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-3">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
                              isActive 
                                ? "text-[hsl(218,15%,93%)] bg-white/[0.04]" 
                                : "text-[hsl(215,12%,55%)] hover:text-[hsl(218,15%,80%)] hover:bg-white/[0.02]"
                            )}
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
                    <button 
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[hsl(0,55%,60%)] hover:text-[hsl(0,55%,70%)] hover:bg-white/[0.02] rounded-md transition-colors"
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut className="w-5 h-5" strokeWidth={1.5} />
                      Logout
                    </button>
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