import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Play, Check, Calendar, Upload, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type BookingStatus = Database['public']['Enums']['booking_status'];
type StageType = Database['public']['Enums']['stage_type'];

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string | null;
  status: BookingStatus;
  notes: string | null;
  estimated_completion: string | null;
  priority: string | null;
  services: {
    title: string;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
  vehicles: {
    make: string;
    model: string;
    year: string;
  } | null;
}

interface BookingStage {
  id: string;
  stage: StageType;
  completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  stage_order: number | null;
}

export default function StaffBookings() {
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingStages, setBookingStages] = useState<BookingStage[]>([]);
  const [stageImages, setStageImages] = useState<Record<string, any[]>>({});
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBookings();

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('staff-bookings-list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Bookings changed, refreshing list...');
          fetchBookings();
        }
      )
      .subscribe();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('staff-bookings-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profiles changed, refreshing bookings...');
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  // Separate effect for stage-specific subscriptions
  useEffect(() => {
    if (!selectedBooking) return;

    // Subscribe to booking stages changes for the selected booking
    const stagesChannel = supabase
      .channel(`booking-stages-${selectedBooking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_stages',
          filter: `booking_id=eq.${selectedBooking.id}`
        },
        () => {
          console.log('Booking stages changed, refreshing...');
          fetchBookingStages(selectedBooking.id);
        }
      )
      .subscribe();

    // Subscribe to stage images changes for the selected booking
    const imagesChannel = supabase
      .channel(`stage-images-${selectedBooking.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_stage_images'
        },
        () => {
          console.log('Stage images changed, refreshing...');
          fetchBookingStages(selectedBooking.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stagesChannel);
      supabase.removeChannel(imagesChannel);
    };
  }, [selectedBooking]);

  // Handle booking selection from dashboard
  useEffect(() => {
    if (location.state?.selectedBookingId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === location.state.selectedBookingId);
      if (booking) {
        setSelectedBooking(booking);
        fetchBookingStages(booking.id);
      }
    }
  }, [location.state, bookings]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(title),
          vehicles(make, model, year)
        `)
        .order('booking_date', { ascending: true });

      if (error) throw error;
      
      // Fetch profiles separately for each booking
      const bookingsWithProfiles = await Promise.all(
        (data || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', booking.user_id)
            .single();
          
          return {
            ...booking,
            profiles: profile
          };
        })
      );
      
      setBookings(bookingsWithProfiles as any);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingStages = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_stages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      
      setBookingStages(data || []);
      
      const notesMap: Record<string, string> = {};
      data?.forEach(stage => {
        if (stage.notes) notesMap[stage.id] = stage.notes;
      });
      setStageNotes(notesMap);

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
      toast({
        title: 'Error',
        description: 'Failed to load stages',
        variant: 'destructive',
      });
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    fetchBookingStages(booking.id);
  };

  const handleCloseDialog = () => {
    setSelectedBooking(null);
    setBookingStages([]);
    setStageNotes({});
    setStageImages({});
    setUploadingImages({});
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchBookings();
      
      toast({
        title: 'Success',
        description: 'Booking status updated',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleStartStage = async (stageId: string, stageName: string) => {
    try {
      const { error } = await supabase
        .from('booking_stages')
        .update({ 
          started_at: new Date().toISOString(),
        })
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Started: ${getStageLabel(stageName)}`,
      });
      
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error starting stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to start stage',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteStage = async (stageId: string, stageName: string) => {
    try {
      const notes = stageNotes[stageId] || null;
      
      const { error } = await supabase
        .from('booking_stages')
        .update({ 
          completed: true,
          completed_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Completed: ${getStageLabel(stageName)}`,
      });
      
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error completing stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete stage',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateETA = async (bookingId: string, newETA: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ estimated_completion: newETA })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'ETA updated',
      });
      
      await fetchBookings();
    } catch (error) {
      console.error('Error updating ETA:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ETA',
        variant: 'destructive',
      });
    }
  };

  const handlePhotoUpload = async (stageId: string, file: File) => {
    setUploadingImages(prev => ({ ...prev, [stageId]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${stageId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('booking-stage-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('booking-stage-images')
        .getPublicUrl(filePath);

      const { error: dbError, data: userData } = await supabase.auth.getUser();
      if (dbError) throw dbError;

      const { error: insertError } = await supabase
        .from('booking_stage_images')
        .insert({
          booking_stage_id: stageId,
          image_url: publicUrl,
          uploaded_by: userData.user.id
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
      
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [stageId]: false }));
    }
  };


  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      vehicle_checkin: 'Vehicle Check-In',
      stripping: 'Stripping',
      surface_prep: 'Surface Preparation',
      paint_correction: 'Paint Correction',
      ppf_installation: 'PPF Installation',
      reassembly: 'Reassembly',
      qc1: 'Quality Check 1',
      final_detail: 'Final Detailing',
      qc2: 'Quality Check 2',
      delivery_prep: 'Delivery Preparation',
    };
    return labels[stage] || stage;
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" /> High</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const handleUpdatePriority = async (bookingId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ priority: newPriority })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Priority updated',
      });
      
      await fetchBookings();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priority',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StaffNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Bookings Management</h1>

        <div className="grid gap-4">
          {bookings.map((booking) => (
            <ChromeSurface key={booking.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="text-xl font-semibold">
                      {booking.profiles?.full_name || 'Unknown Client'}
                    </h3>
                    <StatusBadge status={booking.status} />
                    {getPriorityBadge(booking.priority)}
                  </div>
                  <p className="text-muted-foreground">
                    {booking.services?.title || 'No Service'} - {booking.vehicles?.make} {booking.vehicles?.model} ({booking.vehicles?.year})
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📅 {new Date(booking.booking_date).toLocaleDateString()}</span>
                    {booking.booking_time && <span>🕐 {booking.booking_time}</span>}
                    {booking.profiles?.phone && <span>📞 {booking.profiles.phone}</span>}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={booking.priority || 'normal'}
                    onValueChange={(value) => handleUpdatePriority(booking.id, value)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={booking.status}
                    onValueChange={(value) => handleUpdateStatus(booking.id, value as BookingStatus)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={() => handleViewBooking(booking)}>
                    View Details
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estimated Completion:</span>
                <Input
                  type="date"
                  value={booking.estimated_completion || ''}
                  onChange={(e) => handleUpdateETA(booking.id, e.target.value)}
                  className="w-48"
                />
              </div>
            </ChromeSurface>
          ))}
        </div>

        {/* Stage Management Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Booking Details - {selectedBooking?.profiles?.full_name}
              </DialogTitle>
              <DialogDescription>
                Manage booking stages, upload progress images, and update completion status
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Service:</span> {selectedBooking.services?.title}
                  </div>
                  <div>
                    <span className="font-medium">Vehicle:</span>{' '}
                    {selectedBooking.vehicles?.make} {selectedBooking.vehicles?.model}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{' '}
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Process Stages</h3>
                  
                  {bookingStages.map((stage, index) => (
                    <ChromeSurface
                      key={stage.id}
                      className={`p-4 ${
                        stage.completed
                          ? 'bg-green-50 dark:bg-green-950 border-green-300'
                          : stage.started_at
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-300'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </span>
                            <h4 className="font-semibold">{getStageLabel(stage.stage)}</h4>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            {stage.completed && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Check className="h-4 w-4" />
                                Completed {new Date(stage.completed_at!).toLocaleString()}
                              </span>
                            )}
                            {stage.started_at && !stage.completed && (
                              <span className="flex items-center gap-1 text-blue-600">
                                <Clock className="h-4 w-4" />
                                In Progress (started {new Date(stage.started_at).toLocaleString()})
                              </span>
                            )}
                            {!stage.started_at && !stage.completed && (
                              <span className="text-muted-foreground">Not started</span>
                            )}
                          </div>

                          {(stage.started_at || stage.completed) && (
                            <Textarea
                              value={stageNotes[stage.id] || ''}
                              onChange={(e) => setStageNotes(prev => ({ ...prev, [stage.id]: e.target.value }))}
                              placeholder="Add notes..."
                              disabled={stage.completed}
                              className="mt-3"
                              rows={2}
                            />
                          )}

                          {/* Image Upload Section */}
                          {stage.started_at && !stage.completed && (
                            <div className="mt-4">
                              <label className="text-sm font-medium mb-2 block">Progress Images</label>
                              <div className="flex items-center gap-2 mb-3">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(stage.id, file);
                                  }}
                                  disabled={uploadingImages[stage.id]}
                                  className="flex-1"
                                />
                                {uploadingImages[stage.id] && (
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Display Images */}
                          {stageImages[stage.id] && stageImages[stage.id].length > 0 && (
                            <div className="mt-4">
                              <div className="text-sm font-medium mb-2">Uploaded Images (Permanent Record)</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {stageImages[stage.id].map((img) => (
                                  <div key={img.id} className="relative group">
                                    <img
                                      src={img.image_url}
                                      alt="Progress"
                                      className="w-full h-32 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(img.image_url, '_blank')}
                                      title="Click to view full size"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          {!stage.started_at && !stage.completed && (
                            <Button
                              onClick={() => handleStartStage(stage.id, stage.stage)}
                              size="sm"
                              className="gap-1"
                            >
                              <Play className="h-4 w-4" />
                              Start
                            </Button>
                          )}
                          
                          {stage.started_at && !stage.completed && (
                            <Button
                              onClick={() => handleCompleteStage(stage.id, stage.stage)}
                              size="sm"
                              variant="default"
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </ChromeSurface>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
