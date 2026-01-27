import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Badge } from "@/components/ui/badge";
import { Clock, Check, ChevronRight, Info, Plus, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProcessTemplateStage } from "@/hooks/useProcessTemplates";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price_from: number;
  duration: string;
  features: string[] | null;
  notes: string[] | null;
  add_ons: string[] | null;
  color: string | null;
}

interface ServiceDetailModalProps {
  service: Service | null;
  stages: ProcessTemplateStage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestBooking: (service: Service) => void;
}

export function ServiceDetailModal({
  service,
  stages,
  open,
  onOpenChange,
  onRequestBooking,
}: ServiceDetailModalProps) {
  const isMobile = useIsMobile();

  if (!service) return null;

  const content = (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            style={{ 
              backgroundColor: service.color ? `${service.color}20` : undefined,
              color: service.color || undefined,
              borderColor: service.color || undefined,
            }}
            className="border"
          >
            {service.category}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {service.duration}
          </Badge>
        </div>
        <p className="text-muted-foreground">{service.description}</p>
        <div className="text-2xl font-semibold text-foreground">
          From R{service.price_from.toLocaleString()}
        </div>
      </div>

      {/* What You Get */}
      {service.features && service.features.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            What You Get
          </h3>
          <div className="space-y-2">
            {service.features.map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process */}
      {stages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            Process ({stages.length} steps)
          </h3>
          <div className="space-y-2">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="flex items-center gap-3 text-sm">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                  style={{ 
                    backgroundColor: service.color ? `${service.color}20` : 'hsl(var(--muted))',
                    color: service.color || 'hsl(var(--muted-foreground))',
                  }}
                >
                  {idx + 1}
                </div>
                <span className="text-foreground">{stage.stage_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {service.notes && service.notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            Notes
          </h3>
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            {service.notes.map((note, idx) => (
              <p key={idx} className="text-sm text-muted-foreground">{note}</p>
            ))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {service.add_ons && service.add_ons.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Available Add-ons
          </h3>
          <div className="flex flex-wrap gap-2">
            {service.add_ons.map((addon, idx) => (
              <Badge key={idx} variant="outline" className="text-sm">
                {addon}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="pt-4 border-t border-border/50">
        <ChromeButton 
          className="w-full" 
          onClick={() => onRequestBooking(service)}
        >
          Request Booking
        </ChromeButton>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-xl font-semibold">{service.title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 pt-2 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{service.title}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
