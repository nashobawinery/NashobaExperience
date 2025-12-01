import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wine,
  Building2,
  GraduationCap,
  FileText,
  BookOpen,
  Wrench,
  Factory,
  ClipboardCheck,
  Headphones,
  ArrowLeft,
  Save,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import type { PlatformModule } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Wine,
  Building2,
  GraduationCap,
  FileText,
  BookOpen,
  Wrench,
  Factory,
  ClipboardCheck,
  Headphones,
};

const progressOptions = [
  { value: "not_started", label: "Not Started", color: "bg-gray-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "in_beta", label: "In Beta", color: "bg-yellow-500" },
  { value: "launched", label: "Launched", color: "bg-green-500" },
  { value: "complete", label: "Complete", color: "bg-emerald-600" },
];

function getProgressBadge(progress: string | null) {
  const option = progressOptions.find(p => p.value === progress) || progressOptions[0];
  return (
    <Badge className={`${option.color} text-white`}>
      {option.label}
    </Badge>
  );
}

export default function ModuleDirectory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [editingProgress, setEditingProgress] = useState<Record<string, string>>({});

  const { data: modules, isLoading } = useQuery<PlatformModule[]>({
    queryKey: ["/api/platform/modules"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const updateModuleMutation = useMutation({
    mutationFn: async (data: { id: string; notes?: string; progress?: string }) => {
      return apiRequest("PATCH", `/api/platform/modules/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/modules"] });
      toast({
        title: "Module updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleNotesChange = (moduleId: string, value: string) => {
    setEditingNotes(prev => ({ ...prev, [moduleId]: value }));
  };

  const handleProgressChange = (moduleId: string, value: string) => {
    setEditingProgress(prev => ({ ...prev, [moduleId]: value }));
    // Auto-save progress changes immediately
    updateModuleMutation.mutate({ id: moduleId, progress: value });
  };

  const saveModuleChanges = (module: PlatformModule) => {
    const updates: { id: string; notes?: string; progress?: string } = { id: module.id };
    
    if (editingNotes[module.id] !== undefined) {
      updates.notes = editingNotes[module.id];
    }
    if (editingProgress[module.id] !== undefined) {
      updates.progress = editingProgress[module.id];
    }

    if (Object.keys(updates).length > 1) {
      updateModuleMutation.mutate(updates);
    }
  };

  const canNavigate = (module: PlatformModule) => {
    const progress = editingProgress[module.id] || module.progress;
    return progress !== "not_started";
  };

  const navigateToModule = (module: PlatformModule) => {
    if (canNavigate(module)) {
      setLocation(module.routePrefix);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin-hub")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Module Directory</h1>
                <p className="text-muted-foreground text-sm">
                  Track progress and manage notes for all platform modules
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/access-control")}
              data-testid="button-access-control"
            >
              <Shield className="h-4 w-4 mr-2" />
              Access Control
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Debug info */}
        {!isLoading && (!modules || modules.length === 0) && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500 rounded-lg text-amber-700">
            No modules found. modules = {JSON.stringify(modules)}
          </div>
        )}
        <div className="grid gap-6">
          {modules?.map((module) => {
            const IconComponent = iconMap[module.icon || "FileText"] || FileText;
            const isExpanded = expandedModules.has(module.id);
            const currentNotes = editingNotes[module.id] ?? module.notes ?? "";
            const currentProgress = editingProgress[module.id] ?? module.progress ?? "not_started";
            const hasChanges = 
              (editingNotes[module.id] !== undefined && editingNotes[module.id] !== (module.notes ?? "")) ||
              (editingProgress[module.id] !== undefined && editingProgress[module.id] !== module.progress);

            return (
              <Card key={module.id} className="overflow-hidden" data-testid={`card-module-${module.moduleKey}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${module.color || 'bg-primary'}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <CardTitle 
                            className={`text-xl ${canNavigate(module) ? 'cursor-pointer hover:text-primary' : 'text-muted-foreground'}`}
                            onClick={() => navigateToModule(module)}
                            data-testid={`link-module-${module.moduleKey}`}
                          >
                            {module.moduleName}
                            {canNavigate(module) && (
                              <ExternalLink className="inline-block ml-2 h-4 w-4" />
                            )}
                          </CardTitle>
                          {getProgressBadge(currentProgress)}
                          <Badge variant="outline" className="text-xs">
                            {module.status}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {module.description}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={currentProgress}
                        onValueChange={(value) => handleProgressChange(module.id, value)}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-progress-${module.moduleKey}`}>
                          <SelectValue placeholder="Progress" />
                        </SelectTrigger>
                        <SelectContent>
                          {progressOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpanded(module.id)}
                        data-testid={`button-expand-${module.moduleKey}`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Notes & Ideas
                        </label>
                        <Textarea
                          value={currentNotes}
                          onChange={(e) => handleNotesChange(module.id, e.target.value)}
                          placeholder="Add your notes, ideas, and thoughts for this module..."
                          className="min-h-[120px] resize-y"
                          data-testid={`textarea-notes-${module.moduleKey}`}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          Route: <code className="bg-muted px-1 py-0.5 rounded">{module.routePrefix}</code>
                        </div>
                        <Button
                          onClick={() => saveModuleChanges(module)}
                          disabled={!hasChanges || updateModuleMutation.isPending}
                          data-testid={`button-save-${module.moduleKey}`}
                        >
                          {updateModuleMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
