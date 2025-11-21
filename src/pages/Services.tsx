import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Shield, Sparkles, Car, Clock, DollarSign } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Services = () => {
  const [selectedService, setSelectedService] = useState<any>(null);

  const services = [
    {
      id: 1,
      title: "Paint Protection Film",
      category: "Protection",
      icon: Shield,
      description: "Premium self-healing PPF for complete front-end or full vehicle coverage",
      duration: "3-5 days",
      priceFrom: "2,500",
      features: ["Self-healing technology", "10-year warranty", "UV protection", "Hydrophobic coating"],
    },
    {
      id: 2,
      title: "Ceramic Coating",
      category: "Protection",
      icon: Sparkles,
      description: "Professional-grade nano-ceramic coating with superior gloss and protection",
      duration: "2-3 days",
      priceFrom: "1,200",
      features: ["9H hardness", "5-year durability", "Enhanced gloss", "Easy maintenance"],
    },
    {
      id: 3,
      title: "Full Detail",
      category: "Detailing",
      icon: Car,
      description: "Complete interior and exterior restoration for showroom finish",
      duration: "1-2 days",
      priceFrom: "800",
      features: ["Paint correction", "Interior deep clean", "Engine bay detail", "Wheel & tire treatment"],
    },
    {
      id: 4,
      title: "Paint Correction",
      category: "Enhancement",
      icon: Sparkles,
      description: "Multi-stage machine polishing to remove swirls and scratches",
      duration: "1-2 days",
      priceFrom: "600",
      features: ["Swirl removal", "Scratch correction", "High-gloss finish", "Paint depth restoration"],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="chrome-title text-4xl mb-2">OUR SERVICES</h1>
          <p className="text-text-secondary">Premium automotive protection and enhancement solutions</p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {services.map((service) => (
            <ChromeSurface key={service.id} className="p-8 chrome-sheen group hover:chrome-glow-strong transition-all duration-300" glow>
              <div className="mb-6 inline-flex p-4 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <service.icon className="w-8 h-8 text-primary" strokeWidth={1.4} />
              </div>

              <div className="mb-4">
                <div className="chrome-label text-[10px] text-text-tertiary mb-2">{service.category}</div>
                <h3 className="text-xl font-light text-foreground mb-2">{service.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{service.description}</p>
              </div>

              <div className="space-y-2 mb-6 pb-6 border-b border-border/50">
                {service.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-text-secondary">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {feature}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.4} />
                      {service.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" strokeWidth={1.4} />
                      From ${service.priceFrom}
                    </span>
                  </div>
                </div>
                <ChromeButton size="sm" onClick={() => setSelectedService(service)}>
                  Book Now
                </ChromeButton>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="chrome-title text-2xl">Book Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedService && (
              <>
                <div className="p-4 rounded-lg chrome-surface">
                  <div className="chrome-label text-[10px] text-text-tertiary mb-2">SELECTED SERVICE</div>
                  <div className="text-lg font-light text-foreground">{selectedService.title}</div>
                  <div className="text-sm text-text-secondary mt-1">
                    Duration: {selectedService.duration} • From ${selectedService.priceFrom}
                  </div>
                </div>

                <div>
                  <div className="chrome-label mb-4">SELECT DATE & TIME</div>
                  <div className="chrome-surface p-6 rounded-lg text-center">
                    <p className="text-text-secondary text-sm">
                      Booking calendar will be displayed here
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <ChromeButton className="flex-1" onClick={() => setSelectedService(null)}>
                    Confirm Booking
                  </ChromeButton>
                  <ChromeButton variant="outline" onClick={() => setSelectedService(null)}>
                    Cancel
                  </ChromeButton>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
