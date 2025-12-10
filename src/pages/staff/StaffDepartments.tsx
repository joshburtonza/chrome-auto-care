import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffNav } from '@/components/staff/StaffNav';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const StaffDepartments = () => {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    // Redirect non-admin users
    if (userRole && userRole !== 'admin') {
      navigate('/staff/dashboard');
    }
  }, [userRole, navigate]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Department name is required');
      return;
    }
    try {
      await createDepartment(form.name, form.description);
      toast.success('Department created');
      setIsAddDialogOpen(false);
      setForm({ name: '', description: '' });
    } catch {
      toast.error('Failed to create department');
    }
  };

  const handleUpdate = async () => {
    if (!selectedDepartment || !form.name.trim()) return;
    try {
      await updateDepartment(selectedDepartment.id, {
        name: form.name,
        description: form.description,
      });
      toast.success('Department updated');
      setIsEditDialogOpen(false);
      setSelectedDepartment(null);
      setForm({ name: '', description: '' });
    } catch {
      toast.error('Failed to update department');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment(id);
      toast.success('Department deleted');
    } catch {
      toast.error('Failed to delete department');
    }
  };

  const openEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-6 pb-24 md:pb-10 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background staff-theme">
      <StaffNav />
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-10 max-w-4xl">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Departments</h1>
            <p className="text-sm text-muted-foreground">Manage company departments</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Department Name</Label>
                  <Input 
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Detailing"
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea 
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does this department do..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Department
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {departments.map((dept, index) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => openEdit(dept)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Department?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove this department. Staff members in this department will be unassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(dept.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <h3 className="font-medium text-foreground mb-1">{dept.name}</h3>
              {dept.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{dept.description}</p>
              )}
              
              {!dept.is_active && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">
                  Inactive
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {departments.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No departments yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Department
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedDepartment(null);
            setForm({ name: '', description: '' });
          }
          setIsEditDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Department Name</Label>
                <Input 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Detailing"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea 
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this department do..."
                  rows={3}
                />
              </div>
              <Button onClick={handleUpdate} className="w-full">
                Update Department
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffDepartments;
