import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp, User } from 'lucide-react';
import { ClientNav } from '@/components/client/ClientNav';
import { BottomNav } from '@/components/client/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string;
  user_id: string;
  booking_id: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  is_featured: boolean;
  created_at: string;
  profile?: { full_name: string | null };
}

interface CompletedBooking {
  id: string;
  booking_date: string;
  services: { title: string }[];
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export default function Reviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [completedBookings, setCompletedBookings] = useState<CompletedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    booking_id: '',
    rating: 5,
    title: '',
    content: ''
  });

  useEffect(() => {
    loadReviews();
    if (user) {
      loadMyReviews();
      loadCompletedBookings();
    }
  }, [user]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch profiles for reviews
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const reviewsWithProfiles = data.map(review => ({
          ...review,
          profile: profiles?.find(p => p.id === review.user_id)
        }));
        setReviews(reviewsWithProfiles);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyReviews = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setMyReviews(data || []);
  };

  const loadCompletedBookings = async () => {
    if (!user) return;

    // Get completed bookings that don't have reviews yet
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        booking_services(service_id, services(title))
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('booking_date', { ascending: false });

    if (bookings) {
      // Get bookings that already have reviews
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('user_id', user.id);

      const reviewedBookingIds = new Set(existingReviews?.map(r => r.booking_id));
      
      const unreviewedBookings = bookings
        .filter(b => !reviewedBookingIds.has(b.id))
        .map(b => ({
          id: b.id,
          booking_date: b.booking_date,
          services: (b.booking_services as any[])?.map(bs => ({ title: bs.services?.title })) || []
        }));

      setCompletedBookings(unreviewedBookings);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !formData.booking_id) {
      toast.error('Please select a booking');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        booking_id: formData.booking_id,
        rating: formData.rating,
        title: formData.title || null,
        content: formData.content || null,
        is_public: true
      });

      if (error) throw error;

      toast.success('Thank you for your review!');
      setDialogOpen(false);
      setFormData({ booking_id: '', rating: 5, title: '', content: '' });
      loadReviews();
      loadMyReviews();
      loadCompletedBookings();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onRate?.(star)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <ClientNav />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <motion.div className="mb-8" {...fadeInUp}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-primary" strokeWidth={1.5} />
              Customer Reviews
            </h1>
            {user && completedBookings.length > 0 && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Leave a Review</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Your Experience</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Booking</label>
                      <Select
                        value={formData.booking_id}
                        onValueChange={(v) => setFormData({ ...formData, booking_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a completed booking" />
                        </SelectTrigger>
                        <SelectContent>
                          {completedBookings.map(booking => (
                            <SelectItem key={booking.id} value={booking.id}>
                              {format(new Date(booking.booking_date), 'MMM d, yyyy')} - {booking.services.map(s => s.title).join(', ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Rating</label>
                      {renderStars(formData.rating, true, (r) => setFormData({ ...formData, rating: r }))}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title (optional)</label>
                      <Input
                        placeholder="Summarize your experience"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Your Review</label>
                      <Textarea
                        placeholder="Tell us about your experience..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleSubmitReview} disabled={submitting} className="w-full">
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-muted-foreground text-sm">See what our customers say about us</p>
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{averageRating}</div>
            <div className="flex justify-center mt-1">
              {renderStars(Math.round(parseFloat(averageRating)))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Average Rating</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{reviews.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Reviews</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {reviews.filter(r => r.rating === 5).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">5-Star Reviews</div>
          </div>
        </motion.div>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-3" />
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {review.profile?.full_name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>
                {review.title && (
                  <h3 className="font-medium text-foreground mb-2">{review.title}</h3>
                )}
                {review.content && (
                  <p className="text-sm text-muted-foreground">{review.content}</p>
                )}
                {review.is_featured && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary">
                    <ThumbsUp className="w-3 h-3" />
                    Featured Review
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}