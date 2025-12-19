import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChromeSurface } from '@/components/chrome/ChromeSurface';
import { ChromeButton } from '@/components/chrome/ChromeButton';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const StaffSignup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const token = searchParams.get('token');

  useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    if (!token) {
      setError('No invitation token provided');
      setValidating(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !data) {
        setError('Invalid or expired invitation link');
        setValidating(false);
        return;
      }

      setInvitation(data);
      setEmail(data.email);
    } catch (err) {
      setError('Failed to validate invitation');
    } finally {
      setValidating(false);
    }
  };

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
      // Sign up the user
      const { error: signUpError, data } = await signUp(email, password, fullName);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('An account with this email already exists. Please use staff login.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError('Failed to create account');
        setLoading(false);
        return;
      }

      // Update user role to staff
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'staff' })
        .eq('user_id', data.user.id);

      if (roleError) {
        console.error('Error updating role:', roleError);
      }

      // Create staff profile
      const { error: profileError } = await supabase
        .from('staff_profiles')
        .insert({
          user_id: data.user.id,
          staff_role: invitation.staff_role || 'technician',
          department_id: invitation.department_id,
          job_title: invitation.job_title
        });

      if (profileError) {
        console.error('Error creating staff profile:', profileError);
      }

      // Mark invitation as used
      await supabase
        .from('staff_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      toast.success('Account created successfully! Welcome to the team.');
      navigate('/staff/dashboard');
    } catch (err: any) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ChromeSurface className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
            <ChromeButton asChild>
              <Link to="/auth/staff-login">Go to Staff Login</Link>
            </ChromeButton>
          </ChromeSurface>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 staff-theme">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-lg chrome-surface chrome-glow mb-4">
            <Shield className="w-10 h-10 text-primary" strokeWidth={1.4} />
          </div>
          <h1 className="chrome-title text-3xl mb-2">RACE TECHNIK</h1>
          <p className="chrome-label text-primary">STAFF REGISTRATION</p>
        </div>

        {/* Invitation Info */}
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.4} />
          <p className="text-sm text-primary">
            You've been invited to join as {invitation.job_title || 'Staff Member'}
          </p>
        </div>

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
                  readOnly
                  className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 text-foreground/70 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Email is set from your invitation</p>
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
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
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

            <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
              <Link to="/auth/staff-login" className="hover:text-primary transition-colors">
                Already have an account? Sign in →
              </Link>
            </div>
          </form>
        </ChromeSurface>
      </motion.div>
    </div>
  );
};

export default StaffSignup;
