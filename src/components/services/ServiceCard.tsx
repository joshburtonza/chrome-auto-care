import { motion } from "framer-motion";
import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, Eye } from "lucide-react";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_from: number;
  duration: string;
  features: string[] | null;
  color: string | null;
  image_url: string | null;
}

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  index: number;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export function ServiceCard({ 
  service, 
  isSelected, 
  onToggleSelect, 
  onViewDetails,
  index 
}: ServiceCardProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.05 }}
    >
      <ChromeSurface 
        className={`overflow-hidden transition-all ${
          isSelected ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`} 
        sheen
      >
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className="text-[10px] uppercase font-medium border shrink-0"
                  style={{ 
                    backgroundColor: service.color ? `${service.color}15` : undefined,
                    color: service.color || undefined,
                    borderColor: service.color ? `${service.color}40` : undefined,
                  }}
                >
                  {service.category}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {service.duration}
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-foreground">{service.title}</h3>
            </div>
            {isSelected && (
              <div className="p-1.5 rounded-full bg-primary text-primary-foreground shrink-0">
                <Check className="w-4 h-4" strokeWidth={2} />
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
            {service.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div className="font-semibold text-foreground">
              From R{service.price_from.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {isSelected ? 'Selected' : 'Select'}
              </button>
            </div>
          </div>
        </div>
      </ChromeSurface>
    </motion.div>
  );
}
