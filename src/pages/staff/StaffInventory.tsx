import { useState, useEffect } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  History,
  Loader2,
  Filter
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Database } from '@/integrations/supabase/types';

type InventoryCategory = Database['public']['Enums']['inventory_category'];

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: InventoryCategory;
  sku: string | null;
  quantity: number;
  min_stock_level: number | null;
  unit: string;
  cost_per_unit: number | null;
  supplier: string | null;
  location: string | null;
  is_consumable: boolean | null;
  is_active: boolean | null;
  last_restocked_at: string | null;
  created_at: string;
}

interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  notes: string | null;
  created_at: string;
}

const categories: { value: InventoryCategory; label: string }[] = [
  { value: 'ppf_film', label: 'PPF Film' },
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'adhesives', label: 'Adhesives' },
  { value: 'cleaning_supplies', label: 'Cleaning Supplies' },
  { value: 'polishing_compounds', label: 'Polishing Compounds' },
  { value: 'tools', label: 'Tools' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'safety_gear', label: 'Safety Gear' },
  { value: 'other', label: 'Other' }
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export default function StaffInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other' as InventoryCategory,
    sku: '',
    quantity: 0,
    min_stock_level: 5,
    unit: 'units',
    cost_per_unit: '',
    supplier: '',
    location: '',
    is_consumable: true,
    is_active: true
  });
  const [transactionData, setTransactionData] = useState({
    type: 'restock' as 'restock' | 'usage' | 'adjustment' | 'return',
    quantity: 0,
    notes: ''
  });

  useEffect(() => {
    loadInventory();
    
    // Real-time subscription
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory'
      }, () => {
        loadInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionHistory = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('inventory_id', itemId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transaction history');
    }
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      category: 'other',
      sku: '',
      quantity: 0,
      min_stock_level: 5,
      unit: 'units',
      cost_per_unit: '',
      supplier: '',
      location: '',
      is_consumable: true,
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      sku: item.sku || '',
      quantity: item.quantity,
      min_stock_level: item.min_stock_level || 5,
      unit: item.unit,
      cost_per_unit: item.cost_per_unit?.toString() || '',
      supplier: item.supplier || '',
      location: item.location || '',
      is_consumable: item.is_consumable ?? true,
      is_active: item.is_active ?? true
    });
    setIsDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    setSaving(true);
    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description || null,
        category: formData.category,
        sku: formData.sku || null,
        quantity: formData.quantity,
        min_stock_level: formData.min_stock_level,
        unit: formData.unit,
        cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null,
        supplier: formData.supplier || null,
        location: formData.location || null,
        is_consumable: formData.is_consumable,
        is_active: formData.is_active
      };

      if (selectedItem) {
        const { error } = await supabase
          .from('inventory')
          .update(itemData)
          .eq('id', selectedItem.id);
        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert(itemData);
        if (error) throw error;
        toast.success('Item added');
      }

      setIsDialogOpen(false);
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;
      toast.success('Item deleted');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleTransaction = async () => {
    if (!selectedItem || transactionData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('inventory_transactions')
        .insert({
          inventory_id: selectedItem.id,
          transaction_type: transactionData.type,
          quantity: transactionData.quantity,
          notes: transactionData.notes || null,
          performed_by: user.id
        });

      if (error) throw error;

      toast.success(`${transactionData.type === 'restock' ? 'Stock added' : transactionData.type === 'usage' ? 'Usage recorded' : 'Stock adjusted'}`);
      setIsTransactionDialogOpen(false);
      setTransactionData({ type: 'restock', quantity: 0, notes: '' });
      loadInventory();
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast.error('Failed to record transaction');
    } finally {
      setSaving(false);
    }
  };

  const openTransactionDialog = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransactionData({ type: 'restock', quantity: 0, notes: '' });
    setIsTransactionDialogOpen(true);
  };

  const openHistoryDialog = async (item: InventoryItem) => {
    setSelectedItem(item);
    await loadTransactionHistory(item.id);
    setIsHistoryDialogOpen(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLowStock = !showLowStock || (item.quantity <= (item.min_stock_level || 0));
    
    return matchesSearch && matchesCategory && matchesLowStock && item.is_active;
  });

  const lowStockCount = inventory.filter(item => item.is_active && item.quantity <= (item.min_stock_level || 0)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background staff-theme pb-24 md:pb-8">
      <StaffNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3">
                <Package className="w-7 h-7 text-primary" strokeWidth={1.5} />
                Inventory
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage stock levels, supplies, and equipment
              </p>
            </div>
            <div className="flex gap-2">
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {lowStockCount} Low Stock
                </Badge>
              )}
              <Button
                onClick={handleAddItem}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-3 mb-6"
          {...fadeInUp}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-muted/50 border-border text-foreground">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showLowStock ? "default" : "outline"}
            onClick={() => setShowLowStock(!showLowStock)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Low Stock
          </Button>
        </motion.div>

        {/* Inventory Grid */}
        <div className="grid gap-4">
          {filteredInventory.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              {...fadeInUp}
            >
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No inventory items found</p>
            </motion.div>
          ) : (
            filteredInventory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.quantity <= (item.min_stock_level || 0) 
                      ? 'bg-destructive/20' 
                      : 'bg-primary/20'
                  }`}>
                    <Package className={`w-6 h-6 ${
                      item.quantity <= (item.min_stock_level || 0) 
                        ? 'text-destructive' 
                        : 'text-primary'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {item.name}
                      </h3>
                      <Badge variant="outline" className="w-fit border-primary/30 text-primary text-xs">
                        {categories.find(c => c.value === item.category)?.label || item.category}
                      </Badge>
                      {item.quantity <= (item.min_stock_level || 0) && (
                        <Badge variant="destructive" className="w-fit text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {item.sku && <span>SKU: {item.sku}</span>}
                      <span className="font-medium text-foreground">
                        {item.quantity} {item.unit}
                      </span>
                      {item.min_stock_level && (
                        <span>Min: {item.min_stock_level}</span>
                      )}
                      {item.cost_per_unit && (
                        <span>R{item.cost_per_unit.toFixed(2)}/{item.unit}</span>
                      )}
                      {item.location && <span>📍 {item.location}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransactionDialog(item)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openHistoryDialog(item)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="border-border text-foreground hover:bg-muted"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-foreground">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Item name"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-foreground">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-foreground">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: InventoryCategory) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-foreground">SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Stock code"
                />
              </div>
              <div>
                <Label className="text-foreground">Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground">Min Stock Level</Label>
                <Input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_stock_level: parseInt(e.target.value) || 0 }))}
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div>
                <Label className="text-foreground">Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="e.g., rolls, bottles"
                />
              </div>
              <div>
                <Label className="text-foreground">Cost per Unit (R)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-foreground">Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <Label className="text-foreground">Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Storage location"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_consumable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_consumable: checked }))}
                />
                <Label className="text-foreground">Consumable</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label className="text-foreground">Active</Label>
              </div>
            </div>
            <Button 
              onClick={handleSaveItem} 
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {selectedItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Stock Transaction - {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-foreground">Transaction Type</Label>
              <Select 
                value={transactionData.type} 
                onValueChange={(value: 'restock' | 'usage' | 'adjustment' | 'return') => 
                  setTransactionData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="bg-muted/50 border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="restock">Restock (Add)</SelectItem>
                  <SelectItem value="usage">Usage (Subtract)</SelectItem>
                  <SelectItem value="return">Return (Add)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (Set)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground">
                {transactionData.type === 'adjustment' ? 'New Quantity' : 'Quantity'}
              </Label>
              <Input
                type="number"
                value={transactionData.quantity || ''}
                onChange={(e) => setTransactionData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                className="bg-muted/50 border-border text-foreground"
                placeholder="Enter quantity"
              />
            </div>
            <div>
              <Label className="text-foreground">Notes</Label>
              <Textarea
                value={transactionData.notes}
                onChange={(e) => setTransactionData(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-muted/50 border-border text-foreground"
                placeholder="Optional notes"
                rows={2}
              />
            </div>
            <Button 
              onClick={handleTransaction} 
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Transaction History - {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No transactions recorded</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className="bg-muted/50 rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant={
                      tx.transaction_type === 'restock' || tx.transaction_type === 'return' 
                        ? 'default' 
                        : tx.transaction_type === 'usage' 
                          ? 'destructive' 
                          : 'secondary'
                    } className="text-xs">
                      {tx.transaction_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-foreground font-medium">
                    {tx.transaction_type === 'usage' ? '-' : '+'}{tx.quantity} {selectedItem?.unit}
                  </p>
                  {tx.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{tx.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Item</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
