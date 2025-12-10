import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Gift, Copy, Check, Send, UserPlus, Clock, CheckCircle2 } from 'lucide-react';
import { ClientNav } from '@/components/client/ClientNav';
import { BottomNav } from '@/components/client/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Referral {
  id: string;
  referred_email: string;
  referral_code: string;
  status: string;
  reward_points: number;
  created_at: string;
  completed_at: string | null;
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export default function Referrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferrals();
      generateOrGetReferralCode();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadReferrals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) {
      setReferrals(data || []);
    }
    setLoading(false);
  };

  const generateOrGetReferralCode = async () => {
    if (!user) return;

    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      setReferralCode(existing[0].referral_code.split('-')[0]); // Get base code
    } else {
      // Generate new code based on user ID
      const code = user.id.substring(0, 8).toUpperCase();
      setReferralCode(code);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/auth/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Referral link copied!');
  };

  const handleSendInvite = async () => {
    if (!user || !newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      // Generate unique referral code for this invite
      const uniqueCode = `${referralCode}-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from('referrals').insert({
        referrer_id: user.id,
        referred_email: newEmail.trim().toLowerCase(),
        referral_code: uniqueCode,
        status: 'pending',
        reward_points: 500
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already been referred');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Invitation sent! You\'ll earn 500 points when they complete their first booking.');
      setNewEmail('');
      loadReferrals();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-500/10 text-amber-500',
      registered: 'bg-blue-500/10 text-blue-500',
      completed: 'bg-green-500/10 text-green-500',
      rewarded: 'bg-primary/10 text-primary'
    };
    const icons = {
      pending: Clock,
      registered: UserPlus,
      completed: CheckCircle2,
      rewarded: Gift
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalEarned = referrals
    .filter(r => r.status === 'rewarded')
    .reduce((sum, r) => sum + r.reward_points, 0);

  const pendingRewards = referrals
    .filter(r => r.status !== 'rewarded')
    .reduce((sum, r) => sum + r.reward_points, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-10">
        <ClientNav />
        <div className="container mx-auto px-4 py-12 text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Refer Friends & Earn</h2>
          <p className="text-muted-foreground">Sign in to get your referral code and start earning rewards</p>
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
            <Users className="w-7 h-7 text-primary" strokeWidth={1.5} />
            Refer & Earn
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Invite friends and earn 500 points for each successful referral
          </p>
        </motion.div>

        {/* Referral Code Card */}
        <motion.div
          className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center mb-4">
            <div className="text-sm text-muted-foreground mb-2">Your Referral Code</div>
            <div className="text-3xl font-bold text-foreground tracking-widest mb-3">
              {referralCode || '--------'}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareLink}>
                <Send className="w-4 h-4 mr-1" />
                Share Link
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{totalEarned}</div>
              <div className="text-xs text-muted-foreground">Points Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{pendingRewards}</div>
              <div className="text-xs text-muted-foreground">Pending Rewards</div>
            </div>
          </div>
        </motion.div>

        {/* Send Invite */}
        <motion.div
          className="bg-card border border-border rounded-xl p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Invitation
          </h2>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter friend's email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSendInvite} disabled={submitting}>
              {submitting ? 'Sending...' : 'Invite'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            They'll receive an invite to join Race Technik with your referral.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          className="bg-card border border-border rounded-xl p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="text-sm font-medium">Share Your Code</div>
              <div className="text-xs text-muted-foreground">Send your referral code to friends</div>
            </div>
            <div className="text-center p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="text-sm font-medium">They Sign Up</div>
              <div className="text-xs text-muted-foreground">Friend creates an account & books</div>
            </div>
            <div className="text-center p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="text-sm font-medium">Both Earn</div>
              <div className="text-xs text-muted-foreground">You both get 500 bonus points!</div>
            </div>
          </div>
        </motion.div>

        {/* Referral History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Your Referrals ({referrals.length})
          </h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 bg-card border border-border rounded-xl">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No referrals yet. Start sharing your code!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-foreground">{referral.referred_email}</div>
                    <div className="text-xs text-muted-foreground">
                      Invited {format(new Date(referral.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(referral.status)}
                    <div className="text-xs text-muted-foreground mt-1">
                      +{referral.reward_points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}