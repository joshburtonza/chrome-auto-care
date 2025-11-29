import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { Calendar, Car, Package, User, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Fetch current booking (most recent in_progress or confirmed)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .in('status', ['in_progress', 'confirmed'])
        .order('created_at', { ascending: false })
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
      }

      // Fetch upcoming bookings
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
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
    } finally {
      setLoading(false);
    }
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">CLIENT DASHBOARD</h1>
          <p className="text-text-secondary">Welcome back, track your services and manage your garage</p>
        </div>

        {/* Current Booking Card */}
        {currentBooking ? (
          <ChromeSurface className="p-8 mb-8" glow>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="chrome-label mb-2 text-text-tertiary">CURRENT BOOKING</div>
                <h2 className="text-2xl font-light text-foreground mb-1">{currentBooking.services?.title}</h2>
                <p className="text-text-secondary flex items-center gap-2">
                  <Car className="w-4 h-4" strokeWidth={1.4} />
                  {currentBooking.vehicles?.year} {currentBooking.vehicles?.make} {currentBooking.vehicles?.model}
                </p>
              </div>
              <StatusBadge status={currentBooking.status}>
                {currentBooking.status === 'in_progress' ? 'In Progress' : 'Confirmed'}
              </StatusBadge>
            </div>

            {/* Timeline */}
            {stages.length > 0 && (
              <div className="space-y-6">
                <div className="chrome-label mb-4">SERVICE TIMELINE</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stages.map((stage, idx) => (
                    <div key={stage.id} className="relative">
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 transition-all ${
                            stage.completed
                              ? "border-success bg-success/20 text-success"
                              : stage.started_at
                              ? "border-primary bg-primary/20 text-primary chrome-glow"
                              : "border-border bg-muted/10 text-muted-foreground"
                          }`}
                        >
                          {stage.completed ? "✓" : idx + 1}
                        </div>
                        <div className={`chrome-label text-[9px] ${stage.completed || stage.started_at ? "text-foreground" : "text-text-tertiary"}`}>
                          {getStageLabel(stage.stage)}
                        </div>
                      </div>
                      {idx < stages.length - 1 && (
                        <div className="hidden md:block absolute top-5 left-full w-full h-0.5 bg-border -z-10" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-border/50">
              <ChromeButton size="sm" asChild>
                <Link to="/job-tracking">
                  <Clock className="mr-2 w-3 h-3" strokeWidth={1.4} />
                  Track Progress
                </Link>
              </ChromeButton>
            </div>

            {/* ETA */}
            {currentBooking.estimated_completion && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Clock className="w-4 h-4" strokeWidth={1.4} />
                  <span>Estimated completion: <span className="text-primary font-normal">
                    {new Date(currentBooking.estimated_completion).toLocaleDateString()}
                  </span></span>
                </div>
              </div>
            )}
          </ChromeSurface>
        ) : (
          <ChromeSurface className="p-8 mb-8 text-center" glow>
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="chrome-heading text-xl mb-2">NO ACTIVE BOOKINGS</h3>
            <p className="text-muted-foreground mb-4">You don't have any active bookings at the moment.</p>
            <ChromeButton size="sm" asChild>
              <Link to="/services">
                <Calendar className="mr-2 w-3 h-3" strokeWidth={1.4} />
                Book a Service
              </Link>
            </ChromeButton>
          </ChromeSurface>
        )}

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: "Book Service", to: "/services" },
            { icon: Package, label: "My Bookings", to: "/bookings" },
            { icon: Car, label: "My Vehicles", to: "/garage" },
            { icon: User, label: "Profile", to: "/profile" },
          ].map((action) => (
            <Link key={action.label} to={action.to}>
              <ChromeSurface className="p-6 chrome-sheen hover:chrome-glow-strong transition-all duration-300 cursor-pointer" glow>
                <action.icon className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
                <div className="chrome-label text-xs text-foreground">{action.label}</div>
              </ChromeSurface>
            </Link>
          ))}
        </div>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="chrome-label mb-4 text-foreground">UPCOMING BOOKINGS</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingBookings.map((booking) => (
                <ChromeSurface key={booking.id} className="p-6" glow>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-light text-foreground mb-1">{booking.services?.title}</div>
                      <div className="text-sm text-text-secondary flex items-center gap-2">
                        <Car className="w-3 h-3" strokeWidth={1.4} />
                        {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
                      </div>
                    </div>
                    <div className="chrome-label text-[10px] text-text-tertiary">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="chrome-label text-foreground">MY GARAGE</h2>
              <ChromeButton variant="ghost" size="sm" asChild>
                <Link to="/garage">View All</Link>
              </ChromeButton>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {vehicles.map((vehicle) => (
                <ChromeSurface key={vehicle.id} className="p-6 chrome-sheen" glow>
                  <Car className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
                  <div className="text-base font-light text-foreground mb-1">
                    {vehicle.year} {vehicle.make}
                  </div>
                  <div className="chrome-label text-[10px] text-text-secondary">{vehicle.model}</div>
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
