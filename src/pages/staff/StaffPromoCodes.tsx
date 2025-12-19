import { StaffNav } from "@/components/staff/StaffNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Ticket, Copy, Users } from "lucide-react";
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
import { format } from "date-fns";

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  points_value: number;
  discount_percentage: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const StaffPromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    points_value: '0',
    discount_percentage: '',
    discount_amount: '',
    max_uses: '',
    expires_at: '',
    is_active: true,
  });
  const { userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/staff/dashboard');
      return;
    }
    loadPromoCodes();
  }, [userRole, navigate]);

  const loadPromoCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const openAddDialog = () => {
    setEditingCode(null);
    setFormData({
      code: generateCode(),
      description: '',
      points_value: '0',
      discount_percentage: '',
      discount_amount: '',
      max_uses: '',
      expires_at: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (promoCode: PromoCode) => {
    setEditingCode(promoCode);
    setFormData({
      code: promoCode.code,
      description: promoCode.description || '',
      points_value: promoCode.points_value.toString(),
      discount_percentage: promoCode.discount_percentage?.toString() || '',
      discount_amount: promoCode.discount_amount?.toString() || '',
      max_uses: promoCode.max_uses?.toString() || '',
      expires_at: promoCode.expires_at ? format(new Date(promoCode.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
      is_active: promoCode.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code) {
      toast.error('Code is required');
      return;
    }

    try {
      const promoData = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        points_value: parseInt(formData.points_value) || 0,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        is_active: formData.is_active,
      };

      if (editingCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoData)
          .eq('id', editingCode.id);

        if (error) throw error;
        toast.success('Promo code updated successfully');
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([promoData]);

        if (error) throw error;
        toast.success('Promo code created successfully');
      }

      setDialogOpen(false);
      loadPromoCodes();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('This code already exists');
      } else {
        toast.error('Failed to save promo code');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;

    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Promo code deleted successfully');
      loadPromoCodes();
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast.error('Failed to delete promo code');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
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
            <h1 className="chrome-title text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-1 sm:mb-2">PROMO CODES</h1>
            <p className="text-xs sm:text-sm text-text-secondary">Create and manage promotional codes</p>
          </div>
          <ChromeButton onClick={openAddDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 w-4 h-4" />
            Create Code
          </ChromeButton>
        </div>

        {promoCodes.length === 0 ? (
          <ChromeSurface className="p-8 sm:p-12 text-center" glow>
            <Ticket className="w-12 h-12 sm:w-16 sm:h-16 text-text-tertiary mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">No promo codes yet</p>
            <ChromeButton onClick={openAddDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 w-4 h-4" />
              Create First Code
            </ChromeButton>
          </ChromeSurface>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {promoCodes.map((promo) => {
              const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
              const isMaxedOut = promo.max_uses && promo.current_uses >= promo.max_uses;
              
              return (
                <ChromeSurface key={promo.id} className="p-4 sm:p-5 md:p-6 chrome-sheen" glow>
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div 
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => copyCode(promo.code)}
                    >
                      <code className="text-lg sm:text-xl font-mono text-primary">
                        {promo.code}
                      </code>
                      <Copy className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors" />
                    </div>
                    <div className={`text-xs shrink-0 px-2 py-0.5 rounded ${
                      !promo.is_active || isExpired || isMaxedOut
                        ? 'bg-destructive/20 text-destructive' 
                        : 'bg-green-500/20 text-green-500'
                    }`}>
                      {!promo.is_active ? 'Inactive' : isExpired ? 'Expired' : isMaxedOut ? 'Maxed Out' : 'Active'}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 line-clamp-2">
                    {promo.description || 'No description'}
                  </p>

                  <div className="space-y-2 text-xs sm:text-sm text-text-secondary mb-4">
                    {promo.points_value > 0 && (
                      <div className="flex justify-between">
                        <span>Points:</span>
                        <span className="text-primary font-medium">{promo.points_value}</span>
                      </div>
                    )}
                    {promo.discount_percentage && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="text-primary font-medium">{promo.discount_percentage}%</span>
                      </div>
                    )}
                    {promo.discount_amount && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span className="text-primary font-medium">R{promo.discount_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> Uses:
                      </span>
                      <span>{promo.current_uses}{promo.max_uses ? ` / ${promo.max_uses}` : ''}</span>
                    </div>
                    {promo.expires_at && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className={isExpired ? 'text-destructive' : ''}>
                          {format(new Date(promo.expires_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-border/50">
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => openEditDialog(promo)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </ChromeButton>
                    <ChromeButton
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promo.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </ChromeButton>
                  </div>
                </ChromeSurface>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="chrome-surface mx-2 sm:mx-auto max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="chrome-title text-base sm:text-lg md:text-xl">
              {editingCode ? 'Edit Promo Code' : 'Create Promo Code'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="code" className="text-xs sm:text-sm">Code</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="text-sm font-mono"
                />
                <ChromeButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, code: generateCode() })}
                >
                  Generate
                </ChromeButton>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Summer promotion - 500 bonus points"
                rows={2}
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="points_value" className="text-xs sm:text-sm">Points Value</Label>
              <Input
                id="points_value"
                type="number"
                value={formData.points_value}
                onChange={(e) => setFormData({ ...formData, points_value: e.target.value })}
                placeholder="500"
                className="text-sm"
              />
              <p className="text-xs text-text-tertiary mt-1">Loyalty points awarded on redemption</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="discount_percentage" className="text-xs sm:text-sm">Discount %</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value, discount_amount: '' })}
                  placeholder="10"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="discount_amount" className="text-xs sm:text-sm">Discount (R)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value, discount_percentage: '' })}
                  placeholder="100"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="max_uses" className="text-xs sm:text-sm">Max Uses</Label>
                <Input
                  id="max_uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="100"
                  className="text-sm"
                />
                <p className="text-xs text-text-tertiary mt-1">Leave empty for unlimited</p>
              </div>
              <div>
                <Label htmlFor="expires_at" className="text-xs sm:text-sm">Expires</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-xs sm:text-sm">Active</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <ChromeButton variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </ChromeButton>
            <ChromeButton onClick={handleSubmit} className="w-full sm:w-auto">
              {editingCode ? 'Update' : 'Create'} Code
            </ChromeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPromoCodes;