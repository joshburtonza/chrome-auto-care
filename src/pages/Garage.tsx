import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { Car, Plus } from "lucide-react";

const Garage = () => {
  const vehicles = [
    {
      id: 1,
      year: "2024",
      make: "Porsche",
      model: "911 GT3",
      vin: "WP0AB2A99MS123456",
      color: "GT Silver Metallic",
    },
    {
      id: 2,
      year: "2023",
      make: "BMW",
      model: "M4 Competition",
      vin: "WBS8M9C51P5A12345",
      color: "Brooklyn Grey Metallic",
    },
    {
      id: 3,
      year: "2024",
      make: "Audi",
      model: "RS6 Avant",
      vin: "WAUZZZ4G5EN123456",
      color: "Daytona Grey Pearl",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="chrome-title text-4xl mb-2">MY GARAGE</h1>
            <p className="text-text-secondary">Manage your vehicle collection</p>
          </div>
          <ChromeButton>
            <Plus className="mr-2 w-4 h-4" strokeWidth={1.4} />
            Add Vehicle
          </ChromeButton>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {vehicles.map((vehicle) => (
            <ChromeSurface key={vehicle.id} className="p-6 chrome-sheen" glow>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg chrome-surface">
                  <Car className="w-6 h-6 text-primary" strokeWidth={1.4} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-light text-foreground mb-1">
                    {vehicle.year} {vehicle.make}
                  </h3>
                  <div className="chrome-label text-[10px] text-text-secondary mb-3">{vehicle.model}</div>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex items-center justify-between">
                      <span className="text-text-tertiary">Color:</span>
                      <span>{vehicle.color}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-tertiary">VIN:</span>
                      <span className="font-mono text-xs">{vehicle.vin}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Garage;
