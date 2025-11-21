import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function StaffServices() {
  const [services, setServices] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setServices(data);
    }
  };

  const handleToggleActive = async (serviceId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !isActive })
      .eq('id', serviceId);

    if (!error) {
      toast({ title: 'Service updated successfully' });
      fetchServices();
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setShowDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="chrome-heading text-4xl">SERVICE MANAGEMENT</h1>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ChromeSurface key={service.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="chrome-label">{service.category}</div>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={() => handleToggleActive(service.id, service.is_active)}
                />
              </div>
              <h3 className="chrome-heading text-xl mb-2">{service.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {service.description}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="chrome-label text-xs">PRICE</div>
                  <div className="font-semibold">From ${service.price_from}</div>
                </div>
                <div>
                  <div className="chrome-label text-xs">DURATION</div>
                  <div className="font-semibold">{service.duration}</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleEdit(service)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </ChromeSurface>
          ))}
        </div>

        {/* Service Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="chrome-heading">
                {editingService ? 'EDIT SERVICE' : 'ADD SERVICE'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="chrome-label text-xs mb-2 block">TITLE</label>
                <Input placeholder="Service title" />
              </div>
              <div>
                <label className="chrome-label text-xs mb-2 block">DESCRIPTION</label>
                <Textarea placeholder="Service description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="chrome-label text-xs mb-2 block">PRICE FROM</label>
                  <Input type="number" placeholder="0" />
                </div>
                <div>
                  <label className="chrome-label text-xs mb-2 block">DURATION</label>
                  <Input placeholder="e.g. 2-3 hours" />
                </div>
              </div>
              <Button className="w-full">Save Service</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
