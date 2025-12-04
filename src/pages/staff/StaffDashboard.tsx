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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="chrome-heading text-4xl mb-2">STAFF DASHBOARD</h1>
          <p className="text-muted-foreground">Overview of bookings and customer activity</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link to="/staff/bookings">
            <ChromeSurface className="p-6 hover:border-primary transition-colors cursor-pointer chrome-sheen" glow>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.pendingBookings}</div>
                  <div className="text-sm text-muted-foreground">Pending Bookings</div>
                </div>
              </div>
            </ChromeSurface>
          </Link>

          <Link to="/staff/bookings">
            <ChromeSurface className="p-6 hover:border-primary transition-colors cursor-pointer chrome-sheen" glow>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{stats.activeBookings}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
            </ChromeSurface>
          </Link>

          <ChromeSurface className="p-6 chrome-sheen" glow>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.completedBookings}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </ChromeSurface>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <ChromeSurface key={stat.label} className="p-6 chrome-sheen" glow>
                <div className="flex items-center justify-between mb-4">
                  <div className="chrome-label text-sm">{stat.label}</div>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="chrome-heading text-3xl">{stat.value}</div>
              </ChromeSurface>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <ChromeSurface className="p-6" glow>
          <div className="flex items-center justify-between mb-6">
            <h2 className="chrome-heading text-2xl">RECENT BOOKINGS</h2>
            <Link to="/staff/bookings">
              <ChromeButton variant="outline" size="sm">View All</ChromeButton>
            </Link>
          </div>
          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary chrome-label">NO BOOKINGS YET</div>
            ) : (
              recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to="/staff/bookings"
                  state={{ selectedBookingId: booking.id }}
                >
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary transition-colors chrome-sheen cursor-pointer">
                    <div className="flex-1">
                      <div className="font-semibold mb-1 text-foreground">
                        {booking.profiles?.full_name || 'Customer'}
                      </div>
                      <div className="text-sm text-text-secondary">
                        {booking.services?.title}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={booking.status} />
                      <AlertCircle className="w-5 h-5 text-primary" />
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
