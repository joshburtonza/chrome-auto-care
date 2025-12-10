import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image, Filter, Sparkles } from 'lucide-react';
import { ClientNav } from '@/components/client/ClientNav';
import { BottomNav } from '@/components/client/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string;
  before_image_url: string | null;
  vehicle_info: string | null;
  is_featured: boolean;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

// Placeholder items for demo when database is empty
const placeholderItems: GalleryItem[] = [
  { id: '1', title: 'Porsche GT3 RS - Full PPF', description: 'Complete paint protection film installation on this stunning GT3 RS', category: 'Paint Protection', image_url: '', before_image_url: null, vehicle_info: 'Porsche 911 GT3 RS', is_featured: true },
  { id: '2', title: 'BMW M4 - Ceramic Coating', description: 'Multi-layer ceramic coating for ultimate paint protection and gloss', category: 'Ceramic Coating', image_url: '', before_image_url: null, vehicle_info: 'BMW M4 Competition', is_featured: true },
  { id: '3', title: 'Audi RS6 - Full Detail', description: 'Comprehensive interior and exterior detailing package', category: 'Detailing', image_url: '', before_image_url: null, vehicle_info: 'Audi RS6 Avant', is_featured: false },
  { id: '4', title: '911 Turbo S - Paint Correction', description: 'Two-stage paint correction to remove swirls and scratches', category: 'Enhancement', image_url: '', before_image_url: null, vehicle_info: 'Porsche 911 Turbo S', is_featured: false },
  { id: '5', title: 'AMG GT - Interior Detail', description: 'Deep cleaning and conditioning of all interior surfaces', category: 'Interior', image_url: '', before_image_url: null, vehicle_info: 'Mercedes-AMG GT', is_featured: false },
  { id: '6', title: 'Audi R8 V10 - Full PPF', description: 'Full body PPF with self-healing technology', category: 'Paint Protection', image_url: '', before_image_url: null, vehicle_info: 'Audi R8 V10 Plus', is_featured: true },
];

const categories = ['All', 'Paint Protection', 'Ceramic Coating', 'Detailing', 'Enhancement', 'Interior'];

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  useEffect(() => {
    loadGalleryItems();
  }, []);

  const loadGalleryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setItems(data);
      } else {
        // Use placeholders if no data
        setItems(placeholderItems);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
      setItems(placeholderItems);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory === 'All'
    ? items
    : items.filter(item => item.category === selectedCategory);

  const featuredItems = items.filter(item => item.is_featured);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <ClientNav />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <motion.div className="mb-8 text-center" {...fadeInUp}>
          <h1 className="text-3xl sm:text-4xl font-semibold text-foreground flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary" strokeWidth={1.5} />
            Showcase Gallery
          </h1>
          <p className="text-muted-foreground">Our recent work and transformations</p>
        </motion.div>

        {/* Featured Section */}
        {featuredItems.length > 0 && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Featured Work
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featuredItems.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-primary/5 to-muted/20">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div>
                      <div className="text-white font-medium">{item.title}</div>
                      <div className="text-white/70 text-sm">{item.vehicle_info}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category Filter */}
        <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </motion.div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[4/3] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedItem(item)}
              >
                <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                      <div className="text-xs text-muted-foreground">{item.category}</div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs text-primary font-medium mb-1">{item.category}</div>
                  <div className="font-medium text-foreground text-sm">{item.title}</div>
                  {item.vehicle_info && (
                    <div className="text-xs text-muted-foreground mt-1">{item.vehicle_info}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-12">
            <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No items found in this category</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selectedItem && (
            <>
              <div className="aspect-video bg-muted flex items-center justify-center">
                {selectedItem.image_url ? (
                  <img src={selectedItem.image_url} alt={selectedItem.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Image className="w-16 h-16 text-muted-foreground/30 mx-auto mb-2" />
                    <div className="text-muted-foreground">Image coming soon</div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="text-xs text-primary font-medium mb-1">{selectedItem.category}</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{selectedItem.title}</h2>
                {selectedItem.vehicle_info && (
                  <div className="text-sm text-muted-foreground mb-3">{selectedItem.vehicle_info}</div>
                )}
                {selectedItem.description && (
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                )}
                {selectedItem.before_image_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                  >
                    {showBeforeAfter ? 'Show After' : 'Show Before'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}