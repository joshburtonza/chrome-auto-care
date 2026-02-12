import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Clock, Activity, ChevronRight, Sparkles, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalCustomers: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('staff-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Bookings changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to booking stages changes
    const stagesChannel = supabase
      .channel('staff-stages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_stages'
        },
        () => {
          console.log('Booking stages changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to profiles changes (new customers)
    const profilesChannel = supabase
      .channel('staff-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profiles changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to vehicles changes
    const vehiclesChannel = supabase
      .channel('staff-vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => {
          console.log('Vehicles changed, refreshing dashboard...');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(stagesChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(vehiclesChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch bookings with services
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, services(title)')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      if (!bookings) return;

      // Fetch profiles separately
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Create profiles map
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Merge profiles with bookings
      const bookingsWithProfiles = bookings.map(booking => ({
        ...booking,
        profiles: profilesMap.get(booking.user_id)
      }));

      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter((b) => b.status === 'pending').length,
        activeBookings: bookings.filter((b) => b.status === 'in_progress').length,
        completedBookings: bookings.filter((b) => b.status === 'completed').length,
        totalCustomers: userIds.length,
      });
      
      setRecentBookings(bookingsWithProfiles.slice(0, 10));
    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/15 border-warning/25 text-warning';
      case 'confirmed':
      case 'in_progress':
        return 'bg-blue-500/15 border-blue-500/25 text-blue-500';
      case 'completed':
        return 'bg-success/15 border-success/25 text-success';
      case 'cancelled':
        return 'bg-destructive/15 border-destructive/25 text-destructive';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-background staff-theme">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-primary opacity-[0.03] blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-accent opacity-[0.02] blur-[100px]" />
      </div>
      
      <StaffNav />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl relative z-10 pb-24 md:pb-8">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent-dark shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Real-time overview of your workspace
          </p>
        </motion.div>

        {/* Overview Card - Primary KPIs grouped */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl shadow-foreground/5">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-foreground">Overview</h2>
              </div>
              <Link 
                to="/staff/bookings"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 border border-border text-xs font-medium text-primary hover:text-accent-soft transition-all"
              >
                View all
                <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
            
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="relative grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8"
            >
              {[
                { label: 'Pending', value: stats.pendingBookings, colorClass: 'bg-warning', link: '/staff/bookings', state: { statusFilter: 'pending' } },
                { label: 'In Progress', value: stats.activeBookings, colorClass: 'bg-blue-500', link: '/staff/bookings', state: { statusFilter: 'in_progress' } },
                { label: 'Completed', value: stats.completedBookings, colorClass: 'bg-success', link: '/staff/bookings', state: { statusFilter: 'completed' } },
                { label: 'Customers', value: stats.totalCustomers, colorClass: 'bg-purple-500', link: '/staff/customers', state: undefined },
              ].map((stat) => (
                <motion.div key={stat.label} variants={fadeInUp}>
                  <Link to={stat.link} state={stat.state} className="group block">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-1.5 h-1.5 rounded-full", stat.colorClass)} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-[32px] sm:text-[40px] font-bold text-foreground leading-none tracking-tight group-hover:text-primary transition-colors">
                        {stat.value}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Secondary Stats */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {[
            { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, iconClass: 'text-muted-foreground', link: '/staff/bookings', state: undefined },
            { label: 'Pending', value: stats.pendingBookings, icon: Clock, iconClass: 'text-warning', link: '/staff/bookings', state: { statusFilter: 'pending' } },
            { label: 'Active', value: stats.activeBookings, icon: Activity, iconClass: 'text-blue-500', link: '/staff/bookings', state: { statusFilter: 'in_progress' } },
            { label: 'Customers', value: stats.totalCustomers, icon: Users, iconClass: 'text-success', link: '/staff/customers', state: undefined },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
            >
              <Link to={stat.link} state={stat.state} className="group block relative overflow-hidden rounded-xl bg-card border border-border p-4 sm:p-5 shadow-lg shadow-foreground/5 hover:border-primary/20 transition-all hover:shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {stat.label}
                  </span>
                  <div className="p-1.5 rounded-lg bg-muted">
                    <stat.icon className={cn("w-3.5 h-3.5", stat.iconClass)} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="relative text-2xl sm:text-3xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {stat.value}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-card border border-border shadow-2xl shadow-foreground/5 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-gradient-to-r from-muted/50 to-transparent">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <h2 className="text-sm font-medium text-foreground">Recent Bookings</h2>
            </div>
            <Link 
              to="/staff/bookings"
              className="group flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent-soft transition-colors"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          <div className="divide-y divide-border">
            {recentBookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-muted-foreground" strokeWidth={1} />
                </div>
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              </div>
            ) : (
              recentBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link
                    to="/staff/bookings"
                    state={{ selectedBookingId: booking.id }}
                    className="block"
                  >
                    <div className="group flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-muted/50 transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar placeholder */}
                        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-muted items-center justify-center border border-border flex-shrink-0">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {(booking.profiles?.full_name || 'C')[0].toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate mb-0.5 group-hover:text-primary transition-colors">
                            {booking.profiles?.full_name || 'Customer'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {booking.services?.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground/70 mt-1">
                            {new Date(booking.booking_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })} • {booking.booking_time}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-4">
                        <span className={cn(
                          "px-3 py-1.5 text-[10px] sm:text-[11px] font-medium rounded-lg border backdrop-blur-sm",
                          getStatusStyle(booking.status)
                        )}>
                          {formatStatus(booking.status)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}