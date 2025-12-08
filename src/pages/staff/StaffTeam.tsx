import { useState, useEffect } from 'react';
import { StaffNav } from '@/components/staff/StaffNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
  Loader2
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

interface StaffMember {
  id: string;
  user_id: string;
  job_title: string | null;
  department: string | null;
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    start_date: '',
    skills: [] as string[],
    notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    loadStaffMembers();
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

  const filteredMembers = staffMembers.filter(member => {
    const matchesSearch = 
      member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDepartment = selectedDepartment === 'all' || member.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(215,20%,8%)] staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(215,20%,8%)] staff-theme">
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
              <h1 className="text-2xl sm:text-3xl font-semibold text-[hsl(218,15%,93%)] flex items-center gap-3">
                <Users className="w-7 h-7 text-[hsl(35,65%,50%)]" strokeWidth={1.5} />
                Staff Team
              </h1>
              <p className="text-[hsl(215,12%,55%)] text-sm mt-1">
                Manage staff profiles, skills, and departments
              </p>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-[hsl(35,65%,50%)] hover:bg-[hsl(35,65%,45%)] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-3 mb-6"
          {...fadeInUp}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,12%,50%)]" />
            <Input
              placeholder="Search by name, title, or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)] placeholder:text-[hsl(215,12%,45%)]"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-full sm:w-48 bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(215,20%,12%)] border-white/[0.08]">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Staff Grid */}
        <div className="grid gap-4">
          {filteredMembers.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-[hsl(215,12%,50%)]"
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
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 sm:p-5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(35,65%,50%)] to-[hsl(35,65%,35%)] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-white">
                      {member.profile?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[hsl(218,15%,93%)]">
                        {member.profile?.full_name || 'Unnamed Staff'}
                      </h3>
                      {member.department && (
                        <Badge variant="outline" className="w-fit border-[hsl(35,65%,50%)]/30 text-[hsl(35,65%,60%)] text-xs">
                          {member.department}
                        </Badge>
                      )}
                    </div>

                    {member.job_title && (
                      <div className="flex items-center gap-2 text-sm text-[hsl(215,12%,55%)] mb-2">
                        <Briefcase className="w-4 h-4" strokeWidth={1.5} />
                        {member.job_title}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[hsl(215,12%,50%)] mb-3">
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
                            className="bg-white/[0.05] text-[hsl(215,12%,70%)] text-xs"
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
                      className="border-white/[0.08] text-[hsl(215,12%,70%)] hover:text-[hsl(218,15%,93%)] hover:bg-white/[0.05]"
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
                        className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[hsl(215,20%,10%)] border-white/[0.08] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[hsl(218,15%,93%)]">
              Edit Staff Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[hsl(215,12%,70%)]">Job Title</Label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  placeholder="e.g. Senior Installer"
                  className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(215,12%,70%)]">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, department: val }))}
                >
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(215,20%,12%)] border-white/[0.08]">
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(215,12%,70%)]">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(215,12%,70%)]">Skills</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.skills.map(skill => (
                  <Badge 
                    key={skill}
                    variant="secondary"
                    className="bg-[hsl(35,65%,50%)]/20 text-[hsl(35,65%,60%)] cursor-pointer hover:bg-[hsl(35,65%,50%)]/30"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select onValueChange={addSkill}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]">
                    <SelectValue placeholder="Add skill..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(215,20%,12%)] border-white/[0.08]">
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
                  className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
                  onKeyDown={(e) => e.key === 'Enter' && addSkill(newSkill)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addSkill(newSkill)}
                  className="border-white/[0.08]"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[hsl(215,12%,70%)]">Emergency Contact</Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  placeholder="Contact name"
                  className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[hsl(215,12%,70%)]">Emergency Phone</Label>
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  placeholder="Phone number"
                  className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[hsl(215,12%,70%)]">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)] min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 border-white/[0.08]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-[hsl(35,65%,50%)] hover:bg-[hsl(35,65%,45%)] text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-[hsl(215,20%,10%)] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(218,15%,93%)]">
              Delete Staff Profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(215,12%,55%)]">
              This will remove the extended staff profile data (job title, skills, etc.). 
              The user account and basic profile will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.08]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProfile}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Staff Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[hsl(215,20%,10%)] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[hsl(218,15%,93%)] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[hsl(35,65%,50%)]" />
              Add Staff Member
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-sm text-[hsl(215,12%,55%)]">
              Enter the email address of an existing user to add them as a staff member. 
              They must have already created an account.
            </p>

            <div className="space-y-2">
              <Label className="text-[hsl(215,12%,70%)]">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,12%,50%)]" />
                <Input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="pl-10 bg-white/[0.03] border-white/[0.08] text-[hsl(218,15%,93%)]"
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
                className="flex-1 border-white/[0.08]"
                disabled={addingStaff}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddStaffMember}
                disabled={addingStaff || !newStaffEmail.trim()}
                className="flex-1 bg-[hsl(35,65%,50%)] hover:bg-[hsl(35,65%,45%)] text-white"
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
    </div>
  );
}