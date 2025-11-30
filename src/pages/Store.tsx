import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { ShoppingCart, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { ClientNav } from "@/components/client/ClientNav";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/store/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock_quantity: number;
  is_active: boolean;
}

const Store = () => {
  const { cartCount, addToCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadProducts();

    // Handle payment redirects
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast.success('Payment successful! Your order has been confirmed.');
    } else if (payment === 'failed') {
      toast.error('Payment failed. Please try again.');
    }
  }, [searchParams]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('is_active', true)
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

  const handleAddToCart = async (productId: string) => {
    await addToCart(productId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="chrome-loader" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="chrome-title text-4xl mb-2">MERCHANDISE STORE</h1>
            <p className="text-text-secondary">Premium detailing products and accessories</p>
          </div>
          <ChromeButton variant="outline" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="mr-2 w-4 h-4" strokeWidth={1.4} />
            Cart ({cartCount})
          </ChromeButton>
        </div>

        {products.length === 0 ? (
          <ChromeSurface className="p-12 text-center" glow>
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No products available at the moment</p>
          </ChromeSurface>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ChromeSurface 
                key={product.id} 
                className="p-6 chrome-sheen group hover:chrome-glow-strong transition-all" 
                glow
              >
                <div className="aspect-square rounded-lg chrome-surface mb-4 flex items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-primary/30" strokeWidth={1.4} />
                </div>
                <div className="chrome-label text-[10px] text-text-tertiary mb-2">
                  {product.category}
                </div>
                <h3 className="text-lg font-light text-foreground mb-2">{product.name}</h3>
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div className="text-xl text-primary font-light">
                    R{product.price.toFixed(2)}
                  </div>
                  <ChromeButton 
                    size="sm" 
                    onClick={() => handleAddToCart(product.id)}
                    disabled={product.stock_quantity === 0}
                  >
                    {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </ChromeButton>
                </div>
                {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                  <div className="text-xs text-amber-500 mt-2">
                    Only {product.stock_quantity} left in stock
                  </div>
                )}
              </ChromeSurface>
            ))}
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Store;