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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-8">
          <div>
            <h1 className="chrome-title text-2xl sm:text-4xl mb-1 sm:mb-2">MERCHANDISE STORE</h1>
            <p className="text-text-secondary text-sm sm:text-base">Premium detailing products and accessories</p>
          </div>
          <ChromeButton variant="outline" className="w-full sm:w-auto" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="mr-2 w-4 h-4" strokeWidth={1.4} />
            Cart ({cartCount})
          </ChromeButton>
        </div>

        {products.length === 0 ? (
          <ChromeSurface className="p-8 sm:p-12 text-center" glow>
            <Package className="w-12 h-12 sm:w-16 sm:h-16 text-text-tertiary mx-auto mb-3 sm:mb-4" />
            <p className="text-text-secondary text-sm">No products available at the moment</p>
          </ChromeSurface>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
              <ChromeSurface 
                key={product.id} 
                className="p-4 sm:p-6 chrome-sheen group hover:chrome-glow-strong transition-all" 
                glow
              >
                <div className="aspect-square rounded-lg chrome-surface mb-3 sm:mb-4 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-primary/30" strokeWidth={1.4} />
                </div>
                <div className="chrome-label text-[9px] sm:text-[10px] text-text-tertiary mb-1 sm:mb-2">
                  {product.category}
                </div>
                <h3 className="text-base sm:text-lg font-light text-foreground mb-1 sm:mb-2">{product.name}</h3>
                <p className="text-xs sm:text-sm text-text-secondary mb-3 sm:mb-4 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-border/50">
                  <div className="text-lg sm:text-xl text-primary font-light">
                    R{product.price.toFixed(2)}
                  </div>
                  <ChromeButton 
                    size="sm" 
                    className="w-full sm:w-auto"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={product.stock_quantity === 0}
                  >
                    {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </ChromeButton>
                </div>
                {product.stock_quantity > 0 && product.stock_quantity < 10 && (
                  <div className="text-[10px] sm:text-xs text-amber-500 mt-2">
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