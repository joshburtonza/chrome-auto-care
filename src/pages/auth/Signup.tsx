import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, User, AlertCircle, CheckCircle2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Capture referral code from URL
  const referralCode = searchParams.get('ref');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError, data } = await signUp(email, password, fullName);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // If we have a referral code and signup was successful, update the referral
      if (referralCode && data?.user) {
        try {
          // Find and update the referral record
          const { error: referralError } = await supabase
            .from('referrals')
            .update({
              referred_user_id: data.user.id,
              status: 'registered'
            })
            .eq('referral_code', referralCode)
            .eq('status', 'pending');

          if (!referralError) {
            toast.success('Referral bonus will be credited when you complete your first booking!');
          }
        } catch (refErr) {
          console.error('Error updating referral:', refErr);
          // Don't fail signup if referral update fails
        }
      }

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-lg chrome-surface chrome-glow mb-4">
            <Shield className="w-10 h-10 text-primary" strokeWidth={1.4} />
          </div>
          <h1 className="chrome-title text-3xl mb-2">RACE TECHNIK</h1>
          <p className="chrome-label text-text-tertiary">CREATE YOUR ACCOUNT</p>
        </div>

        {/* Referral Banner */}
        {referralCode && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.4} />
            <p className="text-sm text-primary">
              You were referred by a friend! Complete your first booking to earn rewards.
            </p>
          </div>
        )}

        {/* Signup Form */}
        <ChromeSurface className="p-8" glow>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="chrome-label mb-2">FULL NAME</div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.4} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-background-alt border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="John Smith"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="chrome-label mb-2">EMAIL ADDRESS</div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.4} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background-alt border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="your.email@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="chrome-label mb-2">PASSWORD</div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.4} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background-alt border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-text-tertiary mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <div className="chrome-label mb-2">CONFIRM PASSWORD</div>
              <div className="relative">
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.4} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background-alt border border-border rounded-lg pl-10 pr-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={1.4} />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <ChromeButton type="submit" className="w-full" disabled={loading}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </ChromeButton>

            <div className="text-center pt-4 border-t border-border/50">
              <p className="text-sm text-text-secondary mb-3">
                Already have an account?
              </p>
              <ChromeButton variant="outline" asChild>
                <Link to="/auth/client-login">SIGN IN</Link>
              </ChromeButton>
            </div>

            <div className="text-center">
              <Link to="/" className="text-sm text-text-tertiary hover:text-primary transition-colors">
                ← Back to home
              </Link>
            </div>
          </form>
        </ChromeSurface>
      </div>
    </div>
  );
};

export default Signup;