import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Car } from 'lucide-react';

export default function StaffCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();

    // Subscribe to profiles changes
    const profilesChannel = supabase
      .channel('staff-customers-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log('Profiles changed, refreshing customers...');
          fetchCustomers();
        }
      )
      .subscribe();

    // Subscribe to vehicles changes
    const vehiclesChannel = supabase
      .channel('staff-customers-vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        () => {
          console.log('Vehicles changed, refreshing customers...');
          fetchCustomers();
        }
      )
      .subscribe();

    // Subscribe to bookings changes
    const bookingsChannel = supabase
      .channel('staff-customers-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Bookings changed, refreshing customers...');
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
  };

  const handleViewCustomer = async (customer: any) => {
    setSelectedCustomer(customer);

    // Fetch customer vehicles
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', customer.id);

    if (vehicles) {
      setCustomerVehicles(vehicles);
    }

    // Fetch customer bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, services(title)')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false });

    if (bookings) {
      setCustomerBookings(bookings);
    }
  };

  const handleCloseDialog = () => {
    setSelectedCustomer(null);
    setCustomerVehicles([]);
    setCustomerBookings([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8">
        <h1 className="chrome-heading text-4xl mb-8">CUSTOMER MANAGEMENT</h1>

        <ChromeSurface className="p-6">
          <div className="space-y-4">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold mb-1">
                    {customer.full_name || 'No Name'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customer.phone || 'No phone'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {customer.address || 'No address'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCustomer(customer)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </ChromeSurface>

        {/* Customer Details Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="chrome-heading">CUSTOMER DETAILS</DialogTitle>
              <DialogDescription>
                View customer information, vehicles, and booking history
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-6">
                <div>
                  <div className="chrome-label mb-2">CONTACT INFORMATION</div>
                  <div className="space-y-1">
                    <div className="font-semibold">{selectedCustomer.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedCustomer.phone}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedCustomer.address}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-3">VEHICLES ({customerVehicles.length})</div>
                  <div className="space-y-2">
                    {customerVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg"
                      >
                        <Car className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {vehicle.color} • {vehicle.vin || 'No VIN'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-3">
                    BOOKING HISTORY ({customerBookings.length})
                  </div>
                  <div className="space-y-2">
                    {customerBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 border border-border rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">
                            {booking.services?.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {booking.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(booking.booking_date).toLocaleDateString()} at{' '}
                          {booking.booking_time}
                        </div>
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
