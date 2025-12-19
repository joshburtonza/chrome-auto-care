import { StaffNav } from "@/components/staff/StaffNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Image, Star, Eye, EyeOff, Upload, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  before_image_url: string | null;
  vehicle_info: string | null;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

const CATEGORIES = [
  'PPF',
  'Ceramic Coating',
  'Paint Correction',
  'Detailing',
  'Wraps',
  'Tint',
  'Other'
];

const StaffGallery = () => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    image_url: '',
    before_image_url: '',
    vehicle_info: '',
    is_featured: false,
    is_active: true,
    display_order: '0',
  });
  const { user } = useAuth();

  useEffect(() => {
    loadGalleryItems();
  }, []);

  const loadGalleryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('display_order')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error loading gallery items:', error);
      toast.error('Failed to load gallery items');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File, type: 'main' | 'before'): Promise<string | null> => {
    if (!file) return null;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'before') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, type);
    if (url) {
      if (type === 'main') {
        setFormData({ ...formData, image_url: url });
      } else {
        setFormData({ ...formData, before_image_url: url });
      }
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      image_url: '',
      before_image_url: '',
      vehicle_info: '',
      is_featured: false,
      is_active: true,
      display_order: '0',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category: item.category,
      image_url: item.image_url,
      before_image_url: item.before_image_url || '',
      vehicle_info: item.vehicle_info || '',
      is_featured: item.is_featured,
      is_active: item.is_active,
      display_order: item.display_order.toString(),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.image_url) {
      toast.error('Title, category, and image are required');
      return;
    }

    try {
      const itemData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        image_url: formData.image_url,
        before_image_url: formData.before_image_url || null,
        vehicle_info: formData.vehicle_info || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order) || 0,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('gallery_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Gallery item updated successfully');
      } else {
        const { error } = await supabase
          .from('gallery_items')
          .insert([itemData]);

        if (error) throw error;
        toast.success('Gallery item added successfully');
      }

      setDialogOpen(false);
      loadGalleryItems();
    } catch (error) {
      console.error('Error saving gallery item:', error);
      toast.error('Failed to save gallery item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;

    try {
      const { error } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Gallery item deleted successfully');
      loadGalleryItems();
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      toast.error('Failed to delete gallery item');
    }
  };

  const toggleFeatured = async (item: GalleryItem) => {
    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ is_featured: !item.is_featured })
        .eq('id', item.id);

      if (error) throw error;
      loadGalleryItems();
      toast.success(item.is_featured ? 'Removed from featured' : 'Added to featured');
    } catch (error) {
      console.error('Error updating featured status:', error);
      toast.error('Failed to update');
    }
  };

  const toggleActive = async (item: GalleryItem) => {
    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      loadGalleryItems();
      toast.success(item.is_active ? 'Hidden from gallery' : 'Visible in gallery');
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="chrome-loader" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background staff-theme pb-20 md:pb-0">
      <StaffNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 md:mb-8">
          <div>
            <h1 className="chrome-title text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-1 sm:mb-2">GALLERY</h1>
            <p className="text-xs sm:text-sm text-text-secondary">Manage showcase images</p>
          </div>
          <ChromeButton onClick={openAddDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 w-4 h-4" />
            Add Image
          </ChromeButton>
        </div>

        {galleryItems.length === 0 ? (
          <ChromeSurface className="p-8 sm:p-12 text-center" glow>
            <Image className="w-12 h-12 sm:w-16 sm:h-16 text-text-tertiary mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">No gallery items yet</p>
            <ChromeButton onClick={openAddDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 w-4 h-4" />
              Add First Image
            </ChromeButton>
          </ChromeSurface>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {galleryItems.map((item) => (
              <ChromeSurface key={item.id} className="overflow-hidden chrome-sheen" glow>
                <div className="relative aspect-[4/3]">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {item.is_featured && (
                      <div className="bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-3 h-3" /> Featured
                      </div>
                    )}
                    {!item.is_active && (
                      <div className="bg-muted/90 text-muted-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <div className="bg-background/80 backdrop-blur-sm text-xs px-2 py-0.5 rounded">
                      {item.category}
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="text-sm sm:text-base font-medium text-foreground mb-1 truncate">
                    {item.title}
                  </h3>
                  {item.vehicle_info && (
                    <p className="text-xs text-text-tertiary mb-2">{item.vehicle_info}</p>
                  )}
                  {item.description && (
                    <p className="text-xs sm:text-sm text-text-secondary mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  <div className="flex gap-1 pt-3 border-t border-border/50">
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeatured(item)}
                      title={item.is_featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      <Star className={`w-3 h-3 ${item.is_featured ? 'fill-primary text-primary' : ''}`} />
                    </ChromeButton>
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(item)}
                      title={item.is_active ? 'Hide from gallery' : 'Show in gallery'}
                    >
                      {item.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </ChromeButton>
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </ChromeButton>
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </ChromeButton>
                  </div>
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="chrome-surface mx-2 sm:mx-auto max-h-[85vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="chrome-title text-base sm:text-lg md:text-xl">
              {editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main Image Upload */}
            <div>
              <Label className="text-xs sm:text-sm">After Image (Required)</Label>
              {formData.image_url ? (
                <div className="relative mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                  <span className="text-sm text-text-secondary">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'main')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Before Image Upload */}
            <div>
              <Label className="text-xs sm:text-sm">Before Image (Optional)</Label>
              {formData.before_image_url ? (
                <div className="relative mt-2">
                  <img
                    src={formData.before_image_url}
                    alt="Before Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, before_image_url: '' })}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-6 h-6 text-text-tertiary mb-1" />
                  <span className="text-xs text-text-secondary">Add before image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'before')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <div>
              <Label htmlFor="title" className="text-xs sm:text-sm">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Full Body PPF - BMW M4"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-xs sm:text-sm">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vehicle_info" className="text-xs sm:text-sm">Vehicle Info</Label>
              <Input
                id="vehicle_info"
                value={formData.vehicle_info}
                onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                placeholder="2024 BMW M4 Competition"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full body XPEL Ultimate Plus PPF installation..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="display_order" className="text-xs sm:text-sm">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-2 pt-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured" className="text-xs">Featured</Label>
                  <Switch
                    id="featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="active" className="text-xs">Visible</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <ChromeButton variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </ChromeButton>
            <ChromeButton onClick={handleSubmit} disabled={uploading} className="w-full sm:w-auto">
              {uploading ? 'Uploading...' : editingItem ? 'Update' : 'Add'} Item
            </ChromeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffGallery;