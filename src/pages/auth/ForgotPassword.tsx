import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { Shield, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
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
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive a password reset link
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
              <h3 className="text-lg font-medium text-foreground mb-2">Check Your Email</h3>
              <p className="text-sm text-muted-foreground mb-6">
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your inbox and follow the instructions.
              </p>
              <ChromeButton variant="outline" asChild>
                <Link to="/auth/client-login">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Link>
              </ChromeButton>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg pl-10 pr-4 py-3 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    placeholder="your.email@example.com"
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </ChromeButton>

              <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t border-border/30">
                <Link to="/auth/client-login" className="block hover:text-primary transition-colors">
                  ← Back to Client Login
                </Link>
                <Link to="/auth/staff-login" className="block hover:text-primary transition-colors">
                  Staff Login →
                </Link>
              </div>
            </form>
          )}
        </ChromeSurface>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
