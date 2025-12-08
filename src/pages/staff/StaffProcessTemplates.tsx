import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, GripVertical, Clock, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StaffNav } from '@/components/staff/StaffNav';
import { useProcessTemplates, ProcessTemplate, ProcessTemplateStage } from '@/hooks/useProcessTemplates';
import { toast } from 'sonner';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const StaffProcessTemplates = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, addStage, updateStage, deleteStage } = useProcessTemplates();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProcessTemplate | null>(null);
  const [selectedStage, setSelectedStage] = useState<ProcessTemplateStage | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    is_default: false,
  });
  
  const [stageForm, setStageForm] = useState({
    stage_name: '',
    description: '',
    requires_photo: false,
    estimated_duration_minutes: '',
  });

  const toggleExpanded = (id: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateTemplate = async () => {
    try {
      await createTemplate(templateForm.name, templateForm.description, undefined, templateForm.is_default);
      toast.success('Template created');
      setIsAddDialogOpen(false);
      setTemplateForm({ name: '', description: '', is_default: false });
    } catch {
      toast.error('Failed to create template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteTemplate(id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleAddStage = async () => {
    if (!selectedTemplate) return;
    try {
      const nextOrder = (selectedTemplate.stages?.length || 0) + 1;
      await addStage(
        selectedTemplate.id,
        stageForm.stage_name,
        nextOrder,
        stageForm.description,
        stageForm.requires_photo,
        stageForm.estimated_duration_minutes ? parseInt(stageForm.estimated_duration_minutes) : undefined
      );
      toast.success('Stage added');
      setIsStageDialogOpen(false);
      setStageForm({ stage_name: '', description: '', requires_photo: false, estimated_duration_minutes: '' });
    } catch {
      toast.error('Failed to add stage');
    }
  };

  const handleUpdateStage = async () => {
    if (!selectedStage) return;
    try {
      await updateStage(selectedStage.id, {
        stage_name: stageForm.stage_name,
        description: stageForm.description,
        requires_photo: stageForm.requires_photo,
        estimated_duration_minutes: stageForm.estimated_duration_minutes ? parseInt(stageForm.estimated_duration_minutes) : null,
      });
      toast.success('Stage updated');
      setIsStageDialogOpen(false);
      setSelectedStage(null);
      setStageForm({ stage_name: '', description: '', requires_photo: false, estimated_duration_minutes: '' });
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await deleteStage(stageId);
      toast.success('Stage deleted');
    } catch {
      toast.error('Failed to delete stage');
    }
  };

  const openEditStage = (stage: ProcessTemplateStage) => {
    setSelectedStage(stage);
    setStageForm({
      stage_name: stage.stage_name,
      description: stage.description || '',
      requires_photo: stage.requires_photo,
      estimated_duration_minutes: stage.estimated_duration_minutes?.toString() || '',
    });
    setIsStageDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background staff-theme">
        <StaffNav />
        <div className="container mx-auto px-4 py-6 pb-24 md:pb-10 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
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
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Process Templates</h1>
            <p className="text-sm text-muted-foreground">Manage workflow templates for services</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Template Name</Label>
                  <Input 
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Full PPF Package"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea 
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Describe this workflow..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Set as Default Template</Label>
                  <Switch 
                    checked={templateForm.is_default}
                    onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked })}
                  />
                </div>
                <Button onClick={handleCreateTemplate} className="w-full">
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Templates List */}
        <div className="space-y-4">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              <Collapsible open={expandedTemplates.has(template.id)} onOpenChange={() => toggleExpanded(template.id)}>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <button className="p-1 hover:bg-muted rounded">
                        {expandedTemplates.has(template.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{template.name}</h3>
                        {template.is_default && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Default</span>
                        )}
                        {!template.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {template.stages?.length || 0} stages
                        {template.description && ` • ${template.description}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this template and all its stages.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="border-t border-border p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-foreground">Stages</h4>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setSelectedStage(null);
                          setStageForm({ stage_name: '', description: '', requires_photo: false, estimated_duration_minutes: '' });
                          setIsStageDialogOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Stage
                      </Button>
                    </div>
                    
                    {template.stages && template.stages.length > 0 ? (
                      <div className="space-y-2">
                        {template.stages.map((stage) => (
                          <div 
                            key={stage.id}
                            className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                {stage.stage_order}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground">{stage.stage_name}</span>
                                  {stage.requires_photo && (
                                    <Camera className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  {stage.estimated_duration_minutes && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {stage.estimated_duration_minutes}m
                                    </span>
                                  )}
                                </div>
                                {stage.description && (
                                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => openEditStage(stage)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Stage?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove this stage from the template.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStage(stage.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No stages yet. Add stages to define the workflow.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No process templates yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Template
            </Button>
          </div>
        )}

        {/* Stage Dialog */}
        <Dialog open={isStageDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setSelectedStage(null);
            setStageForm({ stage_name: '', description: '', requires_photo: false, estimated_duration_minutes: '' });
          }
          setIsStageDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedStage ? 'Edit Stage' : 'Add Stage'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Stage Name</Label>
                <Input 
                  value={stageForm.stage_name}
                  onChange={(e) => setStageForm({ ...stageForm, stage_name: e.target.value })}
                  placeholder="e.g., Surface Preparation"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea 
                  value={stageForm.description}
                  onChange={(e) => setStageForm({ ...stageForm, description: e.target.value })}
                  placeholder="Brief description of this stage..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Estimated Duration (minutes)</Label>
                <Input 
                  type="number"
                  value={stageForm.estimated_duration_minutes}
                  onChange={(e) => setStageForm({ ...stageForm, estimated_duration_minutes: e.target.value })}
                  placeholder="e.g., 60"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Requires Photo</Label>
                <Switch 
                  checked={stageForm.requires_photo}
                  onCheckedChange={(checked) => setStageForm({ ...stageForm, requires_photo: checked })}
                />
              </div>
              <Button 
                onClick={selectedStage ? handleUpdateStage : handleAddStage} 
                className="w-full"
              >
                {selectedStage ? 'Update Stage' : 'Add Stage'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StaffProcessTemplates;
