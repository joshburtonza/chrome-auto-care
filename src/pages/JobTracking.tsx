import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { CheckCircle, Clock, Circle, AlertCircle, Sparkles, Plus, XCircle, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

interface AddonRequest {
  id: string;
  service_id: string;
  requested_price: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  services: {
    id: string;
    title: string;
    color: string | null;
  } | null;
}

interface ServiceOption {
  id: string;
  title: string;
  price_from: number;
  color: string | null;
}

const JobTracking = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [stageImages, setStageImages] = useState<Record<string, any[]>>({});
  const [addonRequests, setAddonRequests] = useState<AddonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Client addon request state
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [requestedPrice, setRequestedPrice] = useState<string>('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
      fetchAvailableServices();
    }
  }, [user]);

  const fetchAvailableServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, title, price_from, color')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      setAvailableServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = availableServices.find(s => s.id === serviceId);
    if (service) {
      setRequestedPrice(service.price_from.toString());
    }
  };

  const handleSubmitAddonRequest = async () => {
    if (!selectedBooking || !selectedServiceId || !requestedPrice || !user) {
      toast.error('Please select a service and enter a price');
      return;
    }

    setSubmittingRequest(true);
    try {
      const { error } = await supabase
        .from('addon_requests')
        .insert({
          booking_id: selectedBooking.id,
          service_id: selectedServiceId,
          requested_price: parseFloat(requestedPrice),
          requested_by: user.id,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Add-on request submitted!', {
        description: 'You will be notified when it is reviewed'
      });
      
      // Reset form
      setSelectedServiceId('');
      setRequestedPrice('');
      setShowRequestForm(false);
    } catch (error: any) {
      console.error('Error submitting addon request:', error);
      toast.error('Failed to submit request', {
        description: error.message
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  useEffect(() => {
    if (selectedBooking) {
      fetchStages();
      fetchAddonRequests();
      
      const stagesChannel = supabase
        .channel('booking-stages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'booking_stages',
            filter: `booking_id=eq.${selectedBooking.id}`
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedStage = payload.new;
              setStages(prev => prev.map(s => 
                s.id === updatedStage.id ? updatedStage : s
              ));
              
              if (updatedStage.completed && !payload.old.completed) {
                toast.success('Stage Completed! 🎉', {
                  description: getStageLabel(updatedStage.stage),
                  duration: 5000,
                });
              } else if (updatedStage.started_at && !payload.old.started_at) {
                toast.info('Work Started! 🔧', {
                  description: getStageLabel(updatedStage.stage),
                  duration: 5000,
                });
              }
            }
            fetchStages();
          }
        )
        .subscribe();

      // Subscribe to stage images for real-time updates
      const imagesChannel = supabase
        .channel(`stage-images-${selectedBooking.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_stage_images'
          },
          (payload) => {
            if (payload.new) {
              const newImage = payload.new as any;
              // Check if this image belongs to one of our stages
              const stageIds = stages.map(s => s.id);
              if (stageIds.includes(newImage.booking_stage_id)) {
                setStageImages(prev => ({
                  ...prev,
                  [newImage.booking_stage_id]: [
                    ...(prev[newImage.booking_stage_id] || []),
                    newImage
                  ]
                }));
                toast.info('New Progress Photo Added! 📸', {
                  description: 'Staff uploaded a new image',
                  duration: 4000,
                });
              }
            }
          }
        )
        .subscribe();

      const bookingChannel = supabase
        .channel('booking-update')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `id=eq.${selectedBooking.id}`
          },
          (payload) => {
            if (payload.new) {
              setSelectedBooking(payload.new);
              
              if (payload.new.estimated_completion !== payload.old?.estimated_completion) {
                toast.info('Estimated Completion Updated 📅', {
                  description: `New date: ${new Date(payload.new.estimated_completion).toLocaleDateString()}`,
                  duration: 5000,
                });
              }
              
              if (payload.new.status !== payload.old?.status) {
                toast.success('Booking Status Updated', {
                  description: `Status: ${payload.new.status}`,
                  duration: 5000,
                });
              }
            }
            fetchBookings();
          }
        )
        .subscribe();

      // Subscribe to addon requests changes
      const addonChannel = supabase
        .channel(`addon-requests-${selectedBooking.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'addon_requests',
            filter: `booking_id=eq.${selectedBooking.id}`
          },
          (payload) => {
            fetchAddonRequests();
            if (payload.eventType === 'UPDATE' && payload.new) {
              const status = (payload.new as any).status;
              if (status === 'approved') {
                toast.success('Add-on Approved! ✅', {
                  description: 'Your requested service has been added',
                  duration: 5000,
                });
              } else if (status === 'rejected') {
                toast.error('Add-on Declined', {
                  description: 'Please rebook for a later time',
                  duration: 5000,
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(stagesChannel);
        supabase.removeChannel(bookingChannel);
        supabase.removeChannel(imagesChannel);
        supabase.removeChannel(addonChannel);
      };
    }
  }, [selectedBooking]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, services(title), vehicles(make, model, year)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
      if (data && data.length > 0) {
        setSelectedBooking(data[0]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    if (!selectedBooking) return;
    
    try {
      const { data, error } = await supabase
        .from('booking_stages')
        .select('*')
        .eq('booking_id', selectedBooking.id)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      setStages(data || []);

      const stageIds = data?.map(s => s.id) || [];
      if (stageIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('booking_stage_images')
          .select('*')
          .in('booking_stage_id', stageIds)
          .order('created_at', { ascending: true });

        if (imagesError) throw imagesError;
        
        const imagesMap: Record<string, any[]> = {};
        imagesData?.forEach(img => {
          if (!imagesMap[img.booking_stage_id]) {
            imagesMap[img.booking_stage_id] = [];
          }
          imagesMap[img.booking_stage_id].push(img);
        });
        setStageImages(imagesMap);
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  };

  const fetchAddonRequests = async () => {
    if (!selectedBooking) return;
    
    try {
      const { data, error } = await supabase
        .from('addon_requests')
        .select(`
          *,
          services:service_id (id, title, color)
        `)
        .eq('booking_id', selectedBooking.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddonRequests(data || []);
    } catch (error) {
      console.error('Error fetching addon requests:', error);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      vehicle_checkin: 'Vehicle Check-In & Photography',
      stripping: 'Stripping',
      surface_prep: 'Surface Prep & Inspection',
      paint_correction: 'Paint Correction / Buffing',
      ppf_installation: 'PPF Installation / Ceramic Treatment',
      reassembly: 'Reassembly',
      qc1: 'Quality Control #1',
      final_detail: 'Final Detail + Ceramic Finishing',
      qc2: 'Quality Control #2',
      delivery_prep: 'Delivery Prep + Customer Pickup'
    };
    return labels[stage] || stage;
  };

  const getStageStatus = (stage: any) => {
    if (stage.completed) return 'completed';
    if (stage.started_at) return 'current';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'current':
        return <Clock className="w-5 h-5 text-primary animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground/40" />;
    }
  };

  const calculateProgress = () => {
    if (stages.length === 0) return 0;
    const completedStages = stages.filter(s => s.completed).length;
    return Math.round((completedStages / stages.length) * 100);
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

  if (bookings.length === 0) {
    return (
      <div className="min-h-screen bg-background relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <ClientNav />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-foreground mb-2">No Active Bookings</h2>
          <p className="text-muted-foreground">You don't have any active bookings at the moment.</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <ClientNav />
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
              Job Tracking
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
            Track your service progress in real-time
          </p>
        </motion.div>

        {bookings.length > 1 && (
          <motion.div 
            className="mb-5"
            {...fadeInUp}
          >
            <label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wide">
              Select Booking
            </label>
            <Select
              value={selectedBooking?.id}
              onValueChange={(value) => {
                const booking = bookings.find(b => b.id === value);
                setSelectedBooking(booking);
              }}
            >
              <SelectTrigger className="w-full max-w-md bg-card/50 border-border/50 backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bookings.map((booking) => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.services?.title} - {booking.vehicles?.year} {booking.vehicles?.make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {selectedBooking && (
          <motion.div {...fadeInUp}>
            <ChromeSurface className="p-5 sm:p-6 mb-5 bg-card/60 backdrop-blur-sm border-border/40">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                    Current Booking
                  </div>
                  <h2 className="text-lg sm:text-xl font-medium text-foreground mb-1">
                    {selectedBooking.services?.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {selectedBooking.vehicles?.year} {selectedBooking.vehicles?.make} {selectedBooking.vehicles?.model}
                  </p>
                </div>
                <StatusBadge status={selectedBooking.status} />
              </div>

              {/* Global Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Overall Progress
                  </span>
                  <span className="text-sm font-semibold text-primary">{progress}%</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                  <span className="text-muted-foreground">Booking Date:</span>
                  <span className="text-foreground font-medium">
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </span>
                </div>
                {selectedBooking.estimated_completion && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <span className="text-muted-foreground">Est. Completion:</span>
                    <span className="text-primary font-medium">
                      {new Date(selectedBooking.estimated_completion).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {(() => {
                  const approvedTotal = addonRequests
                    .filter(r => r.status === 'approved')
                    .reduce((sum, r) => sum + (r.requested_price || 0), 0);
                  return approvedTotal > 0 ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 sm:col-span-2">
                      <span className="text-muted-foreground">Approved Add-ons:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +R{approvedTotal.toLocaleString()}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </ChromeSurface>
          </motion.div>
        )}

        {/* Pending Add-on Requests */}
        {addonRequests.length > 0 && (
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Requested Add-ons
            </h2>
            <div className="space-y-2">
              {addonRequests.map((request) => (
                <ChromeSurface 
                  key={request.id}
                  className={`p-3 sm:p-4 ${
                    request.status === 'pending' 
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50' 
                      : request.status === 'approved'
                      ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50'
                      : 'bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-3 w-3 rounded-full shrink-0" 
                        style={{ backgroundColor: request.services?.color || '#6b7280' }}
                      />
                      <div>
                        <span className="font-medium text-foreground">
                          {request.services?.title}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          R{request.requested_price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div>
                      {request.status === 'pending' && (
                        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Awaiting Approval
                        </Badge>
                      )}
                      {request.status === 'approved' && (
                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </Badge>
                      )}
                      {request.status === 'rejected' && (
                        <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 gap-1">
                          <XCircle className="h-3 w-3" />
                          Declined
                        </Badge>
                      )}
                    </div>
                  </div>
                  {request.status === 'rejected' && request.rejection_reason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 pl-6">
                      Reason: {request.rejection_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 pl-6">
                    Requested {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </ChromeSurface>
              ))}
            </div>
          </motion.div>
        )}

        {/* Request Add-on Section */}
        {selectedBooking && (selectedBooking.status === 'in_progress' || selectedBooking.status === 'confirmed') && (
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            {!showRequestForm ? (
              <Button
                variant="outline"
                onClick={() => setShowRequestForm(true)}
                className="w-full border-dashed border-primary/30 text-primary hover:bg-primary/5"
              >
                <Plus className="h-4 w-4 mr-2" />
                Request Additional Service
              </Button>
            ) : (
              <ChromeSurface className="p-4 sm:p-5 bg-card/60 backdrop-blur-sm border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground">Request Add-on Service</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRequestForm(false);
                      setSelectedServiceId('');
                      setRequestedPrice('');
                    }}
                    className="text-muted-foreground hover:text-foreground h-8 px-2"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Select Service
                    </label>
                    <Select value={selectedServiceId} onValueChange={handleServiceSelect}>
                      <SelectTrigger className="w-full bg-background/50">
                        <SelectValue placeholder="Choose a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableServices.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: service.color || '#6b7280' }}
                              />
                              <span>{service.title}</span>
                              <span className="text-muted-foreground ml-1">
                                from R{service.price_from.toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Requested Price (ZAR)
                    </label>
                    <Input
                      type="number"
                      value={requestedPrice}
                      onChange={(e) => setRequestedPrice(e.target.value)}
                      placeholder="Enter price"
                      className="bg-background/50"
                    />
                  </div>
                  
                  <Button
                    onClick={handleSubmitAddonRequest}
                    disabled={!selectedServiceId || !requestedPrice || submittingRequest}
                    className="w-full"
                  >
                    {submittingRequest ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </div>
              </ChromeSurface>
            )}
          </motion.div>
        )}

        {/* Progress Timeline */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wide">
            Service Timeline
          </h2>
          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const status = getStageStatus(stage);
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative pl-10 ${
                    idx < stages.length - 1 ? 'pb-3' : ''
                  }`}
                >
                  {/* Timeline line */}
                  {idx < stages.length - 1 && (
                    <div className={`absolute left-[11px] top-7 w-0.5 h-full ${
                      status === 'completed' ? 'bg-emerald-500/50' : 'bg-border/50'
                    }`} />
                  )}
                  
                  <div className="absolute left-0 top-0 z-10">
                    <div className={`rounded-full p-0.5 ${
                      status === 'completed' ? 'bg-emerald-500/20' : 
                      status === 'current' ? 'bg-primary/20' : 
                      'bg-muted/30'
                    }`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                  
                  <ChromeSurface
                    className={`p-4 transition-all bg-card/40 backdrop-blur-sm ${
                      status === 'current' ? 'border-primary/50 bg-primary/5' : 
                      status === 'completed' ? 'border-emerald-500/30' : 'border-border/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium text-sm ${
                            status === 'current' ? 'text-primary' : 
                            status === 'completed' ? 'text-emerald-500' : 
                            'text-foreground'
                          }`}>
                            {getStageLabel(stage.stage)}
                          </h3>
                          {status === 'current' && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full font-medium">
                              In Progress
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] rounded-full font-medium">
                              Completed
                            </span>
                          )}
                        </div>
                        {stage.started_at && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Started: {new Date(stage.started_at).toLocaleString()}
                          </p>
                        )}
                        {stage.completed_at && (
                          <p className="text-xs text-emerald-500 mb-1">
                            Completed: {new Date(stage.completed_at).toLocaleString()}
                          </p>
                        )}
                        {stage.notes && (
                          <p className="text-sm text-foreground mt-2 p-2.5 bg-muted/20 rounded-lg">
                            {stage.notes}
                          </p>
                        )}

                        {/* Progress Images */}
                        {stageImages[stage.id] && stageImages[stage.id].length > 0 && (
                          <div className="mt-3">
                            <div className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                              Progress Images
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {stageImages[stage.id].map((img) => (
                                <img
                                  key={img.id}
                                  src={img.image_url}
                                  alt="Progress"
                                  className="w-full h-24 sm:h-28 object-cover rounded-lg border border-border/30 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(img.image_url, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </ChromeSurface>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JobTracking;
