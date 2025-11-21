import { ChromeSurface } from "@/components/chrome/ChromeSurface";
import { ChromeButton } from "@/components/chrome/ChromeButton";
import { User, Mail, Phone, MapPin, Calendar, CreditCard, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        <div className="chrome-label text-primary">LOADING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="chrome-title text-4xl mb-2">PROFILE</h1>
          <p className="text-text-secondary">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <ChromeSurface className="p-8 mb-6" glow>
          <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full chrome-surface flex items-center justify-center chrome-glow">
                <User className="w-10 h-10 text-primary" strokeWidth={1.4} />
              </div>
              <div>
                <h2 className="text-2xl font-light text-foreground mb-1">{profile.full_name || 'Client'}</h2>
                <div className="chrome-label text-[10px] text-text-tertiary">{user?.email}</div>
              </div>
            </div>
            <ChromeButton
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? "Save" : "Edit Profile"}
            </ChromeButton>
          </div>

          <div className="space-y-6">
            {[
              { icon: Mail, label: "Email", value: user?.email || '', field: 'email', disabled: true },
              { icon: Phone, label: "Phone", value: profile.phone, field: 'phone' },
              { icon: MapPin, label: "Address", value: profile.address, field: 'address' },
            ].map((field) => (
              <div key={field.label} className="flex items-start gap-4 pb-6 border-b border-border/30 last:border-0">
                <field.icon className="w-5 h-5 text-primary mt-1" strokeWidth={1.4} />
                <div className="flex-1">
                  <div className="chrome-label text-[10px] text-text-tertiary mb-1">{field.label.toUpperCase()}</div>
                  {isEditing && !field.disabled ? (
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => setProfile({ ...profile, [field.field]: e.target.value })}
                      className="w-full bg-background-alt border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <div className="text-foreground">{field.value || 'Not set'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ChromeSurface>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ChromeSurface className="p-6 chrome-sheen cursor-pointer hover:chrome-glow-strong transition-all" glow>
            <Calendar className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
            <div className="chrome-label text-xs text-foreground mb-1">MY BOOKINGS</div>
            <div className="text-sm text-text-secondary">View all service appointments</div>
          </ChromeSurface>

          <ChromeSurface className="p-6 chrome-sheen cursor-pointer hover:chrome-glow-strong transition-all" glow>
            <CreditCard className="w-6 h-6 text-primary mb-3" strokeWidth={1.4} />
            <div className="chrome-label text-xs text-foreground mb-1">PAYMENT METHODS</div>
            <div className="text-sm text-text-secondary">Manage saved payment options</div>
          </ChromeSurface>
        </div>

        {/* Logout */}
        <ChromeSurface className="p-6" glow>
          <div className="flex items-center justify-between">
            <div>
              <div className="chrome-label text-xs text-foreground mb-1">SIGN OUT</div>
              <div className="text-sm text-text-secondary">End your current session</div>
            </div>
            <ChromeButton variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 w-3 h-3" strokeWidth={1.4} />
              Logout
            </ChromeButton>
          </div>
        </ChromeSurface>
      </div>
    </div>
  );
};

export default Profile;
