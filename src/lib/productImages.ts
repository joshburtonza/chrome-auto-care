// Product name to image mapping
import detailingBrushSet from "@/assets/products/detailing-brush-set.jpg";
import microfiberTowels from "@/assets/products/microfiber-towels.jpg";
import ceramicSpray from "@/assets/products/ceramic-spray.jpg";
import wheelCleaner from "@/assets/products/wheel-cleaner.jpg";

export const productImages: Record<string, string> = {
  "Detailing Brush Set": detailingBrushSet,
  "Premium Microfiber Towels": microfiberTowels,
  "Ceramic Spray Coating": ceramicSpray,
  "Wheel Cleaner Pro": wheelCleaner,
};

// Fallback by category
export const categoryProductImages: Record<string, string> = {
  "Accessories": detailingBrushSet,
  "Products": ceramicSpray,
};

export function getProductImage(name: string, category: string): string | null {
  return productImages[name] || categoryProductImages[category] || null;
}
