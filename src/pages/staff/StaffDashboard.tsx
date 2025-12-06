import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Clock, AlertCircle, Activity, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  const statCards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'primary' },
    { label: 'Pending', value: stats.pendingBookings, icon: Clock, color: 'warning' },
    { label: 'In Progress', value: stats.activeBookings, icon: Clock, color: 'info' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'success' },
  ];

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="chrome-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-1 sm:mb-2">STAFF DASHBOARD</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Overview of bookings and customer activity</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <Link to="/staff/bookings">
            <ChromeSurface className="p-4 sm:p-5 md:p-6 hover:border-primary transition-colors cursor-pointer chrome-sheen" glow>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.pendingBookings}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Pending Bookings</div>
                </div>
              </div>
            </ChromeSurface>
          </Link>

          <Link to="/staff/bookings">
            <ChromeSurface className="p-4 sm:p-5 md:p-6 hover:border-primary transition-colors cursor-pointer chrome-sheen" glow>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.activeBookings}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
            </ChromeSurface>
          </Link>

          <ChromeSurface className="p-4 sm:p-5 md:p-6 chrome-sheen sm:col-span-2 md:col-span-1" glow>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-success/10 rounded-lg shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.completedBookings}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </ChromeSurface>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8 animate-fade-in">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <ChromeSurface key={stat.label} className="p-3 sm:p-4 md:p-6 chrome-sheen" glow>
                <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                  <div className="chrome-label text-xs sm:text-sm truncate pr-2">{stat.label}</div>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                </div>
                <div className="chrome-heading text-xl sm:text-2xl md:text-3xl">{stat.value}</div>
              </ChromeSurface>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <ChromeSurface className="p-3 sm:p-4 md:p-6" glow>
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6 gap-2">
            <h2 className="chrome-heading text-lg sm:text-xl md:text-2xl">RECENT BOOKINGS</h2>
            <Link to="/staff/bookings">
              <ChromeButton variant="outline" size="sm" className="text-xs sm:text-sm">View All</ChromeButton>
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3 md:space-y-4">
            {recentBookings.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-text-tertiary chrome-label text-xs sm:text-sm">NO BOOKINGS YET</div>
            ) : (
              recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to="/staff/bookings"
                  state={{ selectedBookingId: booking.id }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:border-primary transition-colors chrome-sheen cursor-pointer gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base mb-1 text-foreground truncate">
                        {booking.profiles?.full_name || 'Customer'}
                      </div>
                      <div className="text-xs sm:text-sm text-text-secondary truncate">
                        {booking.services?.title}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-center">
                      <StatusBadge status={booking.status} />
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary hidden sm:block" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </ChromeSurface>
      </div>
    </div>
  );
}
