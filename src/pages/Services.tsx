import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Clock, X, Search } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvailabilityCalendar } from "@/components/booking/AvailabilityCalendar";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClientNav } from "@/components/client/ClientNav";
import { motion } from "framer-motion";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { ServicesSkeleton } from "@/components/skeletons/PageSkeletons";
import { Input } from "@/components/ui/input";
import { CategoryFilter } from "@/components/services/CategoryFilter";
import { ServiceCard } from "@/components/services/ServiceCard";
import { ServiceDetailModal } from "@/components/services/ServiceDetailModal";
import { useProcessTemplates, ProcessTemplateStage } from "@/hooks/useProcessTemplates";

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_from: number;
  duration: string;
  features: string[] | null;
  notes: string[] | null;
  add_ons: string[] | null;
  color: string | null;
  image_url: string | null;
}

interface ServiceAvailability {
  service_id: string;
  date: string;
  booked_count: number;
}

const Services = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [bookingStep, setBookingStep] = useState<'calendar' | 'time' | 'details'>('calendar');
  const [serviceBookings, setServiceBookings] = useState<ServiceAvailability[]>([]);
  
  // New state for filters and detail modal
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [detailService, setDetailService] = useState<Service | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Process templates for stages
  const { templates } = useProcessTemplates();
  
  // Slots per service category
  const SLOTS_PER_SERVICE: Record<string, number> = {
    'PPF': 2,
    'PPS': 2,
    'Paint Correction': 3,
    'Ceramic': 3,
    'Detailing': 6,
    'Tint': 8,
    'Restoration': 2,
    'Accessories': 10,
  };
  const DEFAULT_SLOTS = 4;
  
  // Enable swipe navigation on mobile
  useSwipeNavigation();
  
  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await loadServices();
    await loadVehicles();
    await loadServiceBookings();
    toast.success('Services refreshed');
  }, []);

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  // Get stages for a service from its template
  const getServiceStages = useCallback((serviceId: string): ProcessTemplateStage[] => {
    const template = templates.find(t => t.service_id === serviceId);
    return template?.stages || [];
  }, [templates]);

  // Generate availability per service based on existing bookings
  const generateAvailability = useCallback(() => {
    const availability: Record<string, any> = {};
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];

      let allAvailable = true;
      let lowestAvailableSlots = Infinity;

      selectedServices.forEach(service => {
        const maxSlots = SLOTS_PER_SERVICE[service.category] || DEFAULT_SLOTS;
        const bookedForService = serviceBookings.filter(
          sb => sb.service_id === service.id && sb.date === dateString
        ).reduce((sum, sb) => sum + sb.booked_count, 0);
        
        const remainingSlots = maxSlots - bookedForService;
        if (remainingSlots <= 0) {
          allAvailable = false;
        }
        lowestAvailableSlots = Math.min(lowestAvailableSlots, remainingSlots);
      });

      if (selectedServices.length === 0) {
        availability[dateString] = {
          date: dateString,
          status: 'available',
          availableSlots: 4,
          bookedSlots: 0,
        };
      } else {
        availability[dateString] = {
          date: dateString,
          status: allAvailable ? (lowestAvailableSlots <= 1 ? 'limited' : 'available') : 'full',
          availableSlots: Math.max(0, lowestAvailableSlots),
          bookedSlots: 0,
        };
      }
    }

    return availability;
  }, [selectedServices, serviceBookings]);

  const availability = generateAvailability();

  useEffect(() => {
    loadServices();
    loadServiceBookings();
    if (user) {
      loadVehicles();
    }

    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success('Payment successful! Your booking is confirmed.');
      navigate('/bookings', { replace: true });
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
        .order('category')
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

  const loadServiceBookings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select('service_id, booking_date')
        .gte('booking_date', today)
        .not('status', 'eq', 'cancelled');

      if (error) throw error;
      
      const bookingCounts: ServiceAvailability[] = [];
      const countMap = new Map<string, number>();
      
      (data || []).forEach(booking => {
        const key = `${booking.service_id}-${booking.booking_date}`;
        countMap.set(key, (countMap.get(key) || 0) + 1);
      });
      
      countMap.forEach((count, key) => {
        const parts = key.split('-');
        const serviceId = parts[0];
        const bookingDate = parts.slice(1).join('-');
        
        bookingCounts.push({
          service_id: serviceId,
          date: bookingDate,
          booked_count: count
        });
      });
      
      setServiceBookings(bookingCounts);
    } catch (error) {
      console.error('Error loading service bookings:', error);
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

  const isTestEnvironment = import.meta.env.DEV || window.location.hostname === 'localhost';

  const toggleServiceSelection = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices.some(s => s.id === serviceId);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + s.price_from, 0);
  };

  const openBookingModal = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    setShowBookingModal(true);
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

    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    setProcessingPayment(true);

    try {
      const totalAmount = getTotalPrice();
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          service_id: selectedServices[0].id,
          vehicle_id: selectedVehicle,
          booking_date: selectedDate,
          booking_time: selectedTime,
          status: isTestEnvironment ? 'confirmed' : 'pending',
          payment_status: isTestEnvironment ? 'paid' : 'pending',
          payment_amount: totalAmount,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const bookingServicesData = selectedServices.map(service => ({
        booking_id: booking.id,
        service_id: service.id,
        price: service.price_from,
      }));

      const { error: servicesError } = await supabase
        .from('booking_services')
        .insert(bookingServicesData);

      if (servicesError) throw servicesError;

      if (isTestEnvironment) {
        toast.success('Booking confirmed! (Test mode - payment skipped)');
        resetBookingModal();
        navigate('/bookings');
        return;
      }

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-yoco-checkout',
        {
          body: {
            bookingId: booking.id,
            amount: totalAmount,
            currency: 'ZAR',
            testMode: false,
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
    setShowBookingModal(false);
    setSelectedServices([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedVehicle('');
    setBookingStep('calendar');
  };

  const handleRequestBooking = (service: Service) => {
    setShowDetailModal(false);
    if (!isServiceSelected(service.id)) {
      toggleServiceSelection(service);
    }
    setTimeout(() => openBookingModal(), 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <ServicesSkeleton />
      </div>
    );
  }

  const content = (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-4xl">
      {/* Header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
          Our Services
        </h1>
        <p className="text-muted-foreground text-sm">
          Select one or more services for your vehicle
        </p>
      </motion.div>

      {/* Search and Filter */}
      <motion.div 
        className="space-y-4 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </motion.div>

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <ChromeSurface className="p-4" sheen>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Selected Services ({selectedServices.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map(service => (
                    <span
                      key={service.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm"
                    >
                      {service.title}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleServiceSelection(service);
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="text-sm text-foreground font-medium mt-2">
                  Total: R{getTotalPrice().toLocaleString()}
                </div>
              </div>
              <ChromeButton onClick={openBookingModal} className="w-full sm:w-auto">
                Book Selected Services
              </ChromeButton>
            </div>
          </ChromeSurface>
        </motion.div>
      )}

      {/* Services Grid */}
      <motion.div 
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services found matching your criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredServices.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={isServiceSelected(service.id)}
              onToggleSelect={() => toggleServiceSelection(service)}
              onViewDetails={() => {
                setDetailService(service);
                setShowDetailModal(true);
              }}
              index={index}
            />
          ))
        )}
      </motion.div>
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

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={detailService}
        stages={detailService ? getServiceStages(detailService.id) : []}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onRequestBooking={handleRequestBooking}
      />

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={(open) => !open && resetBookingModal()}>
        <DialogContent className="bg-card/95 backdrop-blur-md border-border/50 max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto mx-2 sm:mx-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Book Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <ChromeSurface className="p-4 bg-muted/30 border-border/30">
              <div className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Selected Services ({selectedServices.length})
              </div>
              <div className="space-y-2">
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between items-center">
                    <span className="text-foreground">{service.title}</span>
                    <span className="text-muted-foreground">R{service.price_from}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/30 flex justify-between items-center font-medium">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">R{getTotalPrice().toLocaleString()}</span>
                </div>
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
                    {processingPayment ? 'Processing...' : isTestEnvironment ? 'Confirm Booking' : 'Proceed to Payment'}
                  </ChromeButton>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
