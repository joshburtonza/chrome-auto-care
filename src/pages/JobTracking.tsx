import { ClientNav } from "@/components/client/ClientNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { StatusBadge } from "@/components/chrome/StatusBadge";
import { CheckCircle, Clock, Circle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      
      // Subscribe to realtime stage updates
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
            console.log('Stage updated:', payload);
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedStage = payload.new;
              setStages(prev => prev.map(s => 
                s.id === updatedStage.id ? updatedStage : s
              ));
              
              // Show toast notification with visual feedback
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
            // Refresh to get latest data
            fetchStages();
          }
        )
        .subscribe();

      // Subscribe to booking updates (status, ETA changes)
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
            console.log('Booking updated:', payload);
            if (payload.new) {
              setSelectedBooking(payload.new);
              
              // Show notification for ETA updates
              if (payload.new.estimated_completion !== payload.old?.estimated_completion) {
                toast.info('Estimated Completion Updated 📅', {
                  description: `New date: ${new Date(payload.new.estimated_completion).toLocaleDateString()}`,
                  duration: 5000,
                });
              }
              
              // Show notification for status changes
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

      // Fetch images for all stages
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
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'current':
        return <Clock className="w-5 h-5 text-primary animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
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
        <div className="chrome-label text-primary">LOADING...</div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="chrome-heading text-2xl mb-2">NO ACTIVE BOOKINGS</h2>
          <p className="text-muted-foreground">You don't have any active bookings at the moment.</p>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">JOB TRACKING</h1>
          <p className="text-text-secondary">Track your service progress in real-time</p>
        </div>

        {bookings.length > 1 && (
          <div className="mb-6">
            <label className="chrome-label text-xs mb-2 block">SELECT BOOKING</label>
            <Select
              value={selectedBooking?.id}
              onValueChange={(value) => {
                const booking = bookings.find(b => b.id === value);
                setSelectedBooking(booking);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
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
          </div>
        )}

        {selectedBooking && (
          <ChromeSurface className="p-8 mb-8" glow>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="chrome-label mb-2 text-text-tertiary">CURRENT BOOKING</div>
                <h2 className="text-2xl font-light text-foreground mb-1">
                  {selectedBooking.services?.title}
                </h2>
                <p className="text-text-secondary">
                  {selectedBooking.vehicles?.year} {selectedBooking.vehicles?.make} {selectedBooking.vehicles?.model}
                </p>
              </div>
              <StatusBadge status={selectedBooking.status} />
            </div>

            {/* Global Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="chrome-label text-xs">OVERALL PROGRESS</span>
                <span className="text-primary font-semibold">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Booking Date:</span>
                <span className="ml-2 text-foreground">
                  {new Date(selectedBooking.booking_date).toLocaleDateString()}
                </span>
              </div>
              {selectedBooking.estimated_completion && (
                <div>
                  <span className="text-muted-foreground">Est. Completion:</span>
                  <span className="ml-2 text-primary">
                    {new Date(selectedBooking.estimated_completion).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </ChromeSurface>
        )}

        {/* Progress Timeline */}
        <div className="mb-8">
          <h2 className="chrome-label mb-6 text-foreground">SERVICE TIMELINE</h2>
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const status = getStageStatus(stage);
              return (
                <div
                  key={stage.id}
                  className={`relative pl-12 pb-4 ${
                    idx < stages.length - 1 ? 'border-l-2 ml-2.5' : ''
                  } ${
                    status === 'completed' ? 'border-success' : 'border-border'
                  } transition-all duration-500`}
                >
                 <div className="absolute left-0 top-0 -translate-x-1/2 z-10">
                    <div className={`rounded-full p-1 ${
                      status === 'completed' ? 'bg-success/20' : 
                      status === 'current' ? 'bg-primary/20 animate-pulse' : 
                      'bg-muted'
                    }`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                  <ChromeSurface
                    className={`p-4 transition-all duration-500 ${
                      status === 'current' ? 'border-primary shadow-lg shadow-primary/20' : 
                      status === 'completed' ? 'border-success/50' : ''
                    }`}
                    glow={status === 'current'}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${
                            status === 'current' ? 'text-primary' : 
                            status === 'completed' ? 'text-success' : 
                            'text-foreground'
                          }`}>
                            {getStageLabel(stage.stage)}
                          </h3>
                          {status === 'current' && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full animate-pulse">
                              IN PROGRESS
                            </span>
                          )}
                          {status === 'completed' && (
                            <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        {stage.started_at && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Started: {new Date(stage.started_at).toLocaleString()}
                          </p>
                        )}
                        {stage.completed_at && (
                          <p className="text-xs text-success mb-1">
                            Completed: {new Date(stage.completed_at).toLocaleString()}
                          </p>
                        )}
                        {stage.notes && (
                          <p className="text-sm text-foreground mt-2 p-2 bg-muted rounded">
                            {stage.notes}
                          </p>
                        )}

                        {/* Progress Images */}
                        {stageImages[stage.id] && stageImages[stage.id].length > 0 && (
                          <div className="mt-4">
                            <div className="chrome-label text-xs mb-2">PROGRESS IMAGES</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {stageImages[stage.id].map((img) => (
                                <img
                                  key={img.id}
                                  src={img.image_url}
                                  alt="Progress"
                                  className="w-full h-32 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => window.open(img.image_url, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </ChromeSurface>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobTracking;
