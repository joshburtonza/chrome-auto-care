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
    <div className="min-h-screen bg-slate-950">
      <StaffNav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-4xl font-bold text-slate-100 mb-2 tracking-tight">Staff Dashboard</h1>
          <p className="text-slate-400">Manage bookings, customers, and services</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                  <Icon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="text-3xl font-bold text-slate-100">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100">Recent Bookings</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No bookings yet</div>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-200 mb-1">
                        {booking.profiles?.full_name || 'Customer'}
                      </div>
                      <div className="text-sm text-slate-400">
                        {booking.services?.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                      </div>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
