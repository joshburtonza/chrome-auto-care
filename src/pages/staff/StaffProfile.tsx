import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StaffNav } from "@/components/staff/StaffNav";
import { MobileStaffNav } from "@/components/staff/MobileStaffNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Shield, LogOut, Save, Edit2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileData {
  full_name: string;
  phone: string;
  address: string;
}

interface StaffProfileData {
  job_title: string | null;
  department: string | null;
  staff_role: string | null;
  start_date: string | null;
  skills: string[] | null;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

const StaffProfile = () => {
  const { user, userRole, signOut } = useAuth();
  const isAdmin = userRole === 'admin';
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    phone: "",
    address: "",
  });

  const [staffProfile, setStaffProfile] = useState<StaffProfileData>({
    job_title: null,
    department: null,
    staff_role: null,
    start_date: null,
    skills: null,
    notes: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
  });

  useEffect(() => {
    if (user) {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    try {
      // Load basic profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          address: profileData.address || '',
        });
      }

      // Load staff profile using safe function that hides emergency contacts for non-admins
      const { data: staffData, error: staffError } = await supabase
        .rpc('get_staff_profile_safe', { p_user_id: user?.id });

      if (staffError) throw staffError;

      if (staffData && staffData.length > 0) {
        const row = staffData[0];
        setStaffProfile({
          job_title: row.job_title,
          department: row.department,
          staff_role: row.staff_role,
          start_date: row.start_date,
          skills: row.skills,
          notes: row.notes,
          emergency_contact_name: row.emergency_contact_name,
          emergency_contact_phone: row.emergency_contact_phone,
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
    setSaving(true);
    try {
      // Update basic profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Update staff profile (emergency contacts only for admins)
      if (isAdmin) {
        const { error: staffError } = await supabase
          .from('staff_profiles')
          .update({
            emergency_contact_name: staffProfile.emergency_contact_name,
            emergency_contact_phone: staffProfile.emergency_contact_phone,
          })
          .eq('user_id', user?.id);

        if (staffError) throw staffError;
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      toast.success('Signed out successfully');
    }
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'director': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'supervisor': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'team_lead': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'senior_technician': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {isMobile ? <MobileStaffNav /> : <StaffNav />}
        <div className={`${isMobile ? 'pt-4 pb-24 px-4' : 'md:ml-64 p-6'}`}>
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isMobile ? <MobileStaffNav /> : <StaffNav />}
      
      <div className={`${isMobile ? 'pt-4 pb-24 px-4' : 'md:ml-64 p-6'}`}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
              <p className="text-muted-foreground text-sm">Manage your account information</p>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={saving}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-border/50">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-medium">{profile.full_name || 'Staff Member'}</span>
                    {userRole && (
                      <Badge variant="outline" className="capitalize">
                        {userRole}
                      </Badge>
                    )}
                    {staffProfile.staff_role && (
                      <Badge variant="outline" className={getRoleBadgeColor(staffProfile.staff_role)}>
                        {staffProfile.staff_role?.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-sm py-2">{profile.full_name || 'Not set'}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <p className="text-sm py-2 text-muted-foreground">{user?.email}</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-sm py-2">{profile.phone || 'Not set'}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Address
                  </Label>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Enter your address"
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm py-2">{profile.address || 'Not set'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information (Read-only, managed by admin) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="w-5 h-5" />
                Work Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Job Title</Label>
                  <p className="text-sm font-medium">{staffProfile.job_title || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Department</Label>
                  <p className="text-sm font-medium">{staffProfile.department || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Start Date</Label>
                  <p className="text-sm font-medium">
                    {staffProfile.start_date 
                      ? new Date(staffProfile.start_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Role Level</Label>
                  <p className="text-sm font-medium capitalize">
                    {staffProfile.staff_role?.replace('_', ' ') || 'Not assigned'}
                  </p>
                </div>
              </div>

              {staffProfile.skills && staffProfile.skills.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Skills</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {staffProfile.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                Work information is managed by your administrator
              </p>
            </CardContent>
          </Card>

          {/* Emergency Contact - Only visible to admins */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergency_name">Contact Name</Label>
                    {isEditing ? (
                      <Input
                        id="emergency_name"
                        value={staffProfile.emergency_contact_name || ''}
                        onChange={(e) => setStaffProfile({ ...staffProfile, emergency_contact_name: e.target.value })}
                        placeholder="Emergency contact name"
                      />
                    ) : (
                      <p className="text-sm py-2">{staffProfile.emergency_contact_name || 'Not set'}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="emergency_phone">Contact Phone</Label>
                    {isEditing ? (
                      <Input
                        id="emergency_phone"
                        value={staffProfile.emergency_contact_phone || ''}
                        onChange={(e) => setStaffProfile({ ...staffProfile, emergency_contact_phone: e.target.value })}
                        placeholder="Emergency contact phone"
                      />
                    ) : (
                      <p className="text-sm py-2">{staffProfile.emergency_contact_phone || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">End your current session</p>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
