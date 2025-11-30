import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Car, Calendar, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (title),
          vehicles (year, make, model)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'available' | 'limited' | 'full' | 'unavailable'> = {
      pending: 'limited',
      confirmed: 'available',
      in_progress: 'limited',
      completed: 'available',
      cancelled: 'unavailable',
    };
    return statusMap[status] || 'unavailable';
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusMap: Record<string, 'available' | 'limited' | 'full' | 'unavailable'> = {
      paid: 'available',
      pending: 'limited',
      failed: 'unavailable',
      refunded: 'full',
    };
    return statusMap[paymentStatus] || 'limited';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="chrome-label text-primary">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">MY BOOKINGS</h1>
          <p className="text-text-secondary">Track all your service appointments</p>
        </div>

        {bookings.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Calendar className="w-16 h-16 text-primary/30 mx-auto mb-4" strokeWidth={1.4} />
            <h3 className="chrome-label text-foreground mb-2">NO BOOKINGS YET</h3>
            <p className="text-text-secondary">Book your first service to get started</p>
          </ChromeSurface>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <ChromeSurface key={booking.id} className="p-6" glow>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <StatusBadge status={getStatusBadge(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </StatusBadge>
                      {booking.payment_status && (
                        <StatusBadge status={getPaymentStatusBadge(booking.payment_status)}>
                          <CreditCard className="w-3 h-3 inline mr-1" strokeWidth={1.4} />
                          {booking.payment_status}
                        </StatusBadge>
                      )}
                    </div>
                    <h3 className="text-xl font-light text-foreground mb-1">{booking.services?.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      {booking.vehicles && (
                        <span className="flex items-center gap-2">
                          <Car className="w-4 h-4" strokeWidth={1.4} />
                          {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" strokeWidth={1.4} />
                        {new Date(booking.booking_date).toLocaleDateString()} {booking.booking_time}
                      </span>
                      {booking.payment_amount && (
                        <span className="flex items-center gap-2 text-primary">
                          <CreditCard className="w-4 h-4" strokeWidth={1.4} />
                          R{booking.payment_amount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
