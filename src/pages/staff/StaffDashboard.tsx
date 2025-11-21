import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, DollarSign, Clock } from 'lucide-react';

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
  }, []);

  const fetchDashboardData = async () => {
    // Fetch booking stats
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, services(title), profiles(full_name)');

    if (bookings) {
      setStats({
        totalBookings: bookings.length,
        pendingBookings: bookings.filter((b) => b.status === 'pending').length,
        activeBookings: bookings.filter((b) => b.status === 'in_progress').length,
        completedBookings: bookings.filter((b) => b.status === 'completed').length,
        totalCustomers: new Set(bookings.map((b) => b.user_id)).size,
      });
      setRecentBookings(bookings.slice(0, 10));
    }
  };

  const statCards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'primary' },
    { label: 'Pending', value: stats.pendingBookings, icon: Clock, color: 'warning' },
    { label: 'In Progress', value: stats.activeBookings, icon: Clock, color: 'info' },
    { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'success' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="chrome-heading text-4xl">STAFF DASHBOARD</h1>
          </div>
          <p className="text-text-secondary">Manage bookings, customers, and services</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <ChromeSurface key={stat.label} className="p-6" glow>
                <div className="flex items-center justify-between mb-4">
                  <div className="chrome-label text-sm">{stat.label}</div>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="chrome-heading text-3xl">{stat.value}</div>
              </ChromeSurface>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <ChromeSurface className="p-6" glow>
          <h2 className="chrome-heading text-2xl mb-6">RECENT BOOKINGS</h2>
          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary chrome-label">NO BOOKINGS YET</div>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-warning transition-colors chrome-sheen"
                >
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
                  <StatusBadge status={booking.status} />
                </div>
              ))
            )}
          </div>
        </ChromeSurface>
      </div>
    </div>
  );
}
