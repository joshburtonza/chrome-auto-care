import { ChromeSurface } from "@/components/chrome/ChromeSurface";

const Gallery = () => {
  const showcaseItems = [
    { id: 1, title: "GT3 RS - Full PPF", category: "Paint Protection" },
    { id: 2, title: "M4 - Ceramic Coating", category: "Ceramic Coating" },
    { id: 3, title: "RS6 - Full Detail", category: "Detailing" },
    { id: 4, title: "911 Turbo S - Paint Correction", category: "Enhancement" },
    { id: 5, title: "AMG GT - Interior Detail", category: "Interior" },
    { id: 6, title: "R8 V10 - Full PPF", category: "Paint Protection" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="chrome-title text-4xl mb-2">SHOWCASE GALLERY</h1>
          <p className="text-text-secondary">Our recent work and transformations</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showcaseItems.map((item) => (
            <ChromeSurface key={item.id} className="group overflow-hidden chrome-sheen" glow>
              <div className="aspect-[4/3] chrome-surface bg-gradient-to-br from-primary/5 to-background flex items-center justify-center">
                <div className="text-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <div className="chrome-label text-xs text-text-tertiary mb-2">{item.category}</div>
                  <div className="text-foreground">{item.title}</div>
                </div>
              </div>
            </ChromeSurface>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
