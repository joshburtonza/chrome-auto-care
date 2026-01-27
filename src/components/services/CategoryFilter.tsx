import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: 'all', label: 'All', color: '' },
  { id: 'Detailing', label: 'Detailing', color: 'hsl(160, 84%, 39%)' },
  { id: 'Restoration', label: 'Restoration', color: 'hsl(38, 92%, 50%)' },
  { id: 'Paint Correction', label: 'Paint Correction', color: 'hsl(263, 90%, 51%)' },
  { id: 'Ceramic', label: 'Ceramic', color: 'hsl(187, 96%, 42%)' },
  { id: 'PPF', label: 'PPF', color: 'hsl(217, 91%, 60%)' },
  { id: 'PPS', label: 'PPS', color: 'hsl(330, 81%, 60%)' },
  { id: 'Tint', label: 'Tint', color: 'hsl(239, 84%, 67%)' },
  { id: 'Accessories', label: 'Accessories', color: 'hsl(220, 9%, 46%)' },
];

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <motion.button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              "border",
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground"
            )}
            style={{
              borderColor: isSelected && category.color ? category.color : undefined,
              backgroundColor: isSelected && category.color ? `${category.color}20` : undefined,
              color: isSelected && category.color ? category.color : undefined,
            }}
          >
            {category.id !== 'all' && category.color && (
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: category.color }}
              />
            )}
            {category.label}
          </motion.button>
        );
      })}
    </div>
  );
}
