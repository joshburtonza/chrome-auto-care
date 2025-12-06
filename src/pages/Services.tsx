import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Shield, Sparkles, Car, Clock, DollarSign, TestTube } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientNav } from "@/components/client/ClientNav";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

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

const Services = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [bookingStep, setBookingStep] = useState<'calendar' | 'time' | 'details'>('calendar');
  const [testMode, setTestMode] = useState(true);

  // Generate mock availability (90 days forward)
  const generateAvailability = () => {
    const availability: Record<string, any> = {};
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      const hash = dateString.split('-').reduce((acc, part) => acc + parseInt(part), 0);
      const availableSlots = (hash % 4) + 1;
      const bookedSlots = hash % availableSlots;

      let status: 'available' | 'limited' | 'full' | 'unavailable';
      if (date.getDay() === 0) {
        status = 'unavailable';
      } else if (bookedSlots === 0) {
        status = 'available';
      } else if (bookedSlots >= availableSlots) {
        status = 'full';
      } else if (availableSlots - bookedSlots <= 1) {
        status = 'limited';
      } else {
        status = 'available';
      }

      availability[dateString] = {
        date: dateString,
        status,
        availableSlots: availableSlots - bookedSlots,
        bookedSlots,
      };
    }

    return availability;
  };

  const [availability] = useState(generateAvailability());

  useEffect(() => {
    loadServices();
    if (user) {
      loadVehicles();
    }

    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your booking is confirmed.');
      navigate('/services', { replace: true });
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again.');
      navigate('/services', { replace: true });
    }
  }, [user, searchParams, navigate]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('price_from', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error('Please sign in to book a service');
      navigate('/auth/client-login');
      return;
    }

    if (!selectedDate || !selectedTime || !selectedVehicle) {
      toast.error('Please complete all booking details');
      return;
    }

    setProcessingPayment(true);

    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          service_id: selectedService.id,
          vehicle_id: selectedVehicle,
          booking_date: selectedDate,
          booking_time: selectedTime,
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-yoco-checkout',
        {
          body: {
            bookingId: booking.id,
            amount: selectedService.price_from,
            currency: 'ZAR',
            testMode: testMode,
          },
        }
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData.redirectUrl) {
        window.location.href = checkoutData.redirectUrl;
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      console.error('Error processing booking:', error);
      toast.error(error.message || 'Failed to process booking');
      setProcessingPayment(false);
    }
  };

  const resetBookingModal = () => {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedVehicle('');
    setBookingStep('calendar');
  };

  const getServiceIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'protection':
        return Shield;
      case 'enhancement':
        return Sparkles;
      default:
        return Car;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-primary font-medium tracking-wider"
        >
          Loading services...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <ClientNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl relative">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Our Services
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
            Premium automotive protection and enhancement solutions
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {services.map((service, index) => {
            const ServiceIcon = getServiceIcon(service.category);
            return (
              <motion.div
                key={service.id}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <ChromeSurface className="p-5 sm:p-6 bg-card/50 backdrop-blur-sm border-border/40 hover:bg-card/70 hover:border-primary/20 transition-all duration-300 group">
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    <ServiceIcon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>

                  <div className="mb-4">
                    <div className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                      {service.category}
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1.5">{service.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{service.description}</p>
                  </div>

                  {service.features && service.features.length > 0 && (
                    <div className="space-y-1.5 mb-5 pb-5 border-b border-border/30">
                      {service.features.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {service.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={1.5} />
                        From R{service.price_from}
                      </span>
                    </div>
                    <ChromeButton size="sm" className="w-full sm:w-auto" onClick={() => setSelectedService(service)}>
                      Book Now
                    </ChromeButton>
                  </div>
                </ChromeSurface>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Booking Modal */}
      <Dialog open={!!selectedService} onOpenChange={resetBookingModal}>
        <DialogContent className="bg-card/95 backdrop-blur-md border-border/50 max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto mx-2 sm:mx-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold">Book Service</DialogTitle>
              <div className="flex items-center gap-2">
                <TestTube className={`w-4 h-4 ${testMode ? 'text-amber-500' : 'text-emerald-500'}`} />
                <Label htmlFor="test-mode" className="text-sm font-normal cursor-pointer text-muted-foreground">
                  {testMode ? 'Test Mode' : 'Live Mode'}
                </Label>
                <Switch
                  id="test-mode"
                  checked={testMode}
                  onCheckedChange={setTestMode}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {selectedService && (
              <>
                <ChromeSurface className="p-4 bg-muted/30 border-border/30">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Selected Service
                  </div>
                  <div className="text-base font-medium text-foreground">{selectedService.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Duration: {selectedService.duration} • From R{selectedService.price_from}
                  </div>
                </ChromeSurface>

                {bookingStep === 'calendar' && (
                  <AvailabilityCalendar
                    availability={availability}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date);
                      setBookingStep('time');
                    }}
                  />
                )}

                {bookingStep === 'time' && selectedDate && (
                  <>
                    <ChromeSurface className="p-4 bg-muted/30 border-border/30">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Selected Date
                      </div>
                      <div className="text-foreground mb-4">
                        {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                      <TimeSlotPicker
                        selectedTime={selectedTime}
                        onSelectTime={(time) => {
                          setSelectedTime(time);
                          setBookingStep('details');
                        }}
                        availableSlots={[]}
                      />
                    </ChromeSurface>

                    <ChromeButton variant="outline" onClick={() => setBookingStep('calendar')}>
                      ← Change Date
                    </ChromeButton>
                  </>
                )}

                {bookingStep === 'details' && selectedDate && selectedTime && (
                  <>
                    <ChromeSurface className="p-4 bg-muted/30 border-border/30">
                      <div className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Booking Details
                      </div>
                      {testMode && (
                        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                          <TestTube className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-amber-500">Test Mode Active - No real charges will be made</span>
                        </div>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="text-foreground">{new Date(selectedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="text-foreground">{selectedTime}</span>
                        </div>
                      </div>
                    </ChromeSurface>

                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        Select Vehicle
                      </div>
                      {vehicles.length > 0 ? (
                        <div className="space-y-2">
                          {vehicles.map((vehicle) => (
                            <button
                              key={vehicle.id}
                              onClick={() => setSelectedVehicle(vehicle.id)}
                              className={`w-full p-3.5 rounded-lg border transition-all text-left ${
                                selectedVehicle === vehicle.id
                                  ? 'bg-primary/10 border-primary/50'
                                  : 'bg-muted/20 border-border/50 hover:border-primary/30'
                              }`}
                            >
                              <div className="text-foreground font-medium">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-sm text-muted-foreground">{vehicle.color}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <ChromeSurface className="p-5 text-center bg-muted/30 border-border/30">
                          <p className="text-muted-foreground text-sm mb-4">No vehicles in your garage</p>
                          <ChromeButton variant="outline" onClick={() => navigate('/garage')}>
                            Add Vehicle
                          </ChromeButton>
                        </ChromeSurface>
                      )}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <ChromeButton variant="outline" onClick={() => setBookingStep('time')} disabled={processingPayment}>
                        ← Back
                      </ChromeButton>
                      <ChromeButton
                        className="flex-1"
                        onClick={handleBooking}
                        disabled={!selectedVehicle || processingPayment}
                      >
                        {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                      </ChromeButton>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
