import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Gift, TrendingUp, History, Crown, Award, Shield } from 'lucide-react';
import { ClientNav } from '@/components/client/ClientNav';
import { BottomNav } from '@/components/client/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

interface LoyaltyPoints {
  points: number;
  lifetime_points: number;
  tier: string;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const tierConfig = {
  bronze: { name: 'Bronze', color: 'text-amber-600', bg: 'bg-amber-600/10', icon: Shield, next: 'Silver', pointsNeeded: 2000 },
  silver: { name: 'Silver', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Award, next: 'Gold', pointsNeeded: 5000 },
  gold: { name: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: Crown, next: 'Platinum', pointsNeeded: 10000 },
  platinum: { name: 'Platinum', color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Trophy, next: null, pointsNeeded: null }
};

const rewards = [
  { points: 500, title: '10% Off Service', description: 'Get 10% off your next service booking' },
  { points: 1000, title: 'Free Interior Detail', description: 'Complimentary interior detailing service' },
  { points: 2000, title: '20% Off Any Service', description: 'Get 20% off any service of your choice' },
  { points: 5000, title: 'Free Ceramic Coating', description: 'Complimentary paint protection film application' },
];

export default function Rewards() {
  const { user } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyPoints | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLoyaltyData();
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLoyaltyData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setLoyaltyData(data);
    } else {
      // Initialize if not exists
      setLoyaltyData({ points: 0, lifetime_points: 0, tier: 'bronze' });
    }
    setLoading(false);
  };

  const loadTransactions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setTransactions(data || []);
  };

  const currentTier = tierConfig[loyaltyData?.tier as keyof typeof tierConfig] || tierConfig.bronze;
  const TierIcon = currentTier.icon;

  const getProgressToNextTier = () => {
    if (!loyaltyData || !currentTier.pointsNeeded) return 100;
    const previousTierPoints = {
      bronze: 0,
      silver: 2000,
      gold: 5000,
      platinum: 10000
    }[loyaltyData.tier] || 0;
    
    const progress = ((loyaltyData.lifetime_points - previousTierPoints) / (currentTier.pointsNeeded - previousTierPoints)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-10">
        <ClientNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Join Our Rewards Program</h2>
          <p className="text-muted-foreground">Sign in to start earning points and unlock exclusive rewards</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <ClientNav />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <motion.div className="mb-6" {...fadeInUp}>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3">
            <Trophy className="w-7 h-7 text-primary" strokeWidth={1.5} />
            Rewards Program
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Earn points and unlock exclusive benefits</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
            <div className="h-32 bg-muted rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Points Card */}
            <motion.div
              className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-6 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Available Points</div>
                  <div className="text-4xl font-bold text-foreground">{loyaltyData?.points.toLocaleString() || 0}</div>
                </div>
                <div className={`${currentTier.bg} p-3 rounded-xl`}>
                  <TierIcon className={`w-8 h-8 ${currentTier.color}`} />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-sm font-medium ${currentTier.color}`}>{currentTier.name} Member</span>
                {currentTier.next && (
                  <span className="text-xs text-muted-foreground">
                    → {currentTier.pointsNeeded! - (loyaltyData?.lifetime_points || 0)} points to {currentTier.next}
                  </span>
                )}
              </div>
              
              {currentTier.next && (
                <Progress value={getProgressToNextTier()} className="h-2" />
              )}
              
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Lifetime: </span>
                  <span className="font-medium text-foreground">{loyaltyData?.lifetime_points.toLocaleString() || 0} points</span>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span>Earn 1 point per R10 spent</span>
                </div>
              </div>
            </motion.div>

            {/* Tier Benefits */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Tier Benefits
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(tierConfig).map(([key, tier]) => {
                  const Icon = tier.icon;
                  const isCurrentTier = loyaltyData?.tier === key;
                  return (
                    <div
                      key={key}
                      className={`border rounded-xl p-3 text-center ${
                        isCurrentTier ? 'border-primary bg-primary/5' : 'border-border bg-card'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${tier.color}`} />
                      <div className={`text-sm font-medium ${isCurrentTier ? 'text-primary' : 'text-foreground'}`}>
                        {tier.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {key === 'bronze' && '0+ pts'}
                        {key === 'silver' && '2,000+ pts'}
                        {key === 'gold' && '5,000+ pts'}
                        {key === 'platinum' && '10,000+ pts'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Available Rewards */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                Redeem Rewards
              </h2>
              <div className="space-y-3">
                {rewards.map((reward, index) => {
                  const canRedeem = (loyaltyData?.points || 0) >= reward.points;
                  return (
                    <div
                      key={index}
                      className={`border rounded-xl p-4 flex items-center justify-between ${
                        canRedeem ? 'border-primary/50 bg-primary/5' : 'border-border bg-card opacity-60'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-foreground">{reward.title}</div>
                        <div className="text-sm text-muted-foreground">{reward.description}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${canRedeem ? 'text-primary' : 'text-muted-foreground'}`}>
                          {reward.points.toLocaleString()} pts
                        </div>
                        {canRedeem && (
                          <span className="text-xs text-primary">Available</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Contact us to redeem your rewards
              </p>
            </motion.div>

            {/* Recent Activity */}
            {transactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Recent Activity
                </h2>
                <div className="bg-card border border-border rounded-xl divide-y divide-border">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {tx.description || tx.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className={`font-semibold ${tx.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}