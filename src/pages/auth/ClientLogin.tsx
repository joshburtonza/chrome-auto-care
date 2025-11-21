import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-lg chrome-surface chrome-glow mb-4">
            <Shield className="w-10 h-10 text-primary" strokeWidth={1.4} />
          </div>
          <h1 className="chrome-title text-3xl mb-2">RACE TECHNIK</h1>
          <p className="chrome-label text-text-tertiary">CLIENT PORTAL</p>
        </div>

        <ChromeSurface className="p-8" glow>
          <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={1.4} />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <ChromeButton type="submit" className="w-full" disabled={loading}>
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </ChromeButton>

            <div className="text-center pt-4 border-t border-border/50">
              <p className="text-sm text-text-secondary mb-3">
                Don't have an account?
              </p>
              <ChromeButton variant="outline" asChild>
                <Link to="/auth/signup">CREATE ACCOUNT</Link>
              </ChromeButton>
            </div>

            <div className="text-center text-sm text-text-tertiary space-y-2">
              <Link to="/auth/staff-login" className="block hover:text-primary transition-colors">
                Staff Login →
              </Link>
              <Link to="/" className="block hover:text-primary transition-colors">
                ← Back to home
              </Link>
            </div>
          </form>
        </ChromeSurface>
      </div>
    </div>
  );
};

export default ClientLogin;
