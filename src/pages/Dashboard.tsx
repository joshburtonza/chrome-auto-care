import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Calendar, Car, Package, User, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="chrome-title text-2xl sm:text-4xl mb-1 sm:mb-2">CLIENT DASHBOARD</h1>
          <p className="text-text-secondary text-sm sm:text-base">Welcome back, track your services and manage your garage</p>
        </div>

        {/* Booking Selector */}
        {allBookings.length > 1 && (
          <div className="mb-4 sm:mb-6">
            <label className="chrome-label text-xs mb-2 block">SELECT BOOKING</label>
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
              <SelectTrigger className="w-full">
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
          </div>
        )}

        {/* Current Booking Card */}
        {currentBooking ? (
          <ChromeSurface className="p-4 sm:p-8 mb-4 sm:mb-8" glow>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <div className="chrome-label text-[10px] sm:text-xs mb-1 sm:mb-2 text-text-tertiary">CURRENT BOOKING</div>
                <h2 className="text-lg sm:text-2xl font-light text-foreground mb-1">{currentBooking.services?.title}</h2>
                <p className="text-text-secondary text-sm flex items-center gap-2">
                  <Car className="w-4 h-4 flex-shrink-0" strokeWidth={1.4} />
                  <span className="truncate">{currentBooking.vehicles?.year} {currentBooking.vehicles?.make} {currentBooking.vehicles?.model}</span>
                </p>
              </div>
              <StatusBadge status={currentBooking.status} className="self-start">
                {currentBooking.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
              </StatusBadge>
            </div>

            {/* Timeline */}
            {stages.length > 0 && (
              <div className="space-y-4 sm:space-y-6">
                <div className="chrome-label text-[10px] sm:text-xs mb-2 sm:mb-4">SERVICE TIMELINE</div>
                <div className="grid grid-cols-5 gap-1 sm:gap-4 overflow-x-auto">
                  {stages.slice(0, 5).map((stage, idx) => (
                    <div key={stage.id} className="relative">
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center mb-1 sm:mb-2 transition-all text-xs sm:text-sm ${
                            stage.completed
                              ? "border-success bg-success/20 text-success"
                              : stage.started_at
                              ? "border-primary bg-primary/20 text-primary chrome-glow"
                              : "border-border bg-muted/10 text-muted-foreground"
                          }`}
                        >
                          {stage.completed ? "✓" : idx + 1}
                        </div>
                        <div className={`chrome-label text-[7px] sm:text-[9px] leading-tight ${stage.completed || stage.started_at ? "text-foreground" : "text-text-tertiary"}`}>
                          {getStageLabel(stage.stage)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {stages.length > 5 && (
                  <div className="grid grid-cols-5 gap-1 sm:gap-4 mt-2">
                    {stages.slice(5).map((stage, idx) => (
                      <div key={stage.id} className="relative">
                        <div className="flex flex-col items-center text-center">
                          <div
                            className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center mb-1 sm:mb-2 transition-all text-xs sm:text-sm ${
                              stage.completed
                                ? "border-success bg-success/20 text-success"
                                : stage.started_at
                                ? "border-primary bg-primary/20 text-primary chrome-glow"
                                : "border-border bg-muted/10 text-muted-foreground"
                            }`}
                          >
                            {stage.completed ? "✓" : idx + 6}
                          </div>
                          <div className={`chrome-label text-[7px] sm:text-[9px] leading-tight ${stage.completed || stage.started_at ? "text-foreground" : "text-text-tertiary"}`}>
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
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-border/50">
              <ChromeButton size="sm" className="w-full sm:w-auto" asChild>
                <Link to="/job-tracking">
                  <Clock className="mr-2 w-3 h-3" strokeWidth={1.4} />
                  Track Progress
                </Link>
              </ChromeButton>
            </div>

            {/* ETA */}
            {currentBooking.estimated_completion && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 text-text-secondary text-xs sm:text-sm">
                  <Clock className="w-4 h-4 flex-shrink-0" strokeWidth={1.4} />
                  <span>Estimated: <span className="text-primary font-normal">
                    {new Date(currentBooking.estimated_completion).toLocaleDateString()}
                  </span></span>
                </div>
              </div>
            )}
          </ChromeSurface>
        ) : (
          <ChromeSurface className="p-6 sm:p-8 mb-4 sm:mb-8 text-center" glow>
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="chrome-heading text-lg sm:text-xl mb-2">NO ACTIVE BOOKINGS</h3>
            <p className="text-muted-foreground text-sm mb-4">You don't have any active bookings at the moment.</p>
            <ChromeButton size="sm" className="w-full sm:w-auto" asChild>
              <Link to="/services">
                <Calendar className="mr-2 w-3 h-3" strokeWidth={1.4} />
                Book a Service
              </Link>
            </ChromeButton>
          </ChromeSurface>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
          {[
            { icon: Calendar, label: "Book Service", to: "/services" },
            { icon: Package, label: "My Bookings", to: "/bookings" },
            { icon: Car, label: "My Vehicles", to: "/garage" },
            { icon: User, label: "Profile", to: "/profile" },
          ].map((action) => (
            <Link key={action.label} to={action.to}>
              <ChromeSurface className="p-4 sm:p-6 chrome-sheen hover:chrome-glow-strong transition-all duration-300 cursor-pointer" glow>
                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 sm:mb-3" strokeWidth={1.4} />
                <div className="chrome-label text-[10px] sm:text-xs text-foreground">{action.label}</div>
              </ChromeSurface>
            </Link>
          ))}
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-4 sm:mb-8">
            <h2 className="chrome-label text-xs sm:text-sm mb-3 sm:mb-4 text-foreground">UPCOMING BOOKINGS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {upcomingBookings.map((booking) => (
                <ChromeSurface key={booking.id} className="p-4 sm:p-6" glow>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-base font-light text-foreground mb-1 truncate">{booking.services?.title}</div>
                      <div className="text-xs sm:text-sm text-text-secondary flex items-center gap-2">
                        <Car className="w-3 h-3 flex-shrink-0" strokeWidth={1.4} />
                        <span className="truncate">{booking.vehicles?.year} {booking.vehicles?.make}</span>
                      </div>
                    </div>
                    <div className="chrome-label text-[9px] sm:text-[10px] text-text-tertiary whitespace-nowrap">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                  </div>
                </ChromeSurface>
              ))}
            </div>
          </div>
        )}

        {/* Garage Snapshot */}
        {vehicles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="chrome-label text-xs sm:text-sm text-foreground">MY GARAGE</h2>
              <ChromeButton variant="ghost" size="sm" asChild>
                <Link to="/garage" className="text-xs">View All</Link>
              </ChromeButton>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {vehicles.map((vehicle) => (
                <ChromeSurface key={vehicle.id} className="p-4 sm:p-6 chrome-sheen" glow>
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 sm:mb-3" strokeWidth={1.4} />
                  <div className="text-sm sm:text-base font-light text-foreground mb-1 truncate">
                    {vehicle.year} {vehicle.make}
                  </div>
                  <div className="chrome-label text-[9px] sm:text-[10px] text-text-secondary truncate">{vehicle.model}</div>
                </ChromeSurface>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
