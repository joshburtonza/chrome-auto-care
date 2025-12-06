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
        return 'bg-[hsl(35,40%,45%)]/15 border-[hsl(35,40%,45%)]/25 text-[hsl(35,50%,65%)]';
      case 'confirmed':
      case 'in_progress':
        return 'bg-[hsl(200,40%,45%)]/15 border-[hsl(200,40%,45%)]/25 text-[hsl(200,50%,65%)]';
      case 'completed':
        return 'bg-[hsl(160,35%,40%)]/15 border-[hsl(160,35%,40%)]/25 text-[hsl(160,45%,60%)]';
      case 'cancelled':
        return 'bg-[hsl(0,40%,45%)]/15 border-[hsl(0,40%,45%)]/25 text-[hsl(0,50%,65%)]';
      default:
        return 'bg-white/5 border-white/10 text-[hsl(215,12%,60%)]';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-[hsl(215,22%,6%)] staff-theme">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-[hsl(35,50%,20%)] opacity-[0.03] blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[hsl(200,40%,15%)] opacity-[0.02] blur-[100px]" />
      </div>
      
      <StaffNav />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl relative z-10">
        {/* Page Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(35,60%,50%)] to-[hsl(25,55%,35%)] shadow-lg shadow-[hsl(35,60%,30%)]/20">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[hsl(218,15%,95%)]">
              Dashboard
            </h1>
          </div>
          <p className="text-sm text-[hsl(215,12%,50%)] ml-[52px]">
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(215,18%,11%)] to-[hsl(215,20%,8%)] border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/20">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(35,50%,50%)]/[0.03] to-transparent pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[hsl(35,60%,55%)]" strokeWidth={1.5} />
                <h2 className="text-sm font-medium text-[hsl(218,15%,85%)]">Overview</h2>
              </div>
              <Link 
                to="/staff/bookings"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-[hsl(35,60%,60%)] hover:text-[hsl(47,90%,75%)] transition-all"
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
                { label: 'Pending', value: stats.pendingBookings, color: 'hsl(35,60%,55%)', link: true },
                { label: 'In Progress', value: stats.activeBookings, color: 'hsl(200,50%,55%)', link: true },
                { label: 'Completed', value: stats.completedBookings, color: 'hsl(160,45%,50%)', link: false },
                { label: 'Customers', value: stats.totalCustomers, color: 'hsl(280,40%,55%)', link: false },
              ].map((stat, i) => (
                <motion.div key={stat.label} variants={fadeInUp}>
                  {stat.link ? (
                    <Link to="/staff/bookings" className="group block">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span className="text-xs font-medium text-[hsl(215,12%,50%)] uppercase tracking-wider">
                            {stat.label}
                          </span>
                        </div>
                        <div className="text-[32px] sm:text-[40px] font-bold text-[hsl(218,15%,95%)] leading-none tracking-tight group-hover:text-[hsl(35,60%,60%)] transition-colors">
                          {stat.value}
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-xs font-medium text-[hsl(215,12%,50%)] uppercase tracking-wider">
                          {stat.label}
                        </span>
                      </div>
                      <div className="text-[32px] sm:text-[40px] font-bold text-[hsl(218,15%,95%)] leading-none tracking-tight">
                        {stat.value}
                      </div>
                    </div>
                  )}
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
            { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, iconColor: 'hsl(215,30%,60%)' },
            { label: 'Pending', value: stats.pendingBookings, icon: Clock, iconColor: 'hsl(35,55%,55%)' },
            { label: 'Active', value: stats.activeBookings, icon: Activity, iconColor: 'hsl(200,50%,55%)' },
            { label: 'Customers', value: stats.totalCustomers, icon: Users, iconColor: 'hsl(160,45%,50%)' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-xl bg-[hsl(215,18%,10%)] border border-white/[0.06] p-4 sm:p-5 shadow-lg shadow-black/10 hover:border-white/[0.1] transition-all hover:shadow-xl hover:shadow-black/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between mb-4">
                <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.08em] text-[hsl(215,12%,50%)]">
                  {stat.label}
                </span>
                <div className="p-1.5 rounded-lg bg-white/[0.05]">
                  <stat.icon className="w-3.5 h-3.5" style={{ color: stat.iconColor }} strokeWidth={1.5} />
                </div>
              </div>
              <div className="relative text-2xl sm:text-3xl font-bold text-[hsl(218,15%,95%)] tracking-tight">
                {stat.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-[hsl(215,18%,10%)] border border-white/[0.06] shadow-2xl shadow-black/20 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[hsl(215,20%,50%)]" strokeWidth={1.5} />
              <h2 className="text-sm font-medium text-[hsl(218,15%,90%)]">Recent Bookings</h2>
            </div>
            <Link 
              to="/staff/bookings"
              className="group flex items-center gap-1.5 text-xs font-medium text-[hsl(35,60%,55%)] hover:text-[hsl(47,90%,75%)] transition-colors"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          <div className="divide-y divide-white/[0.04]">
            {recentBookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-[hsl(215,12%,40%)]" strokeWidth={1} />
                </div>
                <p className="text-sm text-[hsl(215,12%,45%)]">No bookings yet</p>
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
                    <div className="group flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-all">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Avatar placeholder */}
                        <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(215,20%,18%)] to-[hsl(215,18%,14%)] items-center justify-center border border-white/[0.06] flex-shrink-0">
                          <span className="text-sm font-semibold text-[hsl(215,15%,60%)]">
                            {(booking.profiles?.full_name || 'C')[0].toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[hsl(218,15%,92%)] truncate mb-0.5 group-hover:text-[hsl(35,60%,65%)] transition-colors">
                            {booking.profiles?.full_name || 'Customer'}
                          </div>
                          <div className="text-xs text-[hsl(215,12%,50%)] truncate">
                            {booking.services?.title}
                          </div>
                          <div className="text-[11px] text-[hsl(215,12%,40%)] mt-1">
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
                        <ChevronRight className="w-4 h-4 text-[hsl(215,12%,35%)] transition-transform group-hover:translate-x-1 group-hover:text-[hsl(35,50%,50%)]" />
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