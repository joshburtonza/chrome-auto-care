import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      // Check if user is a client
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .single();

        if (roleData?.role === 'staff' || roleData?.role === 'admin') {
          await supabase.auth.signOut();
          setError('Please use the staff login portal');
          setLoading(false);
          return;
        }
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      setError('An unexpected error occurred');
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
            Race Technik
          </h1>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Client Portal</p>
        </div>

        <ChromeSurface className="p-6 sm:p-8 bg-card/60 backdrop-blur-sm border-border/40">
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <Link 
                  to="/auth/forgot-password" 
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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
              {loading ? 'Signing in...' : 'Sign In'}
            </ChromeButton>

            <div className="text-center pt-4 border-t border-border/30">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have an account?
              </p>
              <ChromeButton variant="outline" className="w-full" asChild>
                <Link to="/auth/signup">Create Account</Link>
              </ChromeButton>
            </div>

            <div className="text-center text-sm text-muted-foreground space-y-2 pt-2">
              <Link to="/auth/staff-login" className="block hover:text-primary transition-colors">
                Staff Login →
              </Link>
              <Link to="/" className="block hover:text-primary transition-colors">
                ← Back to home
              </Link>
            </div>
          </form>
        </ChromeSurface>
      </motion.div>
    </div>
  );
};

export default ClientLogin;
