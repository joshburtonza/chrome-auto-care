import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Car, Calendar, CreditCard, Sparkles, Trash2, FileText } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";
import { motion } from "framer-motion";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { BookingsSkeleton } from "@/components/skeletons/PageSkeletons";
import { Button } from "@/components/ui/button";
import { generateBookingInvoice } from "@/lib/generateInvoice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const Bookings = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Enable swipe navigation on mobile
  useSwipeNavigation();
  
  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await loadBookings();
    toast.success('Bookings refreshed');
  }, []);

  useEffect(() => {
    if (user) {
      loadBookings();
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadBookings = async () => {
    try {
      // Fetch bookings with primary service and vehicle
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services (title),
          vehicles (year, make, model)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch all booking services for these bookings
      if (bookingsData && bookingsData.length > 0) {
        const bookingIds = bookingsData.map(b => b.id);
        const { data: bookingServices, error: servicesError } = await supabase
          .from('booking_services')
          .select(`
            booking_id,
            price,
            services (id, title)
          `)
          .in('booking_id', bookingIds);

        if (servicesError) throw servicesError;

        // Merge booking services into bookings
        const bookingsWithServices = bookingsData.map(booking => {
          const bookingServicesList = bookingServices?.filter(bs => bs.booking_id === booking.id) || [];
          const totalPrice = bookingServicesList.length > 0 
            ? bookingServicesList.reduce((sum, s) => sum + (s.price || 0), 0)
            : booking.payment_amount || 0;
          return {
            ...booking,
            all_services: bookingServicesList.length > 0 
              ? bookingServicesList.map(s => s.services?.title).filter(Boolean)
              : [booking.services?.title].filter(Boolean),
            services_with_prices: bookingServicesList.length > 0
              ? bookingServicesList.map(s => ({ title: s.services?.title || '', price: s.price || 0 }))
              : [{ title: booking.services?.title || '', price: booking.payment_amount || 0 }],
            total_price: totalPrice,
          };
        });

        setBookings(bookingsWithServices);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      toast.success('Booking deleted successfully');
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
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

  const handleDownloadInvoice = (booking: any) => {
    generateBookingInvoice(booking, profile || {}, booking.services_with_prices || []);
    toast.success('Invoice downloaded');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <BookingsSkeleton />
      </div>
    );
  }

  const content = (
    <div className="relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8 max-w-5xl relative">
        <motion.div 
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              My Bookings
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
            Track all your service appointments
          </p>
        </motion.div>

        {bookings.length === 0 ? (
          <motion.div {...fadeInUp}>
            <ChromeSurface className="p-8 sm:p-12 text-center bg-card/60 backdrop-blur-sm border-border/40">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground text-sm">Book your first service to get started</p>
            </ChromeSurface>
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <ChromeSurface className="p-4 sm:p-5 bg-card/50 backdrop-blur-sm border-border/40 hover:bg-card/60 transition-colors">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusBadge status={getStatusBadge(booking.status)}>
                          {booking.status.replace('_', ' ')}
                        </StatusBadge>
                        {booking.payment_status && (
                          <StatusBadge status={getPaymentStatusBadge(booking.payment_status)}>
                            <CreditCard className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                            {booking.payment_status}
                          </StatusBadge>
                        )}
                        {booking.status === 'cancelled' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this cancelled booking? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteBooking(booking.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleDownloadInvoice(booking)}
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Invoice
                        </Button>
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1.5">
                        {booking.all_services?.length > 1 
                          ? booking.all_services.join(' + ')
                          : booking.all_services?.[0] || booking.services?.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        {booking.vehicles && (
                          <span className="flex items-center gap-2">
                            <Car className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                            <span className="truncate">
                              {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                          {new Date(booking.booking_date).toLocaleDateString()} {booking.booking_time}
                        </span>
                        {(booking.total_price > 0 || booking.payment_amount) && (
                          <span className="flex items-center gap-2 text-primary font-medium">
                            <CreditCard className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                            R{(booking.total_price || booking.payment_amount || 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </ChromeSurface>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </div>
  );
};

export default Bookings;
