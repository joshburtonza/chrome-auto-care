import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { ShoppingCart, Package, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { ClientNav } from "@/components/client/ClientNav";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/store/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { StoreSkeleton } from "@/components/skeletons/PageSkeletons";
import { getProductImage } from "@/lib/productImages";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  stock_quantity: number;
  is_active: boolean;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const Store = () => {
  const { cartCount, addToCart } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadProducts();

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
        <StoreSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <ClientNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 md:pb-8 max-w-6xl relative">
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Merchandise Store
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
              Premium detailing products and accessories
            </p>
          </div>
          <ChromeButton variant="outline" className="w-full sm:w-auto" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="mr-2 w-4 h-4" strokeWidth={1.5} />
            Cart ({cartCount})
          </ChromeButton>
        </motion.div>

        {products.length === 0 ? (
          <motion.div {...fadeInUp}>
            <ChromeSurface className="p-8 sm:p-12 text-center bg-card/60 backdrop-blur-sm border-border/40">
              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No products available at the moment</p>
            </ChromeSurface>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <ChromeSurface 
                  className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/40 hover:bg-card/70 hover:border-primary/20 transition-all duration-300 group"
                >
                  {(() => {
                    const productImage = getProductImage(product.name, product.category);
                    return productImage ? (
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={productImage} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-xl bg-muted/20 flex items-center justify-center">
                        <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors" strokeWidth={1.5} />
                      </div>
                    );
                  })()}
                  <div className="p-4 sm:p-5">
                    <div className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                      {product.category}
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-1.5">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/30">
                      <div className="text-lg font-semibold text-primary">
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
                      <div className="text-[10px] text-amber-500 mt-2 font-medium">
                        Only {product.stock_quantity} left in stock
                      </div>
                    )}
                  </div>
                </ChromeSurface>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Store;
