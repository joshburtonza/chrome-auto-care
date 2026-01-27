import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaffNav } from '@/components/staff/StaffNav';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Palette, Search, Layers, X, Clock, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useProcessTemplates } from '@/hooks/useProcessTemplates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRESET_COLORS = [
  '#10b981', // Green (Detailing)
  '#f59e0b', // Amber (Restoration)
  '#8b5cf6', // Purple (Paint Correction)
  '#06b6d4', // Cyan (Ceramic)
  '#3b82f6', // Blue (PPF)
  '#ec4899', // Pink (PPS)
  '#6366f1', // Indigo (Tint)
  '#6b7280', // Gray (Accessories)
  '#ef4444', // Red
  '#84cc16', // Lime
  '#f97316', // Orange
  '#14b8a6', // Teal
];

const CATEGORIES = [
  'Detailing',
  'Restoration', 
  'Paint Correction',
  'Ceramic',
  'PPF',
  'PPS',
  'Tint',
  'Accessories',
];

interface ServiceFormData {
  title: string;
  description: string;
  category: string;
  price_from: number;
  duration: string;
  color: string;
  features: string[];
  notes: string[];
  add_ons: string[];
}

export default function StaffServices() {
  const [services, setServices] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState<ServiceFormData>({
    title: '',
    description: '',
    category: '',
    price_from: 0,
    duration: '',
    color: '#3b82f6',
    features: [],
    notes: [],
    add_ons: [],
  });
  
  // Temp inputs for array fields
  const [newFeature, setNewFeature] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newAddon, setNewAddon] = useState('');
  
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { templates } = useProcessTemplates();

  // Get template for a service
  const getTemplateForService = (serviceId: string) => {
    return templates.find(t => t.service_id === serviceId);
  };

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, filterCategory]);

  useEffect(() => {
    // Redirect non-admin users
    if (userRole && userRole !== 'admin') {
      navigate('/staff/dashboard');
      return;
    }
    fetchServices();

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
      .order('category')
      .order('title');

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
      description: service.description || '',
      category: service.category,
      price_from: service.price_from,
      duration: service.duration,
      color: service.color || '#3b82f6',
      features: service.features || [],
      notes: service.notes || [],
      add_ons: service.add_ons || [],
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
      features: [],
      notes: [],
      add_ons: [],
    });
    setNewFeature('');
    setNewNote('');
    setNewAddon('');
    setShowDialog(true);
  };

  const handleSaveService = async () => {
    if (!formData.title || !formData.category || formData.price_from <= 0) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const serviceData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      price_from: formData.price_from,
      duration: formData.duration,
      color: formData.color,
      features: formData.features.length > 0 ? formData.features : null,
      notes: formData.notes.length > 0 ? formData.notes : null,
      add_ons: formData.add_ons.length > 0 ? formData.add_ons : null,
    };

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);

      if (!error) {
        toast({ title: 'Service updated successfully' });
        handleCloseDialog();
        fetchServices();
      }
    } else {
      const { error } = await supabase
        .from('services')
        .insert([serviceData]);

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
      features: [],
      notes: [],
      add_ons: [],
    });
    setNewFeature('');
    setNewNote('');
    setNewAddon('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleCloseDialog();
    }
  };

  const addToArray = (field: 'features' | 'notes' | 'add_ons', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
      setter('');
    }
  };

  const removeFromArray = (field: 'features' | 'notes' | 'add_ons', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
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

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredServices.map((service) => {
            const template = getTemplateForService(service.id);
            return (
              <ChromeSurface key={service.id} className="p-4 sm:p-5 md:p-6 relative overflow-hidden">
                {/* Service color indicator */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: service.color || '#6b7280' }}
                />
                <div className="pl-2">
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant="secondary"
                        className="text-[10px] uppercase border"
                        style={{ 
                          backgroundColor: service.color ? `${service.color}15` : undefined,
                          color: service.color || undefined,
                          borderColor: service.color ? `${service.color}40` : undefined,
                        }}
                      >
                        {service.category}
                      </Badge>
                      {!service.is_active && (
                        <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                      )}
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

                  {/* Template info */}
                  {template && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{template.stages?.length || 0} process stages</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm mb-3">
                    <div>
                      <div className="chrome-label text-[10px] sm:text-xs">PRICE</div>
                      <div className="font-semibold text-sm sm:text-base">From R{service.price_from.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="chrome-label text-[10px] sm:text-xs">DURATION</div>
                      <div className="font-semibold text-sm sm:text-base">{service.duration}</div>
                    </div>
                  </div>

                  {/* Quick info badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {service.features?.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {service.features.length} includes
                      </Badge>
                    )}
                    {service.notes?.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        <Info className="w-3 h-3 mr-1" />
                        Notes
                      </Badge>
                    )}
                    {service.add_ons?.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {service.add_ons.length} add-ons
                      </Badge>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => handleEdit(service)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </ChromeSurface>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services found.</p>
            {(searchQuery || filterCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('all');
                }}
                className="text-primary text-sm mt-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Service Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="mx-2 sm:mx-auto max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="chrome-heading text-base sm:text-lg md:text-xl">
                {editingService ? 'EDIT SERVICE' : 'ADD SERVICE'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingService ? 'Update service details and pricing' : 'Create a new service offering'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="chrome-label text-xs mb-1 block">TITLE *</label>
                <Input 
                  placeholder="e.g. RT Fresh Wash" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Category */}
              <div>
                <label className="chrome-label text-xs mb-1 block">CATEGORY *</label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description (Outcome) */}
              <div>
                <label className="chrome-label text-xs mb-1 block">OUTCOME / DESCRIPTION</label>
                <Textarea 
                  placeholder="One-line outcome description" 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Price and Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="chrome-label text-xs mb-1 block">PRICE FROM (R) *</label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.price_from}
                    onChange={(e) => setFormData({ ...formData, price_from: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="chrome-label text-xs mb-1 block">DURATION</label>
                  <Input 
                    placeholder="e.g. Same day, ~2 days" 
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Features (Includes) */}
              <div>
                <label className="chrome-label text-xs mb-1 block">WHAT'S INCLUDED</label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Add feature..." 
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('features', newFeature, setNewFeature))}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToArray('features', newFeature, setNewFeature)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map((feature, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                        {feature}
                        <button onClick={() => removeFromArray('features', idx)} className="hover:bg-muted rounded p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="chrome-label text-xs mb-1 block">NOTES / DEPENDENCIES</label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Add note..." 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('notes', newNote, setNewNote))}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToArray('notes', newNote, setNewNote)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.notes.length > 0 && (
                  <div className="space-y-1">
                    {formData.notes.map((note, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50 text-sm">
                        <span className="flex-1">{note}</span>
                        <button onClick={() => removeFromArray('notes', idx)} className="hover:bg-muted rounded p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add-ons */}
              <div>
                <label className="chrome-label text-xs mb-1 block">AVAILABLE ADD-ONS</label>
                <div className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Add add-on..." 
                    value={newAddon}
                    onChange={(e) => setNewAddon(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('add_ons', newAddon, setNewAddon))}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() => addToArray('add_ons', newAddon, setNewAddon)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.add_ons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.add_ons.map((addon, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1 pr-1">
                        {addon}
                        <button onClick={() => removeFromArray('add_ons', idx)} className="hover:bg-muted rounded p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Color Picker */}
              <div>
                <label className="chrome-label text-xs mb-1 block">SERVICE COLOR</label>
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

              {/* Linked Template Info */}
              {editingService && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    {(() => {
                      const template = getTemplateForService(editingService.id);
                      return template ? (
                        <span>
                          Linked to <strong>{template.name}</strong> ({template.stages?.length || 0} stages)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No process template linked</span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Manage process templates in the Process Templates page
                  </p>
                </div>
              )}
              
              <Button className="w-full" onClick={handleSaveService}>
                {editingService ? 'Update Service' : 'Create Service'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
