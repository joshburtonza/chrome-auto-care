import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { User, Mail, Phone, MapPin, Calendar, CreditCard, LogOut, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientNav } from "@/components/client/ClientNav";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    address: "",
  });

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
        .update(profile)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-primary font-medium tracking-wider"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <ClientNav />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl relative">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Profile
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base ml-9 sm:ml-11">
            Manage your account information and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div {...fadeInUp}>
          <ChromeSurface className="p-5 sm:p-6 mb-4 sm:mb-5 bg-card/60 backdrop-blur-sm border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-medium text-foreground mb-0.5">
                    {profile.full_name || 'Client'}
                  </h2>
                  <div className="text-xs sm:text-sm text-muted-foreground">{user?.email}</div>
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
                { icon: Mail, label: "Email", value: user?.email || '', field: 'email', disabled: true },
                { icon: Phone, label: "Phone", value: profile.phone, field: 'phone' },
                { icon: MapPin, label: "Address", value: profile.address, field: 'address' },
              ].map((field) => (
                <div key={field.label} className="flex items-start gap-3 pb-4 border-b border-border/20 last:border-0 last:pb-0">
                  <field.icon className="w-4 h-4 text-primary mt-1" strokeWidth={1.5} />
                  <div className="flex-1">
                    <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                      {field.label}
                    </div>
                    {isEditing && !field.disabled ? (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => setProfile({ ...profile, [field.field]: e.target.value })}
                        className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
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
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 sm:mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link to="/bookings">
            <ChromeSurface className="p-4 sm:p-5 bg-card/40 backdrop-blur-sm border-border/30 cursor-pointer hover:bg-card/60 hover:border-primary/20 transition-all group">
              <Calendar className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <div className="text-sm font-medium text-foreground mb-0.5">My Bookings</div>
              <div className="text-xs text-muted-foreground">View all service appointments</div>
            </ChromeSurface>
          </Link>

          <ChromeSurface className="p-4 sm:p-5 bg-card/40 backdrop-blur-sm border-border/30 cursor-pointer hover:bg-card/60 hover:border-primary/20 transition-all group">
            <CreditCard className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
            <div className="text-sm font-medium text-foreground mb-0.5">Payment Methods</div>
            <div className="text-xs text-muted-foreground">Manage saved payment options</div>
          </ChromeSurface>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <ChromeSurface className="p-4 sm:p-5 bg-card/40 backdrop-blur-sm border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground mb-0.5">Sign Out</div>
                <div className="text-xs text-muted-foreground">End your current session</div>
              </div>
              <ChromeButton variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 w-3.5 h-3.5" strokeWidth={1.5} />
                Logout
              </ChromeButton>
            </div>
          </ChromeSurface>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
