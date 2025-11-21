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

  const handleUpdateStage = async (stageId: string, completed: boolean) => {
    const { error } = await supabase
      .from('booking_stages')
      .update({ 
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        notes: updateNotes 
      })
      .eq('id', stageId);

    if (!error) {
      toast({ title: 'Stage updated successfully' });
      if (selectedBooking) {
        await fetchBookingStages(selectedBooking.id);
      }
      setUpdateNotes('');
    }
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
                      <div key={stage.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{stage.stage}</span>
                            {stage.completed && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStage(stage.id, !stage.completed)}
                          >
                            {stage.completed ? 'Mark Incomplete' : 'Mark Complete'}
                          </Button>
                        </div>
                        {stage.notes && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {stage.notes}
                          </div>
                        )}
                        {!stage.completed && (
                          <div className="mt-3">
                            <Textarea
                              placeholder="Add notes..."
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
