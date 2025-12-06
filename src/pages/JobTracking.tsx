import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { CheckCircle, Clock, Circle, AlertCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const JobTracking = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [stages, setStages] = useState<any[]>([]);
  const [stageImages, setStageImages] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedBooking) {
      fetchStages();
      
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

      return () => {
        supabase.removeChannel(stagesChannel);
        supabase.removeChannel(bookingChannel);
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl relative">
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
              </div>
            </ChromeSurface>
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
