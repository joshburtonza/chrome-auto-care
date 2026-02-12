import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CalendarPlus, Search } from 'lucide-react';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  color: string | null;
}

interface Service {
  id: string;
  title: string;
  price_from: number;
  category: string;
}

export function CreateBookingDialog({ open, onOpenChange, onSuccess }: CreateBookingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [vehicleId, setVehicleId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [priority, setPriority] = useState('normal');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchServices();
      // Set default date to today
      setBookingDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomers(customers.slice(0, 20));
      return;
    }
    const q = customerSearch.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      ).slice(0, 20)
    );
  }, [customerSearch, customers]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchVehicles(selectedCustomerId);
    } else {
      setVehicles([]);
      setVehicleId('');
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (serviceId) {
      const svc = services.find((s) => s.id === serviceId);
      if (svc && !paymentAmount) {
        setPaymentAmount(svc.price_from.toString());
      }
    }
  }, [serviceId]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .order('full_name');
    setCustomers(data || []);
  };

  const fetchVehicles = async (userId: string) => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year, color')
      .eq('user_id', userId);
    setVehicles(data || []);
    if (data && data.length === 1) setVehicleId(data[0].id);
  };

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, title, price_from, category')
      .eq('is_active', true)
      .order('title');
    setServices(data || []);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.full_name || 'Unknown');
    setCustomerSearch('');
  };

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setCustomerSearch('');
    setVehicleId('');
    setServiceId('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('09:00');
    setPriority('normal');
    setPaymentStatus('pending');
    setPaymentAmount('');
    setNotes('');
    setVehicles([]);
  };

  const handleCreate = async () => {
    if (!selectedCustomerId || !serviceId || !bookingDate) {
      toast({ title: 'Error', description: 'Customer, service, and date are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Insert booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: selectedCustomerId,
          service_id: serviceId,
          vehicle_id: vehicleId || null,
          booking_date: bookingDate,
          booking_time: bookingTime || null,
          status: 'confirmed',
          priority,
          payment_status: paymentStatus,
          payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
          notes: notes.trim() || null,
        })
        .select('id')
        .single();

      if (bookingError) throw bookingError;

      // Also insert into booking_services
      const svc = services.find((s) => s.id === serviceId);
      if (svc && booking) {
        await supabase.from('booking_services').insert({
          booking_id: booking.id,
          service_id: serviceId,
          price: paymentAmount ? parseFloat(paymentAmount) : svc.price_from,
        });
      }

      toast({
        title: 'Booking Created',
        description: `Booking for ${selectedCustomerName} confirmed`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Create Booking
          </DialogTitle>
          <DialogDescription>Create a booking for an existing customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Selection */}
          <div>
            <Label>Customer *</Label>
            {selectedCustomerId ? (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                <span className="font-medium">{selectedCustomerName}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomerId(''); setSelectedCustomerName(''); setVehicleId(''); }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                      >
                        <span className="font-medium">{c.full_name || 'No Name'}</span>
                        {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vehicle */}
          {selectedCustomerId && (
            <div>
              <Label>Vehicle</Label>
              {vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No vehicles registered</p>
              ) : (
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} {v.color ? `(${v.color})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Service */}
          <div>
            <Label>Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} — from R{s.price_from.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
            </div>
          </div>

          {/* Priority & Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid (Cash/EFT)</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label>Payment Amount (R)</Label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
            Create Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
