import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Clock, AlertCircle, Activity, CheckCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-[hsl(215,22%,6%)] staff-theme staff-theme-ambient">
      <StaffNav />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl relative z-10">
        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.01em] text-[hsl(218,15%,93%)] mb-1">
            Staff Dashboard
          </h1>
          <p className="text-sm text-[hsl(215,12%,55%)]">
            Overview of bookings and customer activity
          </p>
        </div>

        {/* Overview Card - Primary KPIs grouped */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-[hsl(215,18%,10%)] rounded-2xl border border-white/[0.06] p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[hsl(218,15%,93%)]">Overview</h2>
              <Link 
                to="/staff/bookings"
                className="text-xs font-medium text-[hsl(35,65%,50%)] hover:text-[hsl(47,90%,75%)] transition-colors flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <Link to="/staff/bookings" className="group">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                    Pending
                  </div>
                  <div className="text-[28px] sm:text-[32px] font-bold text-[hsl(218,15%,93%)] leading-none group-hover:text-[hsl(35,65%,50%)] transition-colors">
                    {stats.pendingBookings}
                  </div>
                </div>
              </Link>
              <Link to="/staff/bookings" className="group">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                    In Progress
                  </div>
                  <div className="text-[28px] sm:text-[32px] font-bold text-[hsl(218,15%,93%)] leading-none group-hover:text-[hsl(35,65%,50%)] transition-colors">
                    {stats.activeBookings}
                  </div>
                </div>
              </Link>
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                  Completed
                </div>
                <div className="text-[28px] sm:text-[32px] font-bold text-[hsl(218,15%,93%)] leading-none">
                  {stats.completedBookings}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                  Customers
                </div>
                <div className="text-[28px] sm:text-[32px] font-bold text-[hsl(218,15%,93%)] leading-none">
                  {stats.totalCustomers}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-[hsl(215,18%,10%)] rounded-xl border border-white/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                Total Bookings
              </span>
              <Calendar className="w-4 h-4 text-[hsl(215,12%,45%)]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-[28px] font-bold text-[hsl(218,15%,93%)]">
              {stats.totalBookings}
            </div>
          </div>
          <div className="bg-[hsl(215,18%,10%)] rounded-xl border border-white/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                Pending
              </span>
              <Clock className="w-4 h-4 text-[hsl(35,50%,55%)]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-[28px] font-bold text-[hsl(218,15%,93%)]">
              {stats.pendingBookings}
            </div>
          </div>
          <div className="bg-[hsl(215,18%,10%)] rounded-xl border border-white/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                In Progress
              </span>
              <Activity className="w-4 h-4 text-[hsl(200,50%,55%)]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-[28px] font-bold text-[hsl(218,15%,93%)]">
              {stats.activeBookings}
            </div>
          </div>
          <div className="bg-[hsl(215,18%,10%)] rounded-xl border border-white/[0.06] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[hsl(215,12%,55%)]">
                Total Customers
              </span>
              <Users className="w-4 h-4 text-[hsl(160,40%,50%)]" strokeWidth={1.5} />
            </div>
            <div className="text-2xl sm:text-[28px] font-bold text-[hsl(218,15%,93%)]">
              {stats.totalCustomers}
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-[hsl(215,18%,10%)] rounded-2xl border border-white/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.15)] overflow-hidden">
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-[hsl(218,15%,93%)]">Recent Bookings</h2>
            <Link 
              to="/staff/bookings"
              className="text-xs font-medium text-[hsl(35,65%,50%)] hover:text-[hsl(47,90%,75%)] transition-colors flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="divide-y divide-white/[0.06]">
            {recentBookings.length === 0 ? (
              <div className="text-center py-12 text-[hsl(215,12%,50%)]">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" strokeWidth={1} />
                <p className="text-sm">No bookings yet</p>
              </div>
            ) : (
              recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to="/staff/bookings"
                  state={{ selectedBookingId: booking.id }}
                  className="block"
                >
                  <div className="flex items-center justify-between px-5 sm:px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-medium text-sm text-[hsl(218,15%,93%)] truncate mb-0.5">
                        {booking.profiles?.full_name || 'Customer'}
                      </div>
                      <div className="text-xs text-[hsl(215,12%,55%)] truncate">
                        {booking.services?.title}
                      </div>
                      <div className="text-[11px] text-[hsl(215,12%,45%)] mt-1">
                        {new Date(booking.booking_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })} • {booking.booking_time}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2.5 py-1 text-[11px] font-medium rounded-full border",
                        getStatusStyle(booking.status)
                      )}>
                        {formatStatus(booking.status)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[hsl(215,12%,40%)]" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}