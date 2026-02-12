import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Play, Check, Calendar, Upload, Clock, AlertTriangle, Plus, X, Wrench, FileText, Pencil, Send, CheckCircle, XCircle, Loader2, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateBookingInvoice } from '@/lib/generateInvoice';
import { CreateBookingDialog } from '@/components/staff/CreateBookingDialog';
import type { Database } from '@/integrations/supabase/types';

interface Service {
  id: string;
  title: string;
  price_from: number;
  category: string;
  color: string | null;
}

interface BookingService {
  id: string;
  service_id: string;
  price: number;
  service: Service;
}

type BookingStatus = Database['public']['Enums']['booking_status'];


interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string | null;
  status: BookingStatus;
  notes: string | null;
  estimated_completion: string | null;
  priority: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  payment_date: string | null;
  services: {
    title: string;
    color?: string | null;
  } | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
    address?: string | null;
  } | null;
  vehicles: {
    make: string;
    model: string;
    year: string;
  } | null;
}

interface BookingStage {
  id: string;
  stage: string;
  completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  stage_order: number | null;
}

export default function StaffBookings() {
  const location = useLocation();
  const { userRole } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingStages, setBookingStages] = useState<BookingStage[]>([]);
  const [stageImages, setStageImages] = useState<Record<string, any[]>>({});
  const [stageNotes, setStageNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Service management state
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [selectedServiceToAdd, setSelectedServiceToAdd] = useState<string>('');
  const [customServicePrice, setCustomServicePrice] = useState<string>('');
  
  // Addon request state
  const [addonRequests, setAddonRequests] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  
  // Admin timestamp editing state
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null);
  const [editStartedAt, setEditStartedAt] = useState<string>('');
  const [editStartedAtTime, setEditStartedAtTime] = useState<string>('');
  const [createBookingOpen, setCreateBookingOpen] = useState(false);

  const isAdmin = userRole === 'admin';
  const { user } = useAuth();
  const canCreateBooking = isAdmin || user?.email === 'farhaan.surtie@gmail.com';

  useEffect(() => {
    fetchBookings();
    fetchAllServices();
    if (isAdmin) {
      fetchPendingRequests();
    }

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

    // Subscribe to addon requests changes (for admin)
    const requestsChannel = supabase
      .channel('addon-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'addon_requests'
        },
        () => {
          console.log('Addon requests changed, refreshing...');
          if (isAdmin) fetchPendingRequests();
          if (selectedBooking) fetchAddonRequests(selectedBooking.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, [isAdmin]);

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
          services(title, color),
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

  const fetchAllServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, title, price_from, category, color')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setAllServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchBookingServices = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_services')
        .select(`
          id,
          service_id,
          price,
          services:service_id(id, title, price_from, category)
        `)
        .eq('booking_id', bookingId);

      if (error) throw error;
      
      const formattedServices = (data || []).map(bs => ({
        id: bs.id,
        service_id: bs.service_id,
        price: bs.price,
        service: bs.services as unknown as Service
      }));
      
      setBookingServices(formattedServices);
    } catch (error) {
      console.error('Error fetching booking services:', error);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceToAdd(serviceId);
    const service = allServices.find(s => s.id === serviceId);
    if (service) {
      setCustomServicePrice(service.price_from.toString());
    }
  };

  // Submit addon request (staff) or directly add (admin)
  const handleRequestAddon = async () => {
    if (!selectedBooking || !selectedServiceToAdd || !user) return;
    
    const service = allServices.find(s => s.id === selectedServiceToAdd);
    if (!service) return;
    
    const price = parseFloat(customServicePrice) || service.price_from;
    
    // If admin, directly add the service
    if (isAdmin) {
      try {
        const { error } = await supabase
          .from('booking_services')
          .insert({
            booking_id: selectedBooking.id,
            service_id: selectedServiceToAdd,
            price: price
          });

        if (error) throw error;
        
        toast({
          title: 'Service Added',
          description: `Added ${service.title} to booking (R${price.toLocaleString()})`,
        });
        
        setSelectedServiceToAdd('');
        setCustomServicePrice('');
        fetchBookingServices(selectedBooking.id);
      } catch (error) {
        console.error('Error adding service:', error);
        toast({
          title: 'Error',
          description: 'Failed to add service',
          variant: 'destructive',
        });
      }
      return;
    }
    
    // Staff: Submit as request for admin approval
    setSubmittingRequest(true);
    try {
      const { error } = await supabase
        .from('addon_requests')
        .insert({
          booking_id: selectedBooking.id,
          service_id: selectedServiceToAdd,
          requested_price: price,
          requested_by: user.id
        });

      if (error) throw error;
      
      toast({
        title: 'Request Submitted',
        description: `Request for ${service.title} (R${price.toLocaleString()}) sent to admin for approval`,
      });
      
      setSelectedServiceToAdd('');
      setCustomServicePrice('');
      fetchAddonRequests(selectedBooking.id);
    } catch (error) {
      console.error('Error submitting addon request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Fetch addon requests for a booking
  const fetchAddonRequests = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('addon_requests')
        .select(`
          *,
          services:service_id (id, title, color)
        `)
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddonRequests(data || []);
    } catch (error) {
      console.error('Error fetching addon requests:', error);
    }
  };

  // Fetch all pending requests (for admin view)
  const fetchPendingRequests = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from('addon_requests')
        .select(`
          *,
          services:service_id (id, title, color),
          bookings:booking_id (
            id,
            vehicles (make, model)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Admin: Approve addon request
  const handleApproveRequest = async (request: any) => {
    if (!isAdmin || !user) return;
    
    try {
      // Add the service to booking
      const { error: addError } = await supabase
        .from('booking_services')
        .insert({
          booking_id: request.booking_id,
          service_id: request.service_id,
          price: request.requested_price
        });

      if (addError) throw addError;

      // Update request status
      const { error: updateError } = await supabase
        .from('addon_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;
      
      toast({
        title: 'Request Approved',
        description: `${request.services?.title} added to booking`,
      });
      
      fetchPendingRequests();
      if (selectedBooking) {
        fetchBookingServices(selectedBooking.id);
        fetchAddonRequests(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    }
  };

  // Admin: Reject addon request
  const handleRejectRequest = async (requestId: string) => {
    if (!isAdmin || !user) return;
    
    try {
      const { error } = await supabase
        .from('addon_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'Time not available - please rebook for later'
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast({
        title: 'Request Rejected',
        description: 'Client will need to rebook for a later time',
      });
      
      setRejectingRequestId(null);
      setRejectionReason('');
      fetchPendingRequests();
      if (selectedBooking) {
        fetchAddonRequests(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveService = async (bookingServiceId: string, serviceName: string) => {
    if (!selectedBooking) return;
    
    try {
      const { error } = await supabase
        .from('booking_services')
        .delete()
        .eq('id', bookingServiceId);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Removed ${serviceName} from booking`,
      });
      
      fetchBookingServices(selectedBooking.id);
    } catch (error) {
      console.error('Error removing service:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove service',
        variant: 'destructive',
      });
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    fetchBookingStages(booking.id);
    fetchBookingServices(booking.id);
    fetchAddonRequests(booking.id);
  };

  const handleDownloadInvoice = () => {
    if (!selectedBooking) return;
    
    const services = bookingServices.map(bs => ({
      title: bs.service?.title || '',
      price: bs.price
    }));
    
    // If no services in booking_services, use the primary service
    if (services.length === 0 && selectedBooking.services) {
      services.push({
        title: selectedBooking.services.title,
        price: selectedBooking.payment_amount || 0
      });
    }
    
    generateBookingInvoice(
      selectedBooking,
      selectedBooking.profiles || {},
      services
    );
    
    toast({
      title: 'Success',
      description: 'Invoice downloaded',
    });
  };

  const handleCloseDialog = () => {
    setSelectedBooking(null);
    setBookingStages([]);
    setStageNotes({});
    setStageImages({});
    setUploadingImages({});
    setBookingServices([]);
    setSelectedServiceToAdd('');
    setCustomServicePrice('');
    setAddonRequests([]);
    setRejectingRequestId(null);
    setRejectionReason('');
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

  // Admin function to edit stage timestamps
  const handleEditTimestamp = async (stageId: string, newStartedAt: string) => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('booking_stages')
        .update({ started_at: newStartedAt })
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Timestamp updated',
      });
      
      setEditingTimestamp(null);
      setEditStartedAt('');
      setEditStartedAtTime('');
      
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timestamp',
        variant: 'destructive',
      });
    }
  };

  const openTimestampEditor = (stageId: string, currentStartedAt: string | null) => {
    if (!isAdmin) return;
    setEditingTimestamp(stageId);
    if (currentStartedAt) {
      const date = new Date(currentStartedAt);
      setEditStartedAt(date.toISOString().split('T')[0]);
      setEditStartedAtTime(date.toTimeString().slice(0, 5));
    } else {
      const now = new Date();
      setEditStartedAt(now.toISOString().split('T')[0]);
      setEditStartedAtTime(now.toTimeString().slice(0, 5));
    }
  };

  // Get service color by service ID
  const getServiceColor = (serviceId: string): string => {
    const service = allServices.find(s => s.id === serviceId);
    return service?.color || '#6b7280';
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
    const legacyLabels: Record<string, string> = {
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
    return legacyLabels[stage] || stage;
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
      <div className="min-h-screen bg-background staff-theme">
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
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">Bookings Management</h1>
          {canCreateBooking && (
            <Button onClick={() => setCreateBookingOpen(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>

        {/* Admin: Pending Add-on Requests Alert */}
        {isAdmin && pendingRequests.length > 0 && (
          <div className="mb-4 sm:mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-amber-800 dark:text-amber-200">
                    {pendingRequests.length} Pending Add-on Request{pendingRequests.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Staff requested additional services - review and approve or reject</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-3 w-3 rounded-full shrink-0" 
                      style={{ backgroundColor: request.services?.color || '#6b7280' }}
                    />
                    <div>
                      <span className="font-medium">{request.services?.title}</span>
                      <span className="text-muted-foreground ml-2">R{request.requested_price?.toLocaleString()}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      for {request.bookings?.vehicles?.make} {request.bookings?.vehicles?.model}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleApproveRequest(request)}
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectingRequestId(request.id);
                        handleRejectRequest(request.id);
                      }}
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                </div>
              ))}
              {pendingRequests.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{pendingRequests.length - 5} more pending requests
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4">
          {bookings.map((booking) => (
            <ChromeSurface key={booking.id} className="p-3 sm:p-4 md:p-6 relative overflow-hidden">
              {/* Service color indicator bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: booking.services?.color || getServiceColor(booking.service_id) }}
              />
              <div className="flex flex-col gap-3 sm:gap-4 pl-2">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold">
                      {booking.profiles?.full_name || 'Unknown Client'}
                    </h3>
                    <StatusBadge status={booking.status} />
                    {getPriorityBadge(booking.priority)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span 
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: booking.services?.color || getServiceColor(booking.service_id) }}
                    >
                      {booking.services?.title || 'No Service'}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {booking.vehicles?.make} {booking.vehicles?.model} ({booking.vehicles?.year})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span>📅 {new Date(booking.booking_date).toLocaleDateString()}</span>
                    {booking.booking_time && <span>🕐 {booking.booking_time}</span>}
                    {booking.profiles?.phone && <span className="hidden sm:inline">📞 {booking.profiles.phone}</span>}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    <Select
                      value={booking.priority || 'normal'}
                      onValueChange={(value) => handleUpdatePriority(booking.id, value)}
                    >
                      <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs sm:text-sm">
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
                      <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs sm:text-sm">
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
                  </div>

                  <Button onClick={() => handleViewBooking(booking)} size="sm" className="w-full sm:w-auto h-9">
                    View Details
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">ETA:</span>
                  </div>
                  <Input
                    type="date"
                    value={booking.estimated_completion || ''}
                    onChange={(e) => handleUpdateETA(booking.id, e.target.value)}
                    className="w-full sm:w-48 h-9 text-sm"
                  />
                </div>
              </div>
            </ChromeSurface>
          ))}
        </div>

        {/* Stage Management Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-2 sm:mx-auto">
            <DialogHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-base sm:text-lg md:text-xl">
                  Booking - {selectedBooking?.profiles?.full_name}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Manage stages, upload images, and update status
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleDownloadInvoice}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Download Invoice</span>
                <span className="sm:hidden">Invoice</span>
              </Button>
            </DialogHeader>

            {selectedBooking && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="font-medium">Primary Service:</span> {selectedBooking.services?.title}
                  </div>
                  <div>
                    <span className="font-medium">Vehicle:</span>{' '}
                    {selectedBooking.vehicles?.make} {selectedBooking.vehicles?.model}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                </div>

                {/* Services & Add-ons Section */}
                <div className="space-y-4 p-4 sm:p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border-2 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold">Services & Add-ons</h3>
                        <p className="text-xs text-muted-foreground">Add extra services to this booking</p>
                      </div>
                    </div>
                    {bookingServices.length > 0 && (
                      <div className="text-lg sm:text-xl font-bold text-primary">
                        R{bookingServices.reduce((sum, bs) => sum + bs.price, 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  {/* Current Services */}
                  {bookingServices.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Services</span>
                      <div className="flex flex-wrap gap-2">
                        {bookingServices.map((bs) => (
                          <Badge 
                            key={bs.id} 
                            variant="secondary" 
                            className="gap-2 py-2 px-4 text-sm"
                            style={{ 
                              borderLeft: `4px solid ${getServiceColor(bs.service_id)}`,
                              backgroundColor: `${getServiceColor(bs.service_id)}15`
                            }}
                          >
                            <span className="font-medium">{bs.service?.title}</span>
                            <span className="text-muted-foreground">R{bs.price.toLocaleString()}</span>
                            <button
                              onClick={() => handleRemoveService(bs.id, bs.service?.title)}
                              className="ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add New Service */}
                  <div className="space-y-2 pt-2 border-t border-primary/10">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add New Service</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Select value={selectedServiceToAdd} onValueChange={handleServiceSelect}>
                        <SelectTrigger className="flex-1 h-11 text-sm bg-background">
                          <SelectValue placeholder="Select add-on service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allServices
                            .filter(s => !bookingServices.some(bs => bs.service_id === s.id))
                            .map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-3 w-3 rounded-full shrink-0" 
                                    style={{ backgroundColor: service.color || '#6b7280' }}
                                  />
                                  <span>{service.title}</span>
                                  <span className="text-muted-foreground">- R{service.price_from.toLocaleString()}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedServiceToAdd && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">Price:</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium">R</span>
                            <Input
                              type="number"
                              value={customServicePrice}
                              onChange={(e) => setCustomServicePrice(e.target.value)}
                              className="w-32 h-11 pl-7 text-sm font-medium bg-background"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={handleRequestAddon}
                        disabled={!selectedServiceToAdd || submittingRequest}
                        size="lg"
                        className="gap-2 h-11 px-6"
                      >
                        {submittingRequest ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : isAdmin ? (
                          <Plus className="h-5 w-5" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                        {isAdmin ? 'Add Service' : 'Request Add-on'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pending Add-on Requests for this booking */}
                {addonRequests.filter(r => r.status === 'pending').length > 0 && (
                  <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <h3 className="text-base font-bold text-amber-800 dark:text-amber-200">Pending Requests</h3>
                    </div>
                    <div className="space-y-2">
                      {addonRequests.filter(r => r.status === 'pending').map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div 
                              className="h-3 w-3 rounded-full shrink-0" 
                              style={{ backgroundColor: request.services?.color || '#6b7280' }}
                            />
                            <span className="font-medium">{request.services?.title}</span>
                            <span className="text-muted-foreground">R{request.requested_price?.toLocaleString()}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => handleApproveRequest(request)}
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              {rejectingRequestId === request.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder="Reason (optional)"
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="h-8 w-40 text-sm"
                                  />
                                  <Button
                                    onClick={() => handleRejectRequest(request.id)}
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    onClick={() => setRejectingRequestId(null)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => setRejectingRequestId(request.id)}
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          )}
                          {!isAdmin && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting Approval
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approved/Rejected Requests History */}
                {addonRequests.filter(r => r.status !== 'pending').length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request History</span>
                    <div className="flex flex-wrap gap-2">
                      {addonRequests.filter(r => r.status !== 'pending').map((request) => (
                        <Badge 
                          key={request.id} 
                          variant="outline"
                          className={request.status === 'approved' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {request.status === 'approved' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {request.services?.title} - {request.status === 'approved' ? 'Approved' : 'Rejected'}
                          {request.rejection_reason && (
                            <span className="ml-1 text-xs">({request.rejection_reason})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold">Process Stages</h3>
                  
                  {bookingStages.map((stage, index) => (
                    <ChromeSurface
                      key={stage.id}
                      className={`p-3 sm:p-4 ${
                        stage.completed
                          ? 'bg-green-50 dark:bg-green-950 border-green-300'
                          : stage.started_at
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-300'
                          : 'bg-card'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-muted text-xs sm:text-sm font-medium shrink-0">
                              {index + 1}
                            </span>
                            <h4 className="font-semibold text-sm sm:text-base truncate">{getStageLabel(stage.stage)}</h4>
                          </div>

                          <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
                            {stage.completed && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                <span className="truncate">Done {new Date(stage.completed_at!).toLocaleDateString()}</span>
                              </span>
                            )}
                            {stage.started_at && !stage.completed && (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-blue-600">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                  <span className="truncate">Started {new Date(stage.started_at).toLocaleString()}</span>
                                </span>
                                {isAdmin && (
                                  <Popover open={editingTimestamp === stage.id} onOpenChange={(open) => !open && setEditingTimestamp(null)}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openTimestampEditor(stage.id, stage.started_at)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="start">
                                      <div className="space-y-2">
                                        <div className="text-xs font-medium">Edit Started At (Admin)</div>
                                        <div className="flex gap-2">
                                          <Input
                                            type="date"
                                            value={editStartedAt}
                                            onChange={(e) => setEditStartedAt(e.target.value)}
                                            className="w-36 h-8 text-xs"
                                          />
                                          <Input
                                            type="time"
                                            value={editStartedAtTime}
                                            onChange={(e) => setEditStartedAtTime(e.target.value)}
                                            className="w-24 h-8 text-xs"
                                          />
                                        </div>
                                        <Button
                                          size="sm"
                                          className="w-full h-7 text-xs"
                                          onClick={() => {
                                            const newDateTime = new Date(`${editStartedAt}T${editStartedAtTime}`);
                                            handleEditTimestamp(stage.id, newDateTime.toISOString());
                                          }}
                                        >
                                          Save
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
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
                              className="mt-2 sm:mt-3 text-sm"
                              rows={2}
                            />
                          )}

                          {/* Image Upload Section */}
                          {stage.started_at && !stage.completed && (
                            <div className="mt-3 sm:mt-4">
                              <label className="text-xs sm:text-sm font-medium mb-2 block">Progress Images</label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePhotoUpload(stage.id, file);
                                  }}
                                  disabled={uploadingImages[stage.id]}
                                  className="flex-1 text-sm"
                                />
                                {uploadingImages[stage.id] && (
                                  <span className="text-xs text-muted-foreground">Uploading...</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Display Images */}
                          {stageImages[stage.id] && stageImages[stage.id].length > 0 && (
                            <div className="mt-3 sm:mt-4">
                              <div className="text-xs sm:text-sm font-medium mb-2">Uploaded Images</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                {stageImages[stage.id].map((img) => (
                                  <div key={img.id} className="relative group">
                                    <img
                                      src={img.image_url}
                                      alt="Progress"
                                      className="w-full h-20 sm:h-24 md:h-32 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(img.image_url, '_blank')}
                                      title="Click to view full size"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col gap-2 sm:ml-2 shrink-0">
                          {!stage.started_at && !stage.completed && (
                            <Button
                              onClick={() => handleStartStage(stage.id, stage.stage)}
                              size="sm"
                              className="gap-1 flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                              Start
                            </Button>
                          )}
                          
                          {stage.started_at && !stage.completed && (
                            <Button
                              onClick={() => handleCompleteStage(stage.id, stage.stage)}
                              size="sm"
                              variant="default"
                              className="gap-1 flex-1 sm:flex-none h-8 sm:h-9 text-xs sm:text-sm"
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
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
        {/* Create Booking Dialog */}
        {canCreateBooking && (
          <CreateBookingDialog
            open={createBookingOpen}
            onOpenChange={setCreateBookingOpen}
            onSuccess={fetchBookings}
          />
        )}
      </div>
    </div>
  );
}
