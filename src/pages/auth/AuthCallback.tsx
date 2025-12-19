import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery') {
          // Password recovery - redirect to reset password page
          navigate('/auth/reset-password');
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setStatus('error');
            setMessage('Failed to verify email. Please try again.');
            return;
          }

          setStatus('success');
          setMessage('Email verified successfully!');

          // Get user role and redirect appropriately
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .single();

            setTimeout(() => {
              if (roleData?.role === 'staff' || roleData?.role === 'admin') {
                navigate('/staff/dashboard');
              } else {
                navigate('/dashboard');
              }
            }, 1500);
          }
        } else {
          // Check query params as well (different auth flows use different params)
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            setStatus('error');
            setMessage('Invalid or expired verification link.');
            return;
          }

          setStatus('success');
          setMessage('Email verified successfully!');
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg text-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex p-4 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">{message}</h2>
            <p className="text-muted-foreground">Redirecting you to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex p-4 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
              <AlertCircle className="w-12 h-12 text-destructive" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Verification Failed</h2>
            <p className="text-muted-foreground mb-4">{message}</p>
            <a 
              href="/auth/client-login" 
              className="text-primary hover:underline"
            >
              Return to login
            </a>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallback;
