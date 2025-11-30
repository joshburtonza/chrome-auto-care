import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Shield, Sparkles, Car, Clock, DollarSign, User, Mail, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientNav } from "@/components/client/ClientNav";

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

  // Generate mock availability (90 days forward)
  const generateAvailability = () => {
    const availability: Record<string, any> = {};
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      // Pseudo-random availability based on date
      const hash = dateString.split('-').reduce((acc, part) => acc + parseInt(part), 0);
      const availableSlots = (hash % 4) + 1;
      const bookedSlots = hash % availableSlots;

      let status: 'available' | 'limited' | 'full' | 'unavailable';
      if (date.getDay() === 0) {
        // Sundays closed
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

    // Handle payment status from URL
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your booking is confirmed.');
      // Clear the URL parameter
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
      // 1. Create the booking first
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

      console.log('Booking created:', booking.id);

      // 2. Create Yoco checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-yoco-checkout',
        {
          body: {
            bookingId: booking.id,
            amount: selectedService.price_from,
            currency: 'ZAR',
          },
        }
      );

      if (checkoutError) throw checkoutError;

      console.log('Checkout session created:', checkoutData);

      // 3. Redirect to Yoco payment page
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
        <div className="chrome-label text-primary">LOADING SERVICES...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="chrome-title text-4xl mb-2">OUR SERVICES</h1>
          <p className="text-text-secondary">Premium automotive protection and enhancement solutions</p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service) => {
            const ServiceIcon = getServiceIcon(service.category);
            return (
              <ChromeSurface key={service.id} className="p-8 chrome-sheen group hover:chrome-glow-strong transition-all duration-300" glow>
                <div className="mb-6 inline-flex p-4 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <ServiceIcon className="w-8 h-8 text-primary" strokeWidth={1.4} />
                </div>

                <div className="mb-4">
                  <div className="chrome-label text-[10px] text-text-tertiary mb-2">{service.category}</div>
                  <h3 className="text-xl font-light text-foreground mb-2">{service.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{service.description}</p>
                </div>

                {service.features && service.features.length > 0 && (
                  <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                    {service.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.4} />
                        {service.duration}
                      </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" strokeWidth={1.4} />
                      From R{service.price_from}
                    </span>
                    </div>
                  </div>
                  <ChromeButton size="sm" onClick={() => setSelectedService(service)}>
                    Book Now
                  </ChromeButton>
                </div>
              </ChromeSurface>
            );
          })}
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={!!selectedService} onOpenChange={resetBookingModal}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="chrome-title text-2xl">Book Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedService && (
              <>
                <ChromeSurface className="p-4" glow>
                  <div className="chrome-label text-[10px] text-text-tertiary mb-2">SELECTED SERVICE</div>
                <div className="text-lg font-light text-foreground">{selectedService.title}</div>
                <div className="text-sm text-text-secondary mt-1">
                  Duration: {selectedService.duration} • From R{selectedService.price_from}
                </div>
                </ChromeSurface>

                {bookingStep === 'calendar' && (
                  <>
                    <AvailabilityCalendar
                      availability={availability}
                      selectedDate={selectedDate}
                      onSelectDate={(date) => {
                        setSelectedDate(date);
                        setBookingStep('time');
                      }}
                    />
                  </>
                )}

                {bookingStep === 'time' && selectedDate && (
                  <>
                    <ChromeSurface className="p-4" glow>
                      <div className="chrome-label text-[10px] text-text-tertiary mb-2">SELECTED DATE</div>
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
                    <ChromeSurface className="p-4" glow>
                      <div className="chrome-label text-[10px] text-text-tertiary mb-3">BOOKING DETAILS</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">Date:</span>
                          <span className="text-foreground">{new Date(selectedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-tertiary">Time:</span>
                          <span className="text-foreground">{selectedTime}</span>
                        </div>
                      </div>
                    </ChromeSurface>

                    <div>
                      <div className="chrome-label mb-3">SELECT VEHICLE</div>
                      {vehicles.length > 0 ? (
                        <div className="space-y-2">
                          {vehicles.map((vehicle) => (
                            <button
                              key={vehicle.id}
                              onClick={() => setSelectedVehicle(vehicle.id)}
                              className={`w-full p-4 rounded-lg border transition-all text-left ${
                                selectedVehicle === vehicle.id
                                  ? 'chrome-surface border-primary chrome-glow'
                                  : 'bg-background-alt border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="text-foreground font-light">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-sm text-text-tertiary">{vehicle.color}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <ChromeSurface className="p-6 text-center" glow>
                          <p className="text-text-secondary mb-4">No vehicles in your garage</p>
                          <ChromeButton variant="outline" onClick={() => navigate('/garage')}>
                            Add Vehicle
                          </ChromeButton>
                        </ChromeSurface>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
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
