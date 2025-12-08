import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Calendar, Car, Package, User, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enable swipe navigation on mobile
  useSwipeNavigation();
  
  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await loadDashboardData();
    toast.success('Data refreshed');
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();

      // Subscribe to realtime updates for bookings and stages
      const bookingsChannel = supabase
        .channel('client-bookings-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      const stagesChannel = supabase
        .channel('client-stages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'booking_stages'
          },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bookingsChannel);
        supabase.removeChannel(stagesChannel);
      };
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all bookings for selection
      const { data: allData, error: allError } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (allError) throw allError;
      setAllBookings(allData || []);

      // Fetch current/active booking
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .in('status', ['in_progress', 'confirmed'])
        .lte('booking_date', today)
        .order('booking_date', { ascending: false })
        .limit(1);

      if (bookingsError) throw bookingsError;
      
      if (bookingsData && bookingsData.length > 0) {
        setCurrentBooking(bookingsData[0]);
        
        // Fetch stages for current booking
        const { data: stagesData, error: stagesError } = await supabase
          .from('booking_stages')
          .select('*')
          .eq('booking_id', bookingsData[0].id)
          .order('stage_order', { ascending: true });
          
        if (stagesError) throw stagesError;
        setStages(stagesData || []);
      } else {
        setCurrentBooking(null);
        setStages([]);
      }

      // Fetch upcoming bookings
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .gt('booking_date', today)
        .order('booking_date', { ascending: true })
        .limit(2);

      if (upcomingError) throw upcomingError;
      setUpcomingBookings(upcomingData || []);

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStagesForBooking = async (bookingId: string) => {
    const { data, error } = await supabase
      .from('booking_stages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('stage_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching stages:', error);
      return [];
    }
    return data || [];
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      vehicle_checkin: 'Check-In',
      stripping: 'Stripping',
      surface_prep: 'Surface Prep',
      paint_correction: 'Paint Correction',
      ppf_installation: 'PPF Installation',
      reassembly: 'Reassembly',
      qc1: 'QC #1',
      final_detail: 'Final Detail',
      qc2: 'QC #2',
      delivery_prep: 'Delivery Prep'
    };
    return labels[stage] || stage;
  };

  const calculateProgress = () => {
    if (stages.length === 0) return 0;
    const completed = stages.filter(s => s.completed).length;
    return Math.round((completed / stages.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-primary font-medium tracking-wider"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const progress = calculateProgress();

  const content = (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Track your services and manage your garage
          </p>
        </motion.div>

        {/* Booking Selector */}
        {allBookings.length > 1 && (
          <motion.div 
            className="mb-4 sm:mb-6"
            {...fadeInUp}
          >
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
              Select Booking
            </label>
            <Select
              value={currentBooking?.id || ''}
              onValueChange={async (value) => {
                const booking = allBookings.find(b => b.id === value);
                setCurrentBooking(booking || null);
                if (booking) {
                  const stagesData = await fetchStagesForBooking(booking.id);
                  setStages(stagesData);
                }
              }}
            >
            <SelectTrigger className="w-full bg-card border-border/50 rounded-xl">
                <SelectValue placeholder="Select a booking" />
              </SelectTrigger>
              <SelectContent>
                {allBookings.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.services?.title} - {booking.vehicles?.year} {booking.vehicles?.make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* Current Booking Card */}
        {currentBooking ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ChromeSurface className="p-5 sm:p-6 mb-6" glow>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Current Booking
                  </div>
                  <h2 className="text-lg sm:text-xl font-medium text-foreground mb-1">
                    {currentBooking.services?.title}
                  </h2>
                  <p className="text-muted-foreground text-sm flex items-center gap-2">
                    <Car className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                    <span className="truncate">
                      {currentBooking.vehicles?.year} {currentBooking.vehicles?.make} {currentBooking.vehicles?.model}
                    </span>
                  </p>
                </div>
                <StatusBadge status={currentBooking.status} className="self-start">
                  {currentBooking.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
                </StatusBadge>
              </div>

              {/* Progress Bar */}
              {stages.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Progress
                    </span>
                    <span className="text-sm font-semibold text-primary">{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Timeline */}
              {stages.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Service Timeline
                  </div>
                  <div className="grid grid-cols-5 gap-1 sm:gap-3">
                    {stages.slice(0, 5).map((stage, idx) => (
                      <div key={stage.id} className="relative">
                        <div className="flex flex-col items-center text-center">
                          <div
                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center mb-1 transition-all text-xs ${
                              stage.completed
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                                : stage.started_at
                                ? "border-primary/50 bg-primary/10 text-primary"
                                : "border-border/50 bg-muted/20 text-muted-foreground"
                            }`}
                          >
                            {stage.completed ? "✓" : idx + 1}
                          </div>
                          <div className={`text-[7px] sm:text-[9px] leading-tight font-medium ${
                            stage.completed || stage.started_at ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {getStageLabel(stage.stage)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {stages.length > 5 && (
                    <div className="grid grid-cols-5 gap-1 sm:gap-3 mt-2">
                      {stages.slice(5).map((stage, idx) => (
                        <div key={stage.id} className="relative">
                          <div className="flex flex-col items-center text-center">
                            <div
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center mb-1 transition-all text-xs ${
                                stage.completed
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                                  : stage.started_at
                                  ? "border-primary/50 bg-primary/10 text-primary"
                                  : "border-border/50 bg-muted/20 text-muted-foreground"
                              }`}
                            >
                              {stage.completed ? "✓" : idx + 6}
                            </div>
                            <div className={`text-[7px] sm:text-[9px] leading-tight font-medium ${
                              stage.completed || stage.started_at ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {getStageLabel(stage.stage)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
                <ChromeButton size="sm" className="flex-1 sm:flex-none" asChild>
                  <Link to="/job-tracking">
                    <Clock className="mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                    Track Progress
                    <ArrowRight className="ml-2 w-3.5 h-3.5" strokeWidth={1.5} />
                  </Link>
                </ChromeButton>
              </div>

              {/* ETA */}
              {currentBooking.estimated_completion && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                    <span>
                      Estimated: <span className="text-primary font-medium">
                        {new Date(currentBooking.estimated_completion).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </ChromeSurface>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ChromeSurface className="p-8 sm:p-10 mb-6 text-center" glow>
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Active Bookings</h3>
              <p className="text-muted-foreground text-sm mb-4">You don't have any active bookings at the moment.</p>
              <ChromeButton size="sm" asChild>
                <Link to="/services">
                  <Calendar className="mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                  Book a Service
                </Link>
              </ChromeButton>
            </ChromeSurface>
          </motion.div>
        )}

        {/* Quick Actions Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-3 sm:gap-4 mb-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {[
            { icon: Calendar, label: "Book Service", to: "/services" },
            { icon: Package, label: "My Bookings", to: "/bookings" },
            { icon: Car, label: "My Vehicles", to: "/garage" },
            { icon: User, label: "Profile", to: "/profile" },
          ].map((action, index) => (
            <motion.div
              key={action.label}
              variants={fadeInUp}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={action.to}>
                <ChromeSurface className="p-5 sm:p-6 hover:scale-[1.02] transition-transform cursor-pointer" sheen>
                  <action.icon className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
                  <div className="text-sm font-medium text-foreground">{action.label}</div>
                </ChromeSurface>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-sm font-medium text-foreground mb-3">
              Upcoming Bookings
            </h2>
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <ChromeSurface key={booking.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground mb-1">
                        {booking.services?.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
                        <span>{booking.vehicles?.year} {booking.vehicles?.make}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                  </div>
                </ChromeSurface>
              ))}
            </div>
          </motion.div>
        )}

        {/* Garage Snapshot */}
        {vehicles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground">
                My Garage
              </h2>
              <ChromeButton variant="ghost" size="sm" asChild>
                <Link to="/garage" className="text-xs text-muted-foreground hover:text-foreground">
                  View All
                  <ArrowRight className="ml-1 w-3 h-3" strokeWidth={1.5} />
                </Link>
              </ChromeButton>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {vehicles.map((vehicle) => (
                <ChromeSurface key={vehicle.id} className="p-4 sm:p-5">
                  <Car className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
                  <div className="text-sm font-medium text-foreground mb-0.5">
                    {vehicle.year} {vehicle.make}
                  </div>
                  <div className="text-xs text-muted-foreground">{vehicle.model}</div>
                </ChromeSurface>
              ))}
            </div>
          </motion.div>
        )}
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

export default Dashboard;
