import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Car, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";
import { AddVehicleDialog } from "@/components/garage/AddVehicleDialog";

const Garage = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadVehicles();
    }
  }, [user]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="chrome-label text-primary">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="chrome-title text-4xl mb-2">MY GARAGE</h1>
            <p className="text-text-secondary">Manage your vehicle collection</p>
          </div>
          <AddVehicleDialog onVehicleAdded={loadVehicles} trigger={
            <ChromeButton>
              <Plus className="mr-2 w-4 h-4" strokeWidth={1.4} />
              Add Vehicle
            </ChromeButton>
          } />
        </div>

        {vehicles.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Car className="w-16 h-16 text-primary/30 mx-auto mb-4" strokeWidth={1.4} />
            <h3 className="chrome-label text-foreground mb-2">NO VEHICLES YET</h3>
            <p className="text-text-secondary mb-6">Add your first vehicle to get started</p>
            <AddVehicleDialog onVehicleAdded={loadVehicles} trigger={
              <ChromeButton>
                <Plus className="mr-2 w-4 h-4" strokeWidth={1.4} />
                Add Vehicle
              </ChromeButton>
            } />
          </ChromeSurface>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {vehicles.map((vehicle) => (
              <ChromeSurface key={vehicle.id} className="overflow-hidden chrome-sheen" glow>
                {/* Vehicle Image */}
                {vehicle.image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={vehicle.image_url} 
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted/30 flex items-center justify-center">
                    <Car className="w-12 h-12 text-muted-foreground/30" strokeWidth={1.4} />
                  </div>
                )}
                
                {/* Vehicle Details */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg chrome-surface">
                      <Car className="w-6 h-6 text-primary" strokeWidth={1.4} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-light text-foreground mb-1">
                        {vehicle.year} {vehicle.make}
                      </h3>
                      <div className="chrome-label text-[10px] text-text-secondary mb-3">{vehicle.model}</div>
                      <div className="space-y-1 text-sm text-text-secondary">
                        {vehicle.color && (
                          <div className="flex items-center justify-between">
                            <span className="text-text-tertiary">Color:</span>
                            <span>{vehicle.color}</span>
                          </div>
                        )}
                        {vehicle.vin && (
                          <div className="flex items-center justify-between">
                            <span className="text-text-tertiary">VIN:</span>
                            <span className="font-mono text-xs">{vehicle.vin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Garage;