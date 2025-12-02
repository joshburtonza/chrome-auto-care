import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Vehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  color: string | null;
  vin: string | null;
  image_url: string | null;
}

interface EditVehicleDialogProps {
  vehicle: Vehicle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehicleUpdated: () => void;
}

export const EditVehicleDialog = ({ vehicle, open, onOpenChange, onVehicleUpdated }: EditVehicleDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    year: '',
    make: '',
    model: '',
    color: '',
    vin: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        year: vehicle.year || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        color: vehicle.color || '',
        vin: vehicle.vin || '',
      });
      setImagePreview(vehicle.image_url);
      setSelectedImage(null);
    }
  }, [vehicle]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (vehicleId: string): Promise<string | null> => {
    if (!selectedImage || !user) return null;

    const fileExt = selectedImage.name.split('.').pop();
    const fileName = `${user.id}/${vehicleId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('vehicle-photos')
      .upload(fileName, selectedImage, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('vehicle-photos')
      .getPublicUrl(fileName);

    // Add cache-busting timestamp
    return `${publicUrl}?t=${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicle || !formData.year || !formData.make || !formData.model) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = vehicle.image_url;

      // Upload new image if selected
      if (selectedImage) {
        const newImageUrl = await uploadImage(vehicle.id);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        }
      } else if (imagePreview === null && vehicle.image_url) {
        // Image was removed
        imageUrl = null;
      }

      const { error } = await supabase
        .from('vehicles')
        .update({
          year: formData.year,
          make: formData.make,
          model: formData.model,
          color: formData.color || null,
          vin: formData.vin || null,
          image_url: imageUrl,
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      toast.success('Vehicle updated successfully');
      onOpenChange(false);
      onVehicleUpdated();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      setShowDeleteAlert(false);
      onOpenChange(false);
      onVehicleUpdated();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!vehicle) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="chrome-heading">EDIT VEHICLE</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Vehicle Photo</Label>
              <div className="flex flex-col items-center gap-3">
                {imagePreview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border">
                    <img 
                      src={imagePreview} 
                      alt="Vehicle preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors bg-muted/30">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload photo</span>
                    <span className="text-xs text-muted-foreground/60">Max 5MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-year">Year *</Label>
              <Input
                id="edit-year"
                placeholder="2024"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-make">Make *</Label>
              <Input
                id="edit-make"
                placeholder="Porsche"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model *</Label>
              <Input
                id="edit-model"
                placeholder="911 GT3"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color</Label>
              <Input
                id="edit-color"
                placeholder="Black"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vin">VIN</Label>
              <Input
                id="edit-vin"
                placeholder="1HGBH41JXMN109186"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              />
            </div>
            
            <div className="flex gap-2 justify-between pt-2">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteAlert(true)}
                disabled={loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your {vehicle.year} {vehicle.make} {vehicle.model}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};