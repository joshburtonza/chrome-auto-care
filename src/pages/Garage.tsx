import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Car, Plus, Pencil, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";
import { AddVehicleDialog } from "@/components/garage/AddVehicleDialog";
import { EditVehicleDialog } from "@/components/garage/EditVehicleDialog";
import { motion } from "framer-motion";

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  color: string | null;
  vin: string | null;
  image_url: string | null;
  created_at: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const Garage = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-primary font-medium tracking-wider"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <ClientNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-5xl relative">
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                My Garage
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
              Manage your vehicle collection
            </p>
          </div>
          <AddVehicleDialog onVehicleAdded={loadVehicles} trigger={
            <ChromeButton className="w-full sm:w-auto">
              <Plus className="mr-2 w-4 h-4" strokeWidth={1.5} />
              Add Vehicle
            </ChromeButton>
          } />
        </motion.div>

        {vehicles.length === 0 ? (
          <motion.div {...fadeInUp}>
            <ChromeSurface className="p-8 sm:p-12 text-center bg-card/60 backdrop-blur-sm border-border/40">
              <Car className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No Vehicles Yet</h3>
              <p className="text-muted-foreground text-sm mb-5">Add your first vehicle to get started</p>
              <AddVehicleDialog onVehicleAdded={loadVehicles} trigger={
                <ChromeButton>
                  <Plus className="mr-2 w-4 h-4" strokeWidth={1.5} />
                  Add Vehicle
                </ChromeButton>
              } />
            </ChromeSurface>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <ChromeSurface 
                  className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/40 cursor-pointer group hover:bg-card/70 hover:border-primary/20 transition-all duration-300" 
                  onClick={() => handleVehicleClick(vehicle)}
                >
                  {/* Vehicle Image */}
                  <div className="relative">
                    {vehicle.image_url ? (
                      <div className="aspect-video w-full overflow-hidden">
                        <img 
                          src={vehicle.image_url} 
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-muted/20 flex items-center justify-center">
                        <Car className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20" strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Edit indicator */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-background/70 backdrop-blur-sm rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3 h-3 sm:w-4 sm:h-4 text-foreground" />
                    </div>
                  </div>
                  
                  {/* Vehicle Details */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Car className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-foreground mb-0.5 truncate">
                          {vehicle.year} {vehicle.make}
                        </h3>
                        <div className="text-xs text-muted-foreground mb-2">{vehicle.model}</div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {vehicle.color && (
                            <div className="flex items-center justify-between">
                              <span>Color:</span>
                              <span className="text-foreground">{vehicle.color}</span>
                            </div>
                          )}
                          {vehicle.vin && (
                            <div className="flex items-center justify-between">
                              <span>VIN:</span>
                              <span className="font-mono text-[10px] text-foreground truncate max-w-[100px]">{vehicle.vin}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/20 text-center">
                      <span className="text-[10px] text-muted-foreground">Tap to edit</span>
                    </div>
                  </div>
                </ChromeSurface>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <EditVehicleDialog
        vehicle={selectedVehicle}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onVehicleUpdated={loadVehicles}
      />
    </div>
  );
};

export default Garage;
