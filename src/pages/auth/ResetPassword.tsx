import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes to detect when user is authenticated via reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Check if we already have a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/auth/client-login');
      }, 2000);
    } catch (err: any) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div 
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.div 
            className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Shield className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
            Set New Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <ChromeSurface className="p-6 sm:p-8 bg-card/60 backdrop-blur-sm border-border/40">
          {success ? (
            <motion.div 
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="inline-flex p-3 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Password Updated!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your password has been successfully updated. Redirecting to login...
              </p>
            </motion.div>
          ) : !sessionReady ? (
            <motion.div 
              className="text-center py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                <AlertCircle className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Invalid or Expired Link</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <ChromeButton asChild>
                <Link to="/auth/forgot-password">Request New Link</Link>
              </ChromeButton>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              <ChromeButton type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </ChromeButton>

              <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/30">
                <Link to="/auth/client-login" className="hover:text-primary transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </ChromeSurface>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
