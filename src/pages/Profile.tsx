import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { User, Mail, Phone, MapPin, Calendar, CreditCard, LogOut, Bell } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProfileSkeleton } from "@/components/skeletons/PageSkeletons";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    full_name: string;
    phone: string;
    address: string;
  }>({
    full_name: "",
    phone: "",
    address: "",
  });
  
  // Enable swipe navigation on mobile
  useSwipeNavigation();
  
  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await loadProfile();
    toast.success('Profile refreshed');
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      toast.success('Signed out successfully');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <ProfileSkeleton />
      </div>
    );
  }

  const content = (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 max-w-2xl">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
            Profile
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your account information
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div {...fadeInUp}>
          <ChromeSurface className="p-6 mb-4" glow>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <User className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-foreground mb-0.5">
                    {profile.full_name || 'Client'}
                  </h2>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              <ChromeButton
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? "Save Changes" : "Edit Profile"}
              </ChromeButton>
            </div>

            <div className="space-y-4">
              {[
                { icon: User, label: "Full Name", value: profile.full_name, field: 'full_name', disabled: false },
                { icon: Mail, label: "Email", value: user?.email || '', field: 'email', disabled: true },
                { icon: Phone, label: "Phone", value: profile.phone, field: 'phone', disabled: false },
                { icon: MapPin, label: "Address", value: profile.address, field: 'address', disabled: false },
              ].map((field) => (
                <div key={field.label} className="flex items-start gap-3 pb-4 border-b border-border/30 last:border-0 last:pb-0">
                  <field.icon className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={1.5} />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {field.label}
                    </div>
                    {isEditing && !field.disabled ? (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => setProfile({ ...profile, [field.field]: e.target.value })}
                        className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    ) : (
                      <div className="text-sm text-foreground">{field.value || 'Not set'}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ChromeSurface>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Link to="/bookings">
            <ChromeSurface className="p-5" sheen>
              <Calendar className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
              <div className="text-sm font-medium text-foreground mb-0.5">My Bookings</div>
              <div className="text-xs text-muted-foreground">View appointments</div>
            </ChromeSurface>
          </Link>

          <Dialog>
            <DialogTrigger asChild>
              <ChromeSurface className="p-5 cursor-pointer" sheen>
                <Bell className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
                <div className="text-sm font-medium text-foreground mb-0.5">Notifications</div>
                <div className="text-xs text-muted-foreground">Manage alerts</div>
              </ChromeSurface>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Notification Settings</DialogTitle>
              </DialogHeader>
              <NotificationSettings />
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Quick Actions Row 2 */}
        <motion.div 
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <ChromeSurface className="p-5" sheen>
            <CreditCard className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium text-foreground mb-0.5">Payment Methods</div>
            <div className="text-xs text-muted-foreground">Manage payments</div>
          </ChromeSurface>

          <Link to="/orders">
            <ChromeSurface className="p-5" sheen>
              <MapPin className="w-5 h-5 text-muted-foreground mb-3" strokeWidth={1.5} />
              <div className="text-sm font-medium text-foreground mb-0.5">Order History</div>
              <div className="text-xs text-muted-foreground">Past purchases</div>
            </ChromeSurface>
          </Link>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ChromeSurface className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground mb-0.5">Sign Out</div>
                <div className="text-xs text-muted-foreground">End your current session</div>
              </div>
              <ChromeButton variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 w-4 h-4" strokeWidth={1.5} />
                Logout
              </ChromeButton>
            </div>
          </ChromeSurface>
        </motion.div>
      </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      ) : (
        content
      )}
    </div>
  );
};

export default Profile;
