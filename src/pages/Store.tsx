import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

const Store = () => {
  const [cartCount] = useState(0);

  const products = [
    {
      id: 1,
      name: "Premium Microfiber Towels",
      category: "Accessories",
      price: 49.99,
      description: "Professional-grade microfiber towels for scratch-free detailing",
    },
    {
      id: 2,
      name: "Ceramic Spray Coating",
      category: "Products",
      price: 89.99,
      description: "Easy-apply ceramic spray for lasting protection and shine",
    },
    {
      id: 3,
      name: "Wheel Cleaner Pro",
      category: "Products",
      price: 34.99,
      description: "pH-neutral wheel cleaner safe for all finishes",
    },
    {
      id: 4,
      name: "Detailing Brush Set",
      category: "Accessories",
      price: 59.99,
      description: "Complete brush set for interior and exterior detailing",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="chrome-title text-4xl mb-2">MERCHANDISE STORE</h1>
            <p className="text-text-secondary">Premium detailing products and accessories</p>
          </div>
          <ChromeButton variant="outline">
            <ShoppingCart className="mr-2 w-4 h-4" strokeWidth={1.4} />
            Cart ({cartCount})
          </ChromeButton>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ChromeSurface key={product.id} className="p-6 chrome-sheen group hover:chrome-glow-strong transition-all" glow>
              <div className="aspect-square rounded-lg chrome-surface mb-4 flex items-center justify-center">
                <ShoppingCart className="w-12 h-12 text-primary/30" strokeWidth={1.4} />
              </div>
              <div className="chrome-label text-[10px] text-text-tertiary mb-2">{product.category}</div>
              <h3 className="text-lg font-light text-foreground mb-2">{product.name}</h3>
              <p className="text-sm text-text-secondary mb-4">{product.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div className="text-xl text-primary font-light">${product.price}</div>
                <ChromeButton size="sm">Add to Cart</ChromeButton>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Store;
