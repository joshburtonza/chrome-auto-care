import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Palette } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#6b7280', // Gray
];

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
    color: '#3b82f6',
  });
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-admin users
    if (userRole && userRole !== 'admin') {
      navigate('/staff/dashboard');
      return;
    }
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
      color: service.color || '#3b82f6',
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
      color: '#3b82f6',
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
      color: '#3b82f6',
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
            <ChromeSurface key={service.id} className="p-4 sm:p-5 md:p-6 relative overflow-hidden">
              {/* Service color indicator */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1.5"
                style={{ backgroundColor: service.color || '#6b7280' }}
              />
              <div className="pl-2">
                <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: service.color || '#6b7280' }}
                    />
                    <div className="chrome-label text-xs sm:text-sm truncate">{service.category}</div>
                  </div>
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
              </div>
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
              
              {/* Color Picker */}
              <div>
                <label className="chrome-label text-xs mb-1 sm:mb-2 block">SERVICE COLOR</label>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        size="sm"
                      >
                        <div 
                          className="w-5 h-5 rounded-full border border-border"
                          style={{ backgroundColor: formData.color }}
                        />
                        <span className="text-sm">{formData.color}</span>
                        <Palette className="w-4 h-4 ml-auto text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-3">
                        <div className="text-xs font-medium text-muted-foreground">Preset Colors</div>
                        <div className="grid grid-cols-6 gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                formData.color === color ? 'border-foreground ring-2 ring-offset-2 ring-primary' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setFormData({ ...formData, color })}
                            />
                          ))}
                        </div>
                        <div className="pt-2 border-t border-border">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Custom Color</div>
                          <Input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-full h-8 p-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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
