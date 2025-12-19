import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StaffNav } from '@/components/staff/StaffNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase, 
  X,
  Edit2,
  Trash2,
  Award,
  UserPlus,
  Loader2,
  UserMinus,
  Send,
  Copy,
  Check,
  Shield,
  Crown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from '@/integrations/supabase/types';

type StaffRole = Database['public']['Enums']['staff_role'];

interface StaffMember {
  id: string;
  user_id: string;
  job_title: string | null;
  department: string | null;
  staff_role: StaffRole | null;
  start_date: string | null;
  skills: string[] | null;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
  };
  email?: string;
}

const departments = [
  'PPF Installation',
  'Detailing',
  'Paint Correction',
  'Vinyl Wrapping',
  'Quality Control',
  'Management',
  'Customer Service'
];

const staffRoles: { value: StaffRole; label: string; icon: typeof Shield }[] = [
  { value: 'technician', label: 'Technician', icon: Users },
  { value: 'senior_technician', label: 'Senior Technician', icon: Award },
  { value: 'team_lead', label: 'Team Lead', icon: Shield },
  { value: 'supervisor', label: 'Supervisor', icon: Shield },
  { value: 'manager', label: 'Manager', icon: Crown },
  { value: 'director', label: 'Director', icon: Crown }
];

const commonSkills = [
  'PPF Installation',
  'Ceramic Coating',
  'Paint Correction',
  'Vinyl Wrapping',
  'Interior Detailing',
  'Exterior Detailing',
  'Window Tinting',
  'Quality Inspection'
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

export default function StaffTeam() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [invitingStaff, setInvitingStaff] = useState(false);
  const [removingStaff, setRemovingStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('technician');
  const [invitationUrl, setInvitationUrl] = useState('');
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    staff_role: 'technician' as StaffRole,
    start_date: '',
    skills: [] as string[],
    notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const { userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect non-admin users
    if (userRole && userRole !== 'admin') {
      navigate('/staff/dashboard');
      return;
    }
    loadStaffMembers();
    
    // Real-time subscription
    const channel = supabase
      .channel('staff-profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_profiles'
      }, () => {
        loadStaffMembers();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_roles'
      }, () => {
        loadStaffMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStaffMembers = async () => {
    try {
      // Get all staff/admin users from user_roles
      const { data: staffRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['staff', 'admin']);

      if (rolesError) throw rolesError;

      const staffUserIds = staffRoles?.map(r => r.user_id) || [];

      if (staffUserIds.length === 0) {
        setStaffMembers([]);
        setLoading(false);
        return;
      }

      // Get profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', staffUserIds);

      if (profilesError) throw profilesError;

      // Get staff profiles
      const { data: staffProfiles, error: staffProfilesError } = await supabase
        .from('staff_profiles')
        .select('*')
        .in('user_id', staffUserIds);

      if (staffProfilesError) throw staffProfilesError;

      // Combine data
      const combinedData: StaffMember[] = staffUserIds.map(userId => {
        const profile = profiles?.find(p => p.id === userId);
        const staffProfile = staffProfiles?.find(sp => sp.user_id === userId);

        return {
          id: staffProfile?.id || '',
          user_id: userId,
          job_title: staffProfile?.job_title || null,
          department: staffProfile?.department || null,
          staff_role: staffProfile?.staff_role || null,
          start_date: staffProfile?.start_date || null,
          skills: staffProfile?.skills || null,
          notes: staffProfile?.notes || null,
          emergency_contact_name: staffProfile?.emergency_contact_name || null,
          emergency_contact_phone: staffProfile?.emergency_contact_phone || null,
          created_at: staffProfile?.created_at || new Date().toISOString(),
          profile: {
            full_name: profile?.full_name || null,
            phone: profile?.phone || null
          }
        };
      });

      setStaffMembers(combinedData);
    } catch (error) {
      console.error('Error loading staff members:', error);
      toast.error('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: StaffMember) => {
    setSelectedMember(member);
    setFormData({
      job_title: member.job_title || '',
      department: member.department || '',
      staff_role: member.staff_role || 'technician',
      start_date: member.start_date || '',
      skills: member.skills || [],
      notes: member.notes || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedMember) return;

    try {
      // Check if staff profile exists
      const existingProfile = staffMembers.find(m => m.user_id === selectedMember.user_id && m.id);

      if (existingProfile?.id) {
        // Update existing
        const { error } = await supabase
          .from('staff_profiles')
          .update({
            job_title: formData.job_title || null,
            department: formData.department || null,
            staff_role: formData.staff_role,
            start_date: formData.start_date || null,
            skills: formData.skills.length > 0 ? formData.skills : null,
            notes: formData.notes || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null
          })
          .eq('id', existingProfile.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('staff_profiles')
          .insert({
            user_id: selectedMember.user_id,
            job_title: formData.job_title || null,
            department: formData.department || null,
            staff_role: formData.staff_role,
            start_date: formData.start_date || null,
            skills: formData.skills.length > 0 ? formData.skills : null,
            notes: formData.notes || null,
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null
          });

        if (error) throw error;
      }

      toast.success('Staff profile updated');
      setIsDialogOpen(false);
      loadStaffMembers();
    } catch (error) {
      console.error('Error saving staff profile:', error);
      toast.error('Failed to save staff profile');
    }
  };

  const handleDeleteProfile = async () => {
    if (!selectedMember?.id) return;

    try {
      const { error } = await supabase
        .from('staff_profiles')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;

      toast.success('Staff profile deleted');
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
      loadStaffMembers();
    } catch (error) {
      console.error('Error deleting staff profile:', error);
      toast.error('Failed to delete staff profile');
    }
  };

  const handleRemoveStaffRole = async () => {
    if (!selectedMember?.user_id) return;

    setRemovingStaff(true);

    try {
      const { data, error } = await supabase.functions.invoke('remove-staff-member', {
        body: { userId: selectedMember.user_id }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Staff member removed');
      setIsRemoveDialogOpen(false);
      setSelectedMember(null);
      loadStaffMembers();
    } catch (error: any) {
      console.error('Error removing staff member:', error);
      toast.error(error.message || 'Failed to remove staff member');
    } finally {
      setRemovingStaff(false);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    setNewSkill('');
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAddStaffMember = async () => {
    if (!newStaffEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaffEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setAddingStaff(true);

    try {
      const { data, error } = await supabase.functions.invoke('add-staff-member', {
        body: { email: newStaffEmail.trim() }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`${data.user?.full_name || data.user?.email} added as staff member`);
      setIsAddDialogOpen(false);
      setNewStaffEmail('');
      loadStaffMembers();
    } catch (error: any) {
      console.error('Error adding staff member:', error);
      toast.error(error.message || 'Failed to add staff member');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleInviteStaff = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInvitingStaff(true);
    setInvitationUrl('');

    try {
      const { data, error } = await supabase.functions.invoke('invite-staff-member', {
        body: { 
          email: inviteEmail.trim(),
          staff_role: inviteRole,
          job_title: inviteJobTitle || null
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setInvitationUrl(data.invitation.invitation_url);
      toast.success('Invitation created! Share the link with the new staff member.');
    } catch (error: any) {
      console.error('Error inviting staff:', error);
      toast.error(error.message || 'Failed to create invitation');
    } finally {
      setInvitingStaff(false);
    }
  };

  const filteredMembers = staffMembers.filter(member => {
    const matchesSearch = 
      member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    const matchesRole = selectedRole === 'all' || member.staff_role === selectedRole;
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background staff-theme pb-24 md:pb-8">
      <StaffNav />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <motion.div 
          className="mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground flex items-center gap-3">
                <Users className="w-7 h-7 text-primary" strokeWidth={1.5} />
                Staff Team
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage staff profiles, skills, and departments
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(true)}
                className="border-border text-foreground hover:bg-muted"
              >
                <Send className="w-4 h-4 mr-2" />
                Invite New Staff
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Existing User
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-3 mb-6"
          {...fadeInUp}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, title, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-40 bg-muted/50 border-border text-foreground">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full sm:w-40 bg-muted/50 border-border text-foreground">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Roles</SelectItem>
              {staffRoles.map(role => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Staff Grid */}
        <div className="grid gap-4">
          {filteredMembers.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-muted-foreground"
              {...fadeInUp}
            >
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No staff members found</p>
            </motion.div>
          ) : (
            filteredMembers.map((member, index) => (
              <motion.div
                key={member.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 sm:p-5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent-dark flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary-foreground">
                      {member.profile?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {member.profile?.full_name || 'Unnamed Staff'}
                      </h3>
                      {member.staff_role && (
                        <Badge className="w-fit bg-primary/20 text-primary text-xs">
                          {staffRoles.find(r => r.value === member.staff_role)?.label || member.staff_role}
                        </Badge>
                      )}
                      {member.department && (
                        <Badge variant="outline" className="w-fit border-border text-muted-foreground text-xs">
                          {member.department}
                        </Badge>
                      )}
                    </div>

                    {member.job_title && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Briefcase className="w-4 h-4" strokeWidth={1.5} />
                        {member.job_title}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                      {member.profile?.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" />
                          {member.profile.phone}
                        </span>
                      )}
                      {member.start_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Started {new Date(member.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    {member.skills && member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {member.skills.map(skill => (
                          <Badge 
                            key={skill} 
                            variant="secondary" 
                            className="bg-muted text-muted-foreground text-xs"
                          >
                            <Award className="w-3 h-3 mr-1" />
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditMember(member)}
                      className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Edit2 className="w-4 h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    {member.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(member);
                        setIsRemoveDialogOpen(true);
                      }}
                      className="border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="w-4 h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Edit Staff Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Job Title</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g. Senior Installer"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                >
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Role Level</Label>
              <Select 
                value={formData.staff_role} 
                onValueChange={(val: StaffRole) => setFormData(prev => ({ ...prev, staff_role: val }))}
              >
                <SelectTrigger className="bg-muted/50 border-border text-foreground">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {staffRoles.map(role => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="bg-muted/50 border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Skills</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.skills.map(skill => (
                  <Badge 
                    key={skill}
                    variant="secondary"
                    className="bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select onValueChange={addSkill}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue placeholder="Add skill..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {commonSkills.filter(s => !formData.skills.includes(s)).map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Custom skill..."
                  className="bg-muted/50 border-border text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && addSkill(newSkill)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSkill(newSkill)}
                  className="border-border"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Emergency Contact</Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  placeholder="Contact name"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Emergency Phone</Label>
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  placeholder="Phone number"
                  className="bg-muted/50 border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="bg-muted/50 border-border text-foreground min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Staff Profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will remove the extended staff profile data (job title, skills, etc.). 
              The user account and basic profile will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Staff Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Staff Member
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Enter the email address of an existing user to add them as a staff member. 
              They must have already created an account.
            </p>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="pl-10 bg-muted/50 border-border text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStaffMember()}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setNewStaffEmail('');
                }}
                className="flex-1 border-border"
                disabled={addingStaff}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddStaffMember}
                disabled={addingStaff || !newStaffEmail.trim()}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {addingStaff ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add as Staff
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Staff Member Confirmation */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-destructive" />
              Remove Staff Member?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will remove <span className="text-foreground font-medium">{selectedMember?.profile?.full_name || 'this user'}</span> from the staff team. 
              They will lose access to the staff portal and their staff profile will be deleted. 
              Their user account will remain active as a client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-border"
              disabled={removingStaff}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveStaffRole}
              disabled={removingStaff}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {removingStaff ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove from Staff'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite New Staff Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
        setIsInviteDialogOpen(open);
        if (!open) {
          setInviteEmail('');
          setInviteJobTitle('');
          setInviteRole('technician');
          setInvitationUrl('');
        }
      }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Invite New Staff Member
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {!invitationUrl ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Send an invitation to someone who doesn't have an account yet.
                </p>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Email Address</Label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="newstaff@example.com"
                    className="bg-muted/50 border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Job Title (Optional)</Label>
                  <Input
                    value={inviteJobTitle}
                    onChange={(e) => setInviteJobTitle(e.target.value)}
                    placeholder="e.g. PPF Installer"
                    className="bg-muted/50 border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Role Level</Label>
                  <Select value={inviteRole} onValueChange={(val: StaffRole) => setInviteRole(val)}>
                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {staffRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                    className="flex-1 border-border"
                    disabled={invitingStaff}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInviteStaff}
                    disabled={invitingStaff || !inviteEmail.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {invitingStaff ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Send Invite</>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Invitation Created!</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this link with {inviteEmail}. It expires in 7 days.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Invitation Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={invitationUrl}
                      readOnly
                      className="bg-muted/50 border-border text-foreground text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(invitationUrl);
                        toast.success('Link copied!');
                      }}
                      className="border-border flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setIsInviteDialogOpen(false)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}