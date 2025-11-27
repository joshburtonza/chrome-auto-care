import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, CheckCircle } from 'lucide-react';

export default function StaffBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingStages, setBookingStages] = useState<any[]>([]);
  const [updateNotes, setUpdateNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, services(title), profiles(full_name, phone), vehicles(make, model, year)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookings(data);
    }
  };

  const fetchBookingStages = async (bookingId: string) => {
    const { data } = await supabase
      .from('booking_stages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (data) {
      setBookingStages(data);
    }
  };

  const handleViewBooking = async (booking: any) => {
    setSelectedBooking(booking);
    await fetchBookingStages(booking.id);
    
    // Auto-create stages if they don't exist
    const { data: existingStages } = await supabase
      .from('booking_stages')
      .select('id')
      .eq('booking_id', booking.id);
    
    if (!existingStages || existingStages.length === 0) {
      await createDefaultStages(booking.id);
      await fetchBookingStages(booking.id);
    }
  };

  const createDefaultStages = async (bookingId: string) => {
    // Note: Stages are now auto-created by database trigger
    // This function is kept for backwards compatibility but stages should exist
    type StageType = 'vehicle_checkin' | 'stripping' | 'surface_prep' | 'paint_correction' | 'ppf_installation' | 'reassembly' | 'qc1' | 'final_detail' | 'qc2' | 'delivery_prep';
    
    const stages: Array<{
      booking_id: string;
      stage: StageType;
      stage_order: number;
      completed: boolean;
    }> = [
      { booking_id: bookingId, stage: 'vehicle_checkin' as StageType, stage_order: 1, completed: false },
      { booking_id: bookingId, stage: 'stripping' as StageType, stage_order: 2, completed: false },
      { booking_id: bookingId, stage: 'surface_prep' as StageType, stage_order: 3, completed: false },
      { booking_id: bookingId, stage: 'paint_correction' as StageType, stage_order: 4, completed: false },
      { booking_id: bookingId, stage: 'ppf_installation' as StageType, stage_order: 5, completed: false },
      { booking_id: bookingId, stage: 'reassembly' as StageType, stage_order: 6, completed: false },
      { booking_id: bookingId, stage: 'qc1' as StageType, stage_order: 7, completed: false },
      { booking_id: bookingId, stage: 'final_detail' as StageType, stage_order: 8, completed: false },
      { booking_id: bookingId, stage: 'qc2' as StageType, stage_order: 9, completed: false },
      { booking_id: bookingId, stage: 'delivery_prep' as StageType, stage_order: 10, completed: false },
    ];

    await supabase.from('booking_stages').insert(stages);
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (!error) {
      toast({ title: 'Status updated successfully' });
      fetchBookings();
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking({ ...selectedBooking, status: newStatus });
      }
    }
  };

  const handleUpdateStage = async (stageId: string, stageName: any, completed: boolean) => {
    const { error } = await supabase
      .from('booking_stages')
      .update({ 
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        notes: updateNotes || undefined
      })
      .eq('id', stageId);

    if (!error) {
      // Update booking current_stage
      if (completed && selectedBooking) {
        await supabase
          .from('bookings')
          .update({ current_stage: stageName })
          .eq('id', selectedBooking.id);
      }
      
      toast({ title: 'Stage updated successfully' });
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
      setUpdateNotes('');
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

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="chrome-heading text-4xl mb-8">BOOKING MANAGEMENT</h1>

        <ChromeSurface className="p-6">
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-semibold">
                      {booking.profiles?.full_name || 'Customer'}
                    </span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {booking.services?.title} • {booking.vehicles?.year} {booking.vehicles?.make} {booking.vehicles?.model}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={booking.status}
                    onValueChange={(value) => handleUpdateStatus(booking.id, value as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled')}
                  >
                    <SelectTrigger className="w-32">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewBooking(booking)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ChromeSurface>

        {/* Booking Details Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="chrome-heading">BOOKING DETAILS</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-6">
                <div>
                  <div className="chrome-label mb-2">CUSTOMER</div>
                  <div>{selectedBooking.profiles?.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedBooking.profiles?.phone}
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-2">SERVICE & VEHICLE</div>
                  <div>{selectedBooking.services?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedBooking.vehicles?.year} {selectedBooking.vehicles?.make}{' '}
                    {selectedBooking.vehicles?.model}
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-4">BOOKING STAGES</div>
                  <div className="space-y-3">
                    {bookingStages.map((stage) => (
                      <div key={stage.id} className={`border rounded-lg p-4 ${stage.completed ? 'border-success bg-success/5' : 'border-border'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getStageLabel(stage.stage)}</span>
                            {stage.completed && (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                          </div>
                          <Button
                            variant={stage.completed ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleUpdateStage(stage.id, stage.stage, !stage.completed)}
                          >
                            {stage.completed ? 'Undo' : 'Complete'}
                          </Button>
                        </div>
                        {stage.completed_at && (
                          <div className="text-xs text-muted-foreground mb-2">
                            Completed: {new Date(stage.completed_at).toLocaleString()}
                          </div>
                        )}
                        {stage.notes && (
                          <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {stage.notes}
                          </div>
                        )}
                        {!stage.completed && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Add completion notes..."
                              value={updateNotes}
                              onChange={(e) => setUpdateNotes(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
