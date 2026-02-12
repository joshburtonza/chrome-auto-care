import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/chrome/StatusBadge';
import { Eye, Car, Search, Users, Calendar, Package, UserPlus } from 'lucide-react';
import { AddWalkinClientDialog } from '@/components/staff/AddWalkinClientDialog';

export default function StaffCustomers() {
  const { user, userRole } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCustomers: 0, totalVehicles: 0, activeBookings: 0 });
  const [walkinOpen, setWalkinOpen] = useState(false);

  const canAddWalkin = userRole === 'admin' || user?.email === 'farhaan.surtie@gmail.com';

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
    setLoading(true);
    
    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    // Fetch user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Combine profiles with roles
    const customersWithRoles = profilesData?.map(profile => ({
      ...profile,
      role: rolesData?.find(r => r.user_id === profile.id)?.role || 'client'
    })) || [];

    setCustomers(customersWithRoles);
    setFilteredCustomers(customersWithRoles);
    
    // Fetch stats
    const { data: vehicles } = await supabase.from('vehicles').select('id', { count: 'exact' });
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'confirmed', 'in_progress']);
    
    setStats({
      totalCustomers: customersWithRoles.length,
      totalVehicles: vehicles?.length || 0,
      activeBookings: bookings?.length || 0,
    });
    
    setLoading(false);
  };

  useEffect(() => {
    const filtered = customers.filter((customer) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        customer.full_name?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.address?.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    });
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

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

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'limited';
      case 'confirmed': return 'available';
      case 'in_progress': return 'available';
      case 'completed': return 'full';
      case 'cancelled': return 'unavailable';
      default: return 'limited';
    }
  };

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <h1 className="chrome-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl">CUSTOMER MANAGEMENT</h1>
          {canAddWalkin && (
            <Button onClick={() => setWalkinOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Walk-In Client</span>
              <span className="sm:hidden">Walk-In</span>
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <ChromeSurface className="p-4 sm:p-5 md:p-6 chrome-sheen" glow>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 sm:w-5 md:w-6 text-primary" strokeWidth={1.4} />
              </div>
              <div>
                <div className="chrome-label text-xs sm:text-xs md:text-sm">TOTAL CUSTOMERS</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-light mt-1">{stats.totalCustomers}</div>
              </div>
            </div>
          </ChromeSurface>

          <ChromeSurface className="p-4 sm:p-5 md:p-6 chrome-sheen" glow>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Car className="w-5 h-5 sm:w-5 md:w-6 text-primary" strokeWidth={1.4} />
              </div>
              <div>
                <div className="chrome-label text-xs sm:text-xs md:text-sm">TOTAL VEHICLES</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-light mt-1">{stats.totalVehicles}</div>
              </div>
            </div>
          </ChromeSurface>

          <ChromeSurface className="p-4 sm:p-5 md:p-6 chrome-sheen" glow>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 sm:w-5 md:w-6 text-primary" strokeWidth={1.4} />
              </div>
              <div>
                <div className="chrome-label text-xs sm:text-xs md:text-sm">ACTIVE BOOKINGS</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-light mt-1">{stats.activeBookings}</div>
              </div>
            </div>
          </ChromeSurface>
        </div>

        {/* Search */}
        <ChromeSurface className="p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-text-tertiary" strokeWidth={1.4} />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-12 bg-background/50 text-sm sm:text-base md:text-lg"
            />
          </div>
        </ChromeSurface>

        {/* Customers List */}
        <ChromeSurface className="p-4 sm:p-5 md:p-6 lg:p-8">
          {loading ? (
            <div className="text-center py-8 sm:py-12 md:py-16">
              <div className="chrome-label text-xs sm:text-sm md:text-base">LOADING CUSTOMERS...</div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 sm:py-12 md:py-16">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-text-tertiary mx-auto mb-3 sm:mb-4" strokeWidth={1.4} />
              <div className="chrome-label mb-2 text-xs sm:text-sm md:text-base">NO CUSTOMERS FOUND</div>
              <p className="text-xs sm:text-sm md:text-base text-text-secondary">
                {searchQuery ? 'Try adjusting your search' : 'No customers registered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 md:space-y-5">
              {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 p-3 sm:p-4 md:p-5 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold mb-1 text-sm sm:text-base md:text-lg truncate">
                    {customer.full_name || 'No Name'}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                    {customer.phone || 'No phone'}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 line-clamp-1">
                    {customer.address || 'No address'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCustomer(customer)}
                  className="w-full sm:w-auto md:min-w-[140px] shrink-0 text-sm md:text-base"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
              ))}
            </div>
          )}
        </ChromeSurface>

        {/* Customer Details Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="chrome-heading text-lg sm:text-xl md:text-2xl">CUSTOMER DETAILS</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm md:text-base">
                View customer information, vehicles, and booking history
              </DialogDescription>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4 sm:space-y-5 md:space-y-6">
                <div>
                  <div className="chrome-label mb-2 md:mb-3 text-xs sm:text-sm md:text-base">CONTACT INFORMATION</div>
                  <div className="space-y-1 md:space-y-2">
                    <div className="font-semibold text-sm sm:text-base md:text-lg">{selectedCustomer.full_name}</div>
                    <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                      {selectedCustomer.phone}
                    </div>
                    <div className="text-xs sm:text-sm md:text-base text-muted-foreground break-words">
                      {selectedCustomer.address}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-3 md:mb-4 text-xs sm:text-sm md:text-base">VEHICLES ({customerVehicles.length})</div>
                  <div className="space-y-2 md:space-y-3">
                    {customerVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="flex items-start gap-3 md:gap-4 p-3 md:p-4 border border-border rounded-lg"
                      >
                        <Car className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm sm:text-base md:text-lg">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </div>
                          <div className="text-xs sm:text-sm md:text-base text-muted-foreground">
                            {vehicle.color} • {vehicle.vin || 'No VIN'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-3 md:mb-4 text-xs sm:text-sm md:text-base">
                    BOOKING HISTORY ({customerBookings.length})
                  </div>
                  {customerBookings.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 md:py-10 text-xs sm:text-sm md:text-base text-text-secondary">
                      No booking history
                    </div>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {customerBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 md:p-4 border border-border rounded-lg"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <span className="font-semibold text-sm sm:text-base md:text-lg">
                              {booking.services?.title}
                            </span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <div className="text-xs sm:text-sm md:text-base text-text-secondary">
                            {new Date(booking.booking_date).toLocaleDateString()} at{' '}
                            {booking.booking_time}
                          </div>
                          {booking.notes && (
                            <div className="text-xs sm:text-sm md:text-base text-text-tertiary mt-2 pt-2 border-t border-border break-words">
                              {booking.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Walk-In Client Dialog */}
        {canAddWalkin && (
          <AddWalkinClientDialog
            open={walkinOpen}
            onOpenChange={setWalkinOpen}
            onSuccess={fetchCustomers}
          />
        )}
      </div>
    </div>
  );
}
