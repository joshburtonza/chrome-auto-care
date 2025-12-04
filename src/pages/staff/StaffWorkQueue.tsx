import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, User, Car, AlertTriangle, CheckCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

interface WorkQueueItem {
  id: string;
  stage: string;
  stage_order: number;
  started_at: string | null;
  completed: boolean;
  assigned_to: string | null;
  booking_id: string;
  booking: {
    id: string;
    priority: string;
    booking_date: string;
    estimated_completion: string | null;
    vehicle: {
      make: string;
      model: string;
      year: string;
      color: string | null;
    } | null;
    service: {
      title: string;
    } | null;
    profile: {
      full_name: string | null;
      phone: string | null;
    } | null;
  };
}

interface StaffMember {
  id: string;
  full_name: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  vehicle_checkin: 'Vehicle Check-in',
  stripping: 'Stripping',
  surface_prep: 'Surface Prep',
  paint_correction: 'Paint Correction',
  ppf_installation: 'PPF Installation',
  reassembly: 'Reassembly',
  qc1: 'QC 1',
  final_detail: 'Final Detail',
  qc2: 'QC 2',
  delivery_prep: 'Delivery Prep',
};

export default function StaffWorkQueue() {
  const navigate = useNavigate();
  const [workItems, setWorkItems] = useState<WorkQueueItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'mine'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchStaffMembers();
    fetchWorkQueue();

    const channel = supabase
      .channel('work-queue-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_stages' }, fetchWorkQueue)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchWorkQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchStaffMembers = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['staff', 'admin']);

    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      setStaffMembers(profiles || []);
    }
  };

  const fetchWorkQueue = async () => {
    setLoading(true);
    
    // Fetch incomplete stages with booking info
    const { data: stages, error } = await supabase
      .from('booking_stages')
      .select(`
        id,
        stage,
        stage_order,
        started_at,
        completed,
        assigned_to,
        booking_id
      `)
      .eq('completed', false)
      .order('stage_order', { ascending: true });

    if (error) {
      console.error('Error fetching work queue:', error);
      setLoading(false);
      return;
    }

    if (!stages || stages.length === 0) {
      setWorkItems([]);
      setLoading(false);
      return;
    }

    // Fetch related bookings
    const bookingIds = [...new Set(stages.map(s => s.booking_id))];
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        priority,
        booking_date,
        estimated_completion,
        user_id,
        vehicle_id,
        service_id
      `)
      .in('id', bookingIds)
      .in('status', ['confirmed', 'in_progress']);

    if (!bookings) {
      setWorkItems([]);
      setLoading(false);
      return;
    }

    // Fetch vehicles, services, and profiles
    const vehicleIds = bookings.map(b => b.vehicle_id).filter(Boolean);
    const serviceIds = bookings.map(b => b.service_id);
    const userIds = bookings.map(b => b.user_id);

    const [vehiclesRes, servicesRes, profilesRes] = await Promise.all([
      supabase.from('vehicles').select('id, make, model, year, color').in('id', vehicleIds),
      supabase.from('services').select('id, title').in('id', serviceIds),
      supabase.from('profiles').select('id, full_name, phone').in('id', userIds),
    ]);

    const vehiclesMap = new Map(vehiclesRes.data?.map(v => [v.id, v]) || []);
    const servicesMap = new Map(servicesRes.data?.map(s => [s.id, s]) || []);
    const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);

    // Combine data - only show the next incomplete stage per booking
    const bookingsMap = new Map<string, typeof bookings[0]>();
    bookings.forEach(b => bookingsMap.set(b.id, b));

    // Group stages by booking and get the first incomplete one
    const stagesByBooking = new Map<string, typeof stages[0]>();
    stages.forEach(stage => {
      const booking = bookingsMap.get(stage.booking_id);
      if (!booking) return;
      
      const existing = stagesByBooking.get(stage.booking_id);
      if (!existing || stage.stage_order < existing.stage_order) {
        stagesByBooking.set(stage.booking_id, stage);
      }
    });

    const items: WorkQueueItem[] = Array.from(stagesByBooking.values()).map(stage => {
      const booking = bookingsMap.get(stage.booking_id)!;
      return {
        ...stage,
        booking: {
          id: booking.id,
          priority: booking.priority || 'normal',
          booking_date: booking.booking_date,
          estimated_completion: booking.estimated_completion,
          vehicle: vehiclesMap.get(booking.vehicle_id!) || null,
          service: servicesMap.get(booking.service_id) || null,
          profile: profilesMap.get(booking.user_id) || null,
        },
      };
    });

    // Sort by priority then by stage order
    items.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2 };
      const aPriority = priorityOrder[a.booking.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[b.booking.priority as keyof typeof priorityOrder] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.stage_order - b.stage_order;
    });

    setWorkItems(items);
    setLoading(false);
  };

  const handleAssign = async (stageId: string, staffId: string | null) => {
    const { error } = await supabase
      .from('booking_stages')
      .update({ assigned_to: staffId })
      .eq('id', stageId);

    if (error) {
      toast.error('Failed to assign task');
    } else {
      toast.success('Task assigned');
      fetchWorkQueue();
    }
  };

  const handleStartStage = async (stageId: string) => {
    const { error } = await supabase
      .from('booking_stages')
      .update({ started_at: new Date().toISOString() })
      .eq('id', stageId);

    if (error) {
      toast.error('Failed to start stage');
    } else {
      toast.success('Stage started');
    }
  };

  const filteredItems = workItems.filter(item => {
    if (filter === 'unassigned') return !item.assigned_to;
    if (filter === 'mine') return item.assigned_to === currentUserId;
    return true;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" /> High</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getDuration = (startedAt: string | null) => {
    if (!startedAt) return null;
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-2 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Work Queue</h1>
          <p className="text-sm text-muted-foreground">
            {filteredItems.length} tasks pending
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4 sm:mb-6">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">
              All ({workItems.length})
            </TabsTrigger>
            <TabsTrigger value="unassigned" className="text-xs sm:text-sm px-2 py-2">
              Open ({workItems.filter(i => !i.assigned_to).length})
            </TabsTrigger>
            <TabsTrigger value="mine" className="text-xs sm:text-sm px-2 py-2">
              Mine ({workItems.filter(i => i.assigned_to === currentUserId).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading work queue...</div>
        ) : filteredItems.length === 0 ? (
          <ChromeSurface className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
            <p className="text-muted-foreground">No pending tasks</p>
          </ChromeSurface>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredItems.map((item) => (
              <ChromeSurface key={item.id} className="p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                  {/* Priority & Stage badges */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {getPriorityBadge(item.booking.priority)}
                    <Badge variant="outline" className="text-xs">
                      {STAGE_LABELS[item.stage] || item.stage}
                    </Badge>
                    {item.started_at && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                        {getDuration(item.started_at)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Vehicle Info */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="font-medium text-sm sm:text-base leading-tight">
                        {item.booking.vehicle 
                          ? `${item.booking.vehicle.year} ${item.booking.vehicle.make} ${item.booking.vehicle.model}`
                          : 'Unknown Vehicle'}
                        {item.booking.vehicle?.color && (
                          <span className="text-muted-foreground"> ({item.booking.vehicle.color})</span>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pl-6">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.booking.profile?.full_name || 'Unknown Customer'}</span>
                      {item.booking.profile?.phone && (
                        <span className="hidden sm:inline">• {item.booking.profile.phone}</span>
                      )}
                    </div>
                    
                    <p className="text-xs sm:text-sm text-muted-foreground pl-6 truncate">
                      {item.booking.service?.title || 'Unknown Service'}
                    </p>
                  </div>

                  {/* Assignment & Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                    <Select
                      value={item.assigned_to || 'unassigned'}
                      onValueChange={(value) => handleAssign(item.id, value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || 'Unknown Staff'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      {!item.started_at && (
                        <Button
                          size="sm"
                          onClick={() => handleStartStage(item.id)}
                          className="flex-1 gap-1 h-9 text-sm"
                        >
                          <Play className="h-4 w-4" />
                          Start
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/staff/bookings?booking=${item.booking_id}`)}
                        className={`h-9 text-sm ${!item.started_at ? 'flex-1' : 'w-full'}`}
                      >
                        View Booking
                      </Button>
                    </div>
                  </div>
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}