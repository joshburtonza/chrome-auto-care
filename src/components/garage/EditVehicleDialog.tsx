import { useState, useRef, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { X, Image as ImageIcon, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VEHICLE_MAKES, getModelsForMake, VEHICLE_YEARS, VEHICLE_COLOURS } from '@/data/vehicleData';
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

interface ComboboxProps {
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  allowCustom?: boolean;
}

const Combobox = ({ options, value, onSelect, placeholder, searchPlaceholder, emptyText = 'No results found.', allowCustom = true }: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options.slice(0, 50);
    const lower = search.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(lower)).slice(0, 50);
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustom && search ? (
                <button
                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                  onClick={() => {
                    onSelect(search);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  Use "{search}"
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onSelect(option);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

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

  // Get models based on selected make
  const availableModels = useMemo(() => {
    if (!formData.make) return [];
    return getModelsForMake(formData.make);
  }, [formData.make]);

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

  const handleMakeChange = (make: string) => {
    // Reset model when make changes (only if make actually changed)
    if (make !== formData.make) {
      setFormData({ ...formData, make, model: '' });
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

            {/* Year Dropdown */}
            <div className="space-y-2">
              <Label>Year *</Label>
              <Combobox
                options={VEHICLE_YEARS}
                value={formData.year}
                onSelect={(val) => setFormData({ ...formData, year: val })}
                placeholder="Select year"
                searchPlaceholder="Search year..."
                allowCustom={true}
              />
            </div>

            {/* Make Dropdown */}
            <div className="space-y-2">
              <Label>Make *</Label>
              <Combobox
                options={VEHICLE_MAKES}
                value={formData.make}
                onSelect={handleMakeChange}
                placeholder="Select make"
                searchPlaceholder="Search make..."
                allowCustom={true}
              />
            </div>

            {/* Model Dropdown (dependent on Make) */}
            <div className="space-y-2">
              <Label>Model *</Label>
              {formData.make ? (
                <Combobox
                  options={availableModels}
                  value={formData.model}
                  onSelect={(val) => setFormData({ ...formData, model: val })}
                  placeholder="Select model"
                  searchPlaceholder="Search model..."
                  allowCustom={true}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal text-muted-foreground"
                  disabled
                  type="button"
                >
                  Select make first
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              )}
            </div>

            {/* Color Dropdown */}
            <div className="space-y-2">
              <Label>Color</Label>
              <Combobox
                options={VEHICLE_COLOURS}
                value={formData.color}
                onSelect={(val) => setFormData({ ...formData, color: val })}
                placeholder="Select color"
                searchPlaceholder="Search color..."
                allowCustom={true}
              />
            </div>

            {/* VIN stays as text input */}
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
