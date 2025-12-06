import { useEffect, useState } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function StaffServices() {
  const [services, setServices] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price_from: 0,
    duration: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();

    // Subscribe to services changes
    const servicesChannel = supabase
      .channel('staff-services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        () => {
          console.log('Services changed, refreshing...');
          fetchServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(servicesChannel);
    };
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
    setFormData({
      title: service.title,
      description: service.description,
      category: service.category,
      price_from: service.price_from,
      duration: service.duration,
    });
    setShowDialog(true);
  };

  const handleAddNew = () => {
    setEditingService(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      price_from: 0,
      duration: '',
    });
    setShowDialog(true);
  };

  const handleSaveService = async () => {
    if (!formData.title || !formData.category || formData.price_from <= 0) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (editingService) {
      // Update existing service
      const { error } = await supabase
        .from('services')
        .update(formData)
        .eq('id', editingService.id);

      if (!error) {
        toast({ title: 'Service updated successfully' });
        handleCloseDialog();
        fetchServices();
      }
    } else {
      // Create new service
      const { error } = await supabase
        .from('services')
        .insert([formData]);

      if (!error) {
        toast({ title: 'Service created successfully' });
        handleCloseDialog();
        fetchServices();
      }
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingService(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      price_from: 0,
      duration: '',
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
    }
  };

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
          <h1 className="chrome-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl">SERVICE MANAGEMENT</h1>
          <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {services.map((service) => (
            <ChromeSurface key={service.id} className="p-4 sm:p-5 md:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                <div className="chrome-label text-xs sm:text-sm truncate">{service.category}</div>
                <Switch
                  checked={service.is_active}
                  onCheckedChange={() => handleToggleActive(service.id, service.is_active)}
                />
              </div>
              <h3 className="chrome-heading text-base sm:text-lg md:text-xl mb-2">{service.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                {service.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <div className="chrome-label text-[10px] sm:text-xs">PRICE</div>
                  <div className="font-semibold text-sm sm:text-base">From R{service.price_from}</div>
                </div>
                <div className="text-right">
                  <div className="chrome-label text-[10px] sm:text-xs">DURATION</div>
                  <div className="font-semibold text-sm sm:text-base">{service.duration}</div>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-3 sm:mt-4"
                size="sm"
                onClick={() => handleEdit(service)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </ChromeSurface>
          ))}
        </div>

        {/* Service Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="mx-2 sm:mx-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="chrome-heading text-base sm:text-lg md:text-xl">
                {editingService ? 'EDIT SERVICE' : 'ADD SERVICE'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingService ? 'Update service details and pricing' : 'Create a new service offering'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="chrome-label text-xs mb-1 sm:mb-2 block">TITLE</label>
                <Input 
                  placeholder="Service title" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="chrome-label text-xs mb-1 sm:mb-2 block">CATEGORY</label>
                <Input 
                  placeholder="e.g. Tuning, Maintenance" 
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="chrome-label text-xs mb-1 sm:mb-2 block">DESCRIPTION</label>
                <Textarea 
                  placeholder="Service description" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-sm"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="chrome-label text-xs mb-1 sm:mb-2 block">PRICE FROM</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.price_from}
                    onChange={(e) => setFormData({ ...formData, price_from: parseFloat(e.target.value) })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="chrome-label text-xs mb-1 sm:mb-2 block">DURATION</label>
                  <Input 
                    placeholder="e.g. 2-3 hours" 
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={handleSaveService}>
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
