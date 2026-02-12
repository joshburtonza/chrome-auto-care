import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, UserPlus, Car } from 'lucide-react';

interface AddWalkinClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddWalkinClientDialog({ open, onOpenChange, onSuccess }: AddWalkinClientDialogProps) {
  const [step, setStep] = useState<'customer' | 'vehicle'>('customer');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  // Customer fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Vehicle fields
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');

  const resetForm = () => {
    setStep('customer');
    setLoading(false);
    setCustomerId(null);
    setCustomerName('');
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setVehicleColor('');
    setVehicleVin('');
  };

  const handleCreateCustomer = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Error', description: 'Full name is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-walkin-customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create customer');
      }

      setCustomerId(result.customer_id);
      setCustomerName(fullName.trim());
      setStep('vehicle');

      toast({
        title: result.existing ? 'Customer Found' : 'Customer Created',
        description: result.existing
          ? `${fullName} already exists — details updated`
          : `${fullName} has been added as a walk-in client`,
      });
    } catch (error: any) {
      console.error('Error creating walk-in customer:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!customerId || !vehicleMake.trim() || !vehicleModel.trim() || !vehicleYear.trim()) {
      toast({ title: 'Error', description: 'Make, model, and year are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('vehicles').insert({
        user_id: customerId,
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        year: vehicleYear.trim(),
        color: vehicleColor.trim() || null,
        vin: vehicleVin.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Vehicle Added',
        description: `${vehicleYear} ${vehicleMake} ${vehicleModel} added for ${customerName}`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding vehicle:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVehicle = () => {
    onSuccess();
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'customer' ? (
              <><UserPlus className="h-5 w-5" /> Add Walk-In Client</>
            ) : (
              <><Car className="h-5 w-5" /> Add Vehicle</>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'customer'
              ? 'Create a new walk-in customer account'
              : `Add a vehicle for ${customerName}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'customer' ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="walkin-name">Full Name *</Label>
              <Input id="walkin-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label htmlFor="walkin-phone">Phone</Label>
              <Input id="walkin-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="072 123 4567" />
            </div>
            <div>
              <Label htmlFor="walkin-email">Email (optional)</Label>
              <Input id="walkin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Leave blank for walk-in" />
            </div>
            <div>
              <Label htmlFor="walkin-address">Address</Label>
              <Input id="walkin-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
            </div>
            <Button onClick={handleCreateCustomer} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create Customer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-make">Make *</Label>
                <Input id="v-make" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="BMW" />
              </div>
              <div>
                <Label htmlFor="v-model">Model *</Label>
                <Input id="v-model" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="M3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-year">Year *</Label>
                <Input id="v-year" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="2024" />
              </div>
              <div>
                <Label htmlFor="v-color">Color</Label>
                <Input id="v-color" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="Black" />
              </div>
            </div>
            <div>
              <Label htmlFor="v-vin">VIN (optional)</Label>
              <Input id="v-vin" value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value)} placeholder="Optional" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipVehicle} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleAddVehicle} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Car className="h-4 w-4 mr-2" />}
                Add Vehicle
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
