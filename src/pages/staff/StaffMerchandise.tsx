import { StaffNav } from "@/components/staff/StaffNav";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock_quantity: number;
  is_active: boolean;
}

const StaffMerchandise = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    stock_quantity: '',
    is_active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .order('category')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      stock_quantity: '',
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description || '',
      stock_quantity: product.stock_quantity.toString(),
      is_active: product.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        stock_quantity: parseInt(formData.stock_quantity),
        is_active: formData.is_active,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('merchandise')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('merchandise')
          .insert([productData]);

        if (error) throw error;
        toast.success('Product added successfully');
      }

      setDialogOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('merchandise')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <StaffNav />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="chrome-title text-4xl mb-2">MERCHANDISE MANAGEMENT</h1>
            <p className="text-text-secondary">Manage store inventory and products</p>
          </div>
          <ChromeButton onClick={openAddDialog}>
            <Plus className="mr-2 w-4 h-4" />
            Add Product
          </ChromeButton>
        </div>

        {products.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary mb-4">No products yet</p>
            <ChromeButton onClick={openAddDialog}>
              <Plus className="mr-2 w-4 h-4" />
              Add First Product
            </ChromeButton>
          </ChromeSurface>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ChromeSurface key={product.id} className="p-6 chrome-sheen" glow>
                <div className="flex items-start justify-between mb-4">
                  <div className="chrome-label text-[10px] text-text-tertiary">
                    {product.category}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-xs ${product.is_active ? 'text-green-500' : 'text-red-500'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-light text-foreground mb-2">{product.name}</h3>
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50 mb-4">
                  <div className="text-xl text-primary font-light">
                    R{product.price.toFixed(2)}
                  </div>
                  <div className={`text-sm ${product.stock_quantity === 0 ? 'text-red-500' : 'text-text-secondary'}`}>
                    Stock: {product.stock_quantity}
                  </div>
                </div>

                <div className="flex gap-2">
                  <ChromeButton
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </ChromeButton>
                  <ChromeButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </ChromeButton>
                </div>
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="chrome-surface">
          <DialogHeader>
            <DialogTitle className="chrome-title">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Premium Wax"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Detailing Products"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (R)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="299.99"
                />
              </div>

              <div>
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Premium quality detailing wax for showroom finish"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <ChromeButton variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </ChromeButton>
            <ChromeButton onClick={handleSubmit}>
              {editingProduct ? 'Update' : 'Add'} Product
            </ChromeButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffMerchandise;
