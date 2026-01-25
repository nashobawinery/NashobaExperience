import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, BookOpen, GraduationCap, Clock, CheckCircle, AlertTriangle, Play, Loader2, CalendarIcon, ClipboardCheck, ChevronDown, ChevronRight, ChevronUp, Users, FileCheck, ArrowLeft, User, Award, Star, XCircle, Monitor, Bell, Phone, Shield, Building2, RotateCcw, MessageSquare, Trash2, Edit, FileText, Upload, X, Image as ImageIcon, FileQuestion, GripVertical, Pencil, Save, Info, Mail } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useFacility } from "@/lib/facility-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { StaffCourse, StaffCourseAssignment, Staff, CompetencyModule, CompetencySection, CompetencyItem, StaffCompetencyAssessment, StaffCompetencySectionResponse, StaffCompetencyItemResponse } from "@shared/schema";
import { TrainingPortalSettingsDialog } from "@/components/TrainingPortalSettingsDialog";

const CATEGORIES = [
  { value: "clinical", label: "Clinical Training" },
  { value: "safety", label: "Safety & Emergency" },
  { value: "compliance", label: "Regulatory Compliance" },
  { value: "orientation", label: "New Employee Orientation" },
  { value: "skills", label: "Skills Development" },
];

const COURSE_TYPES = [
  { value: "self_paced", label: "Self-Paced Online" },
  { value: "instructor_led", label: "Instructor-Led" },
  { value: "external", label: "External/Third Party" },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  assigned: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Assigned" },
  in_progress: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "In Progress" },
  completed: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Completed" },
  expired: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Expired" },
  waived: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300", label: "Waived" },
};

const ASSESSMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  assigned: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", label: "Assigned" },
  in_progress: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", label: "In Progress" },
  pending_approval: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300", label: "Pending Approval" },
  approved: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", label: "Approved" },
  rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", label: "Needs Retraining" },
};

const ASSESSMENT_TYPE_CONFIG: Record<string, string> = {
  upon_hire: "Upon Hire",
  annual: "Annual Renewal",
  after_issue: "After Performance/Compliance Issue",
};

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "multiple_select", label: "Multiple Select" },
  { value: "short_answer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
];

const CONTENT_BLOCK_TYPES = [
  { value: "text", label: "Text Content" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF Document" },
  { value: "quiz", label: "Quiz" },
  { value: "scorm", label: "SCORM Package" },
];

// Front Desk Training Content embedded component
const FD_TRAINING_SECTIONS = [
  { id: "overview", title: "Front Desk Control Center Overview", icon: Monitor, description: "Your command station for managing daily operations.", keyPoints: ["Central hub for all front desk operations", "Real-time status updates for residents and visitors", "Quick access to emergency contacts and procedures"] },
  { id: "wellness-checks", title: "Wellness Check Management", icon: ClipboardCheck, description: "EOEA 651 CMR 12 requires visual checks at least twice daily.", keyPoints: ["Morning and evening wellness checks are mandatory", "Green/Yellow/Red status indicators for check timing", "All checks are timestamped for compliance audits"] },
  { id: "visitor-management", title: "Visitor Check-In/Check-Out", icon: Users, description: "Managing visitor access for resident safety.", keyPoints: ["Verify identity with valid ID", "Complete health screening questions", "Track all visitor activity in the log"] },
  { id: "resident-awareness", title: "Resident Awareness", icon: User, description: "Understanding each resident's needs and care requirements.", keyPoints: ["Access care levels (IL, AL, MC, SN)", "Know dietary restrictions and preferences", "Maintain authorized contacts list"] },
  { id: "communication", title: "Communication & Documentation", icon: MessageSquare, description: "Effective communication ensures continuity of care.", keyPoints: ["Document ALL phone calls", "Complete shift handoff notes before leaving", "Use messaging system for internal communication"] },
  { id: "maintenance", title: "Maintenance Request Management", icon: Building2, description: "Submit and track maintenance work orders.", keyPoints: ["Choose correct priority level", "Mark water leaks as Emergency", "Track work order status to completion"] },
  { id: "emergency", title: "Emergency Procedures", icon: AlertTriangle, description: "Critical role in emergency response.", keyPoints: ["Know evacuation routes", "Call 911 for medical emergencies", "Follow fire alarm protocols"] },
  { id: "professionalism", title: "Professional Standards", icon: Shield, description: "Maintain highest professional standards.", keyPoints: ["HIPAA confidentiality is mandatory", "Greet visitors within 10 seconds", "Professional appearance and demeanor"] },
];

const FD_QUIZ_QUESTIONS = [
  { id: 1, question: "What do the wellness check status colors indicate?", options: ["Personal preferences", "Green = checked, Yellow = due soon, Red = OVERDUE", "Resident mood levels", "Room temperature settings"], correctAnswer: 1, explanation: "Status colors help quickly identify which residents need attention: Green (checked), Yellow (due soon), Red (overdue)." },
  { id: 2, question: "What information must be verified for ALL visitors?", options: ["Social media profiles", "Employment history", "Credit score", "Valid ID and health screening"], correctAnswer: 3, explanation: "All visitors must present valid ID and complete health screening to protect residents." },
  { id: 3, question: "A family member calls upset about their loved one's care. What should you do?", options: ["Transfer immediately to voicemail", "Document and advise you'll have supervisor follow up", "Argue with them", "Hang up"], correctAnswer: 1, explanation: "Document the concern, remain calm, and arrange supervisor follow-up." },
  { id: 4, question: "A resident falls and appears injured. What is your FIRST action?", options: ["Move them to their room", "Call 911 and stay with resident", "Wait for family to arrive", "Complete incident report first"], correctAnswer: 1, explanation: "Resident safety first - call 911 immediately and stay with the resident." },
  { id: 5, question: "What priority should a water leak be marked as?", options: ["Low", "Medium", "Emergency", "Routine"], correctAnswer: 2, explanation: "Water leaks are safety hazards that can cause falls - mark as Emergency." },
  { id: 6, question: "What must ALL visitors do before being allowed entry?", options: ["Pay a fee", "Present ID and complete health screening", "Schedule 24 hours in advance", "Bring a gift"], correctAnswer: 1, explanation: "All visitors must present valid ID and complete health screening." },
  { id: 7, question: "What does HIPAA require regarding resident information?", options: ["Share with all staff", "Post on bulletin board", "Maintain strict confidentiality", "Discuss openly"], correctAnswer: 2, explanation: "HIPAA requires strict confidentiality - only share with authorized individuals." },
  { id: 8, question: "When should you document a phone call?", options: ["Only emergencies", "Only when requested", "ALL phone calls", "Only when supervisor watches"], correctAnswer: 2, explanation: "Document ALL calls to create audit trail and ensure shift continuity." },
  { id: 9, question: "How quickly should you greet someone entering the lobby?", options: ["When you finish your task", "Within 10 seconds", "Only if they approach", "After they sign in"], correctAnswer: 1, explanation: "Greet everyone within 10 seconds - first impressions matter." },
  { id: 10, question: "During a fire alarm, what is your PRIMARY responsibility?", options: ["Save documents", "Call 911, then assist evacuation", "Wait for fire department", "Continue checking in visitors"], correctAnswer: 1, explanation: "Call 911 and begin evacuation according to posted routes." },
  { id: 11, question: "What care level designation indicates Memory Care?", options: ["IL", "AL", "MC", "SN"], correctAnswer: 2, explanation: "MC indicates Memory Care - residents may have cognitive impairments." },
  { id: 12, question: "When should you complete shift handoff notes?", options: ["Next morning", "Only if unusual", "Before leaving your shift", "Once a week"], correctAnswer: 2, explanation: "Complete handoff notes before leaving for shift continuity." },
];

const FD_PASSING_SCORE = 80;

// Check if a URL is an uploaded video file (vs YouTube/Vimeo embed)
const isUploadedVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Uploaded videos are stored in object storage and have these patterns
  return url.includes('storage.googleapis.com') || 
         url.includes('replit-objstore') ||
         url.includes('/objects/uploads/') ||
         url.includes('.private/uploads/') ||
         url.startsWith('/api/objects/') ||
         url.endsWith('.mp4') || 
         url.endsWith('.webm') || 
         url.endsWith('.ogg');
};

// Parse video input and extract proper embed URL
// Handles: iframe embed codes, YouTube watch URLs, YouTube short URLs, Vimeo URLs
const parseVideoUrl = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Check if it's an iframe embed code - extract the src
  const iframeSrcMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrcMatch) {
    return iframeSrcMatch[1];
  }
  
  // YouTube watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const youtubeWatchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]+)/);
  if (youtubeWatchMatch) {
    return `https://www.youtube.com/embed/${youtubeWatchMatch[1]}`;
  }
  
  // YouTube short URL: https://youtu.be/VIDEO_ID
  const youtubeShortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (youtubeShortMatch) {
    return `https://www.youtube.com/embed/${youtubeShortMatch[1]}`;
  }
  
  // Vimeo URL: https://vimeo.com/VIDEO_ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && !trimmed.includes('player.vimeo.com')) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  
  // Already a valid embed URL or other URL - return as-is
  return trimmed;
};

// Sortable Page Item component for drag-and-drop reordering
function SortablePageItem({ 
  page, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: { 
  page: any; 
  isSelected: boolean; 
  onSelect: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        data-testid={`drag-handle-page-${page.id}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Button 
        variant={isSelected ? "default" : "outline"} 
        size="sm"
        onClick={onSelect}
        data-testid={`button-page-${page.id}`}
      >
        Page {page.pageNumber}: {page.title}
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8"
        onClick={onEdit}
        data-testid={`button-edit-page-${page.id}`}
      >
        <Edit className="h-3 w-3" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`button-delete-page-${page.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{page.title}"? This will also delete all content blocks on this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FrontDeskTrainingContent({ onComplete }: { onComplete?: () => void }) {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<"sections" | "quiz" | "results">("sections");
  const [expandedSection, setExpandedSection] = useState<string | null>("overview");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizStartTime] = useState<Date>(new Date());

  const { data: completions = [] } = useQuery<any[]>({
    queryKey: ["/api/training-quiz-completions", { staffId: "current" }],
    queryFn: async () => {
      const response = await fetch("/api/training-quiz-completions?staffId=current", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    }
  });

  const latestPass = completions.find((c: any) => c.trainingModule === "front_desk_control_center" && c.status === "passed");

  const saveQuizMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/training-quiz-completions", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-quiz-completions"] });
      if (data.status === "passed") {
        toast({ title: "Certification Saved", description: "Your training completion has been recorded." });
      }
    },
  });

  const handleSubmitQuiz = () => {
    const correctCount = FD_QUIZ_QUESTIONS.reduce((count, q) => count + (quizAnswers[q.id] === q.correctAnswer ? 1 : 0), 0);
    const score = Math.round((correctCount / FD_QUIZ_QUESTIONS.length) * 100);
    const timeSpentMinutes = Math.round((new Date().getTime() - quizStartTime.getTime()) / 60000);
    setQuizScore(score);
    setCurrentView("results");
    saveQuizMutation.mutate({
      trainingModule: "front_desk_control_center",
      score,
      totalQuestions: FD_QUIZ_QUESTIONS.length,
      correctAnswers: correctCount,
      passingScore: FD_PASSING_SCORE,
      timeSpentMinutes,
    });
  };

  const allAnswered = Object.keys(quizAnswers).length === FD_QUIZ_QUESTIONS.length;
  const passed = quizScore >= FD_PASSING_SCORE;

  if (currentView === "results") {
    const correctCount = FD_QUIZ_QUESTIONS.reduce((count, q) => count + (quizAnswers[q.id] === q.correctAnswer ? 1 : 0), 0);
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {passed ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
          </div>
          <h3 className="text-xl font-bold">{passed ? "Congratulations! You Passed!" : "Additional Training Required"}</h3>
          <p className="text-muted-foreground">{passed ? "You have successfully completed the training." : `You scored ${quizScore}%. A minimum of ${FD_PASSING_SCORE}% is required.`}</p>
          <div className="text-4xl font-bold mt-4">{quizScore}%</div>
          <p className="text-sm text-muted-foreground">{correctCount} of {FD_QUIZ_QUESTIONS.length} correct</p>
          <Progress value={quizScore} className="mt-4 max-w-md mx-auto" />
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView("sections")} data-testid="button-review-training">
            <ArrowLeft className="h-4 w-4 mr-2" /> Review Training
          </Button>
          {!passed && (
            <Button onClick={() => { setQuizAnswers({}); setCurrentView("quiz"); }} data-testid="button-retake">
              <RotateCcw className="h-4 w-4 mr-2" /> Retake Quiz
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (currentView === "quiz") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Front Desk Training Quiz</h3>
            <p className="text-sm text-muted-foreground">Answer all questions. {FD_PASSING_SCORE}% required to pass.</p>
          </div>
          <Badge variant="outline">{Object.keys(quizAnswers).length} / {FD_QUIZ_QUESTIONS.length} Answered</Badge>
        </div>
        <Progress value={(Object.keys(quizAnswers).length / FD_QUIZ_QUESTIONS.length) * 100} />
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {FD_QUIZ_QUESTIONS.map((q, idx) => (
            <Card key={q.id} data-testid={`card-fdq-${q.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm">{idx + 1}</span>
                  {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={quizAnswers[q.id]?.toString()} onValueChange={(v) => setQuizAnswers(prev => ({ ...prev, [q.id]: parseInt(v) }))}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center space-x-3 py-1">
                      <RadioGroupItem value={oi.toString()} id={`fdq${q.id}-${oi}`} data-testid={`radio-fdq${q.id}-${oi}`} />
                      <Label htmlFor={`fdq${q.id}-${oi}`} className="cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={() => setCurrentView("sections")} data-testid="button-back-sections">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sections
          </Button>
          <Button onClick={handleSubmitQuiz} disabled={!allAnswered} data-testid="button-submit-fdquiz">
            Submit Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {latestPass && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <Award className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">Certified</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Completed on {format(new Date(latestPass.completedAt), "MMM d, yyyy")} with {latestPass.score}%.
            {latestPass.expiresAt && ` Expires: ${format(new Date(latestPass.expiresAt), "MMM d, yyyy")}`}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Training Sections</h3>
          <p className="text-sm text-muted-foreground">Review all sections before taking the quiz</p>
        </div>
        <Button onClick={() => setCurrentView("quiz")} data-testid="button-take-fdquiz">
          <ClipboardCheck className="h-4 w-4 mr-2" /> Take Quiz
        </Button>
      </div>
      <Accordion type="single" collapsible value={expandedSection || undefined} onValueChange={(v) => setExpandedSection(v)}>
        {FD_TRAINING_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="hover:no-underline" data-testid={`accordion-${section.id}`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-11 space-y-3">
                  <p className="text-muted-foreground">{section.description}</p>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Key Points:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {section.keyPoints.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function CourseBuilderTab({ courses }: { courses: StaffCourse[] }) {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<StaffCourse | null>(null);
  const [deptSearchTerm, setDeptSearchTerm] = useState("");
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [contentBlockDialogOpen, setContentBlockDialogOpen] = useState(false);
  const [editingContentBlock, setEditingContentBlock] = useState<any>(null); // Block being edited
  const [newBlockType, setNewBlockType] = useState("text");
  const [newBlockContent, setNewBlockContent] = useState("");
  const [newBlockCaption, setNewBlockCaption] = useState("");
  const [newBlockImageUrl, setNewBlockImageUrl] = useState("");
  const [newBlockLayout, setNewBlockLayout] = useState("full_width");
  const [newBlockImageSize, setNewBlockImageSize] = useState("medium");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [newBlockVideoUrl, setNewBlockVideoUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: "",
    description: "",
    sortOrder: 0,
    durationMinutes: 15,
    isRequired: true,
  });
  
  // Lesson Pages state
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [pageFormData, setPageFormData] = useState({
    title: "",
    description: "",
    estimatedMinutes: 5,
  });
  
  // Lesson Quiz state
  const [lessonQuizExpanded, setLessonQuizExpanded] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  
  // Lesson Preview state
  const [lessonPreviewOpen, setLessonPreviewOpen] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState(-1); // -1 = main content, 0+ = page index
  const [previewPageId, setPreviewPageId] = useState<string | null>(null); // Track page ID for preview fetch
  const [editingQuizQuestion, setEditingQuizQuestion] = useState<any>(null);
  const [newQuizQuestion, setNewQuizQuestion] = useState({
    questionText: "",
    questionType: "multiple_choice",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 1,
  });

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file.", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);
    try {
      console.log('[Upload] Starting image upload process...');
      // Get upload URL from object storage
      const response = await fetch('/api/objects/upload', { 
        method: 'POST', 
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({})
      });
      
      const responseText = await response.text();
      console.log('[Upload] URL response:', response.status, responseText.substring(0, 100));

      // Handle successful response even if content-type is wrong
      let data;
      if (response.ok) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('[Upload] JSON Parse Error on 200 OK:', responseText);
          throw new Error('Server returned invalid data format');
        }
      } else {
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          toast({ 
            title: "Session Issue", 
            description: "Please refresh the page and log in again.", 
            variant: "destructive" 
          });
          throw new Error('Session expired (HTML redirect)');
        }
        throw new Error(`Failed to get upload URL: ${response.status}`);
      }

      const { uploadURL, objectPath } = data;
      console.log('[Upload] Got signed URL, uploading to GCS...');

      // Upload the file
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      console.log('[Upload] GCS response:', uploadResponse.status);
      if (!uploadResponse.ok) throw new Error('Failed to upload image to cloud storage');

      // Set ACL to public
      console.log('[Upload] Setting ACL...');
      const aclResponse = await fetch('/api/objects/set-acl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectPath, isPublic: true }),
        credentials: 'include',
      });
      if (!aclResponse.ok) console.warn('[Upload] Failed to set public ACL, but continuing...');

      // Get public URL
      console.log('[Upload] Fetching final URL...');
      const urlResponse = await fetch(`/api/objects/url?path=${encodeURIComponent(objectPath)}`, {
        credentials: 'include',
      });
      if (!urlResponse.ok) throw new Error('Failed to get public URL');
      const { url } = await urlResponse.json();
      
      console.log('[Upload] Final Public URL:', url);
      setNewBlockImageUrl(url);
      setImagePreview(url);
      toast({ title: "Image Uploaded", description: "Your image has been uploaded successfully." });
    } catch (error: any) {
      console.error('[Upload] Error:', error);
      toast({ title: "Upload Failed", description: error.message || "Failed to upload image. Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Video upload handler for MP4 files
  const handleVideoUpload = async (file: File) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid File", description: "Please select an MP4, WebM, or OGG video file.", variant: "destructive" });
      return;
    }

    // Check file size (max 500MB for videos)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File Too Large", description: "Video files must be under 500MB.", variant: "destructive" });
      return;
    }

    setIsUploadingVideo(true);
    try {
      console.log('[VideoUpload] Starting video upload process...');
      // Get upload URL from object storage
      const response = await fetch('/api/objects/upload', { 
        method: 'POST', 
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({})
      });
      
      const responseText = await response.text();
      console.log('[VideoUpload] URL response:', response.status);

      let data;
      if (response.ok) {
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('[VideoUpload] JSON Parse Error:', responseText);
          throw new Error('Server returned invalid data format');
        }
      } else {
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          toast({ 
            title: "Session Issue", 
            description: "Please refresh the page and log in again.", 
            variant: "destructive" 
          });
          throw new Error('Session expired');
        }
        throw new Error(`Failed to get upload URL: ${response.status}`);
      }

      const { uploadURL, objectPath } = data;
      console.log('[VideoUpload] Got signed URL, uploading to GCS...');

      // Upload the file
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      console.log('[VideoUpload] GCS response:', uploadResponse.status);
      if (!uploadResponse.ok) throw new Error('Failed to upload video to cloud storage');

      // Set ACL to public
      console.log('[VideoUpload] Setting ACL...');
      const aclResponse = await fetch('/api/objects/set-acl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectPath, isPublic: true }),
        credentials: 'include',
      });
      if (!aclResponse.ok) console.warn('[VideoUpload] Failed to set public ACL, but continuing...');

      // Get public URL
      console.log('[VideoUpload] Fetching final URL...');
      const urlResponse = await fetch(`/api/objects/url?path=${encodeURIComponent(objectPath)}`, {
        credentials: 'include',
      });
      if (!urlResponse.ok) throw new Error('Failed to get public URL');
      const { url } = await urlResponse.json();
      
      console.log('[VideoUpload] Final Public URL:', url);
      setNewBlockVideoUrl(url);
      setVideoPreview(url);
      toast({ title: "Video Uploaded", description: "Your video has been uploaded successfully." });
    } catch (error: any) {
      console.error('[VideoUpload] Error:', error);
      toast({ title: "Upload Failed", description: error.message || "Failed to upload video. Please try again.", variant: "destructive" });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Handle paste from clipboard
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleImageUpload(file);
          return;
        }
      }
    }
  };

  // Handle URL input with preview
  const handleImageUrlChange = (url: string) => {
    setNewBlockImageUrl(url);
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  // Reset content block dialog
  const resetContentBlockDialog = () => {
    setEditingContentBlock(null);
    setNewBlockType("text");
    setNewBlockContent("");
    setNewBlockCaption("");
    setNewBlockImageUrl("");
    setNewBlockVideoUrl("");
    setNewBlockLayout("full_width");
    setNewBlockImageSize("medium");
    setImagePreview(null);
    setVideoPreview(null);
  };

  const lessonsQueryKey = [`/api/courses/${selectedCourse?.id}/lessons`];
  const lessonPagesQueryKey = [`/api/lessons/${editingLesson?.id}/pages`];
  const contentBlocksQueryKey = selectedPage 
    ? [`/api/lesson-pages/${selectedPage?.id}/content-blocks`]
    : [`/api/lessons/${editingLesson?.id}/content-blocks`];
  
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: lessonsQueryKey,
    enabled: !!selectedCourse?.id,
  });

  const { data: contentBlocks = [], isLoading: contentBlocksLoading } = useQuery<any[]>({
    queryKey: contentBlocksQueryKey,
    enabled: !!editingLesson?.id || !!selectedPage?.id,
  });

  const { data: lessonPages = [], isLoading: lessonPagesLoading } = useQuery<any[]>({
    queryKey: lessonPagesQueryKey,
    enabled: !!editingLesson?.id,
  });

  // Lesson Quiz query
  const lessonQuizQueryKey = [`/api/lessons/${editingLesson?.id}/quiz`];
  const { data: lessonQuiz, isLoading: lessonQuizLoading, refetch: refetchLessonQuiz } = useQuery<any>({
    queryKey: lessonQuizQueryKey,
    enabled: !!editingLesson?.id,
  });

  // Lesson Departments query
  const lessonDepartmentsQueryKey = [`/api/lessons/${editingLesson?.id}/departments`];
  const { data: lessonDepartments = [], isLoading: lessonDepartmentsLoading } = useQuery<any[]>({
    queryKey: lessonDepartmentsQueryKey,
    enabled: !!editingLesson?.id,
  });

  // Fetch departments from API
  const { data: availableDepartments = [] } = useQuery<string[]>({
    queryKey: ['/api/departments', { facilityId }],
    enabled: !!facilityId,
  });

  // Course department targeting query
  const courseDepartmentsQueryKey = [`/api/courses/${selectedCourse?.id}/department-targeting`];
  const { data: courseDepartmentData } = useQuery<{ courseId: string; departments: string[] }>({
    queryKey: courseDepartmentsQueryKey,
    enabled: !!selectedCourse?.id,
  });
  const courseDepartments = courseDepartmentData?.departments || [];

  // Course department targeting mutation
  const updateCourseDepartmentsMutation = useMutation({
    mutationFn: async ({ courseId, departments }: { courseId: string; departments: string[] }) => {
      const response = await apiRequest("PUT", `/api/courses/${courseId}/department-targeting`, { departments });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Department Targeting Updated", description: "Course department targeting has been updated." });
      queryClient.invalidateQueries({ queryKey: courseDepartmentsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update department targeting.", variant: "destructive" });
    },
  });

  // Quiz questions query
  const quizQuestionsQueryKey = [`/api/quizzes/${lessonQuiz?.id}/questions`];
  const { data: lessonQuizQuestions = [], isLoading: quizQuestionsLoading } = useQuery<any[]>({
    queryKey: quizQuestionsQueryKey,
    enabled: !!lessonQuiz?.id,
  });

  // Course quizzes query - for linking quizzes to lessons
  const courseQuizzesQueryKey = [`/api/courses/${selectedCourse?.id}/quizzes`];
  const { data: courseQuizzes = [] } = useQuery<any[]>({
    queryKey: courseQuizzesQueryKey,
    enabled: !!selectedCourse?.id,
  });

  // Preview-specific queries - fetch content for each page in preview
  // Always enabled when preview is open to allow proper refetching
  const { data: previewMainContent = [], isLoading: previewMainLoading } = useQuery<any[]>({
    queryKey: ['/api/lessons', editingLesson?.id, 'content-blocks', 'preview', lessonPreviewOpen],
    queryFn: async () => {
      if (!editingLesson?.id) return [];
      const response = await fetch(`/api/lessons/${editingLesson?.id}/content-blocks`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch content blocks');
      return response.json();
    },
    enabled: lessonPreviewOpen && !!editingLesson?.id,
    staleTime: 0,
    gcTime: 0, // Don't cache preview data
  });

  const { data: previewPageContent = [], isLoading: previewPageLoading } = useQuery<any[]>({
    queryKey: ['/api/lesson-pages', previewPageId, 'content-blocks', 'preview'],
    queryFn: async () => {
      if (!previewPageId) return [];
      const response = await fetch(`/api/lesson-pages/${previewPageId}/content-blocks`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch page content blocks');
      return response.json();
    },
    enabled: lessonPreviewOpen && !!previewPageId,
    staleTime: 0,
    gcTime: 0, // Don't cache preview data
  });

  // State for link quiz dialog
  const [linkQuizDialogOpen, setLinkQuizDialogOpen] = useState(false);
  const [linkQuizLessonId, setLinkQuizLessonId] = useState<string | null>(null);
  const [selectedQuizToLink, setSelectedQuizToLink] = useState<string>("");

  const createLessonMutation = useMutation({
    mutationFn: async (data: typeof lessonFormData) => {
      const response = await apiRequest("POST", `/api/courses/${selectedCourse?.id}/lessons`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson Created", description: "New lesson added to the course." });
      queryClient.invalidateQueries({ queryKey: lessonsQueryKey });
      setLessonDialogOpen(false);
      setLessonFormData({ title: "", description: "", sortOrder: 0, durationMinutes: 15, isRequired: true });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create lesson.", variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await apiRequest("DELETE", `/api/lessons/${lessonId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson Deleted", description: "Lesson has been removed." });
      queryClient.invalidateQueries({ queryKey: lessonsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lesson.", variant: "destructive" });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, data }: { lessonId: string; data: { title?: string; description?: string } }) => {
      const response = await apiRequest("PATCH", `/api/lessons/${lessonId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson Updated", description: "Lesson has been updated." });
      queryClient.invalidateQueries({ queryKey: lessonsQueryKey });
      setEditingLessonId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lesson.", variant: "destructive" });
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async (lessonIds: string[]) => {
      const response = await apiRequest("PATCH", `/api/courses/${selectedCourse?.id}/lessons/reorder`, { lessonIds });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lessons Reordered", description: "Lesson order has been updated." });
      queryClient.invalidateQueries({ queryKey: lessonsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder lessons.", variant: "destructive" });
    },
  });

  // Update lesson departments mutation
  const updateLessonDepartmentsMutation = useMutation({
    mutationFn: async ({ lessonId, departments }: { lessonId: string; departments: string[] }) => {
      const response = await apiRequest("PUT", `/api/lessons/${lessonId}/departments`, { departments });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Departments Updated", description: "Lesson department targeting has been updated." });
      queryClient.invalidateQueries({ queryKey: lessonDepartmentsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lesson departments.", variant: "destructive" });
    },
  });

  const createContentBlockMutation = useMutation({
    mutationFn: async (data: { blockType: string; content?: string; caption?: string; imageUrl?: string; videoUrl?: string; layout?: string; imageSize?: string; sortOrder: number }) => {
      // If a page is selected, create the block under that page
      const endpoint = selectedPage 
        ? `/api/lesson-pages/${selectedPage.id}/content-blocks`
        : `/api/lessons/${editingLesson?.id}/content-blocks`;
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Content Added", description: "Content block added to lesson." });
      queryClient.invalidateQueries({ queryKey: contentBlocksQueryKey });
      setContentBlockDialogOpen(false);
      resetContentBlockDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add content block.", variant: "destructive" });
    },
  });

  const deleteContentBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const response = await apiRequest("DELETE", `/api/content-blocks/${blockId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Content Removed", description: "Content block removed from lesson." });
      queryClient.invalidateQueries({ queryKey: contentBlocksQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove content block.", variant: "destructive" });
    },
  });

  const updateContentBlockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { blockType: string; content?: string; caption?: string; imageUrl?: string; videoUrl?: string; layout?: string; imageSize?: string } }) => {
      const response = await apiRequest("PATCH", `/api/content-blocks/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Content Updated", description: "Content block has been updated." });
      queryClient.invalidateQueries({ queryKey: contentBlocksQueryKey });
      setContentBlockDialogOpen(false);
      resetContentBlockDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update content block.", variant: "destructive" });
    },
  });

  // Lesson Pages mutations
  const createLessonPageMutation = useMutation({
    mutationFn: async (data: typeof pageFormData) => {
      const response = await apiRequest("POST", `/api/lessons/${editingLesson?.id}/pages`, data);
      return response.json();
    },
    onSuccess: (newPage) => {
      toast({ title: "Page Created", description: "New page added to the lesson." });
      queryClient.invalidateQueries({ queryKey: lessonPagesQueryKey });
      setPageDialogOpen(false);
      setPageFormData({ title: "", description: "", estimatedMinutes: 5 });
      setSelectedPage(newPage);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create page.", variant: "destructive" });
    },
  });

  const updateLessonPageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof pageFormData> }) => {
      const response = await apiRequest("PATCH", `/api/lesson-pages/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Page Updated", description: "Page has been updated." });
      queryClient.invalidateQueries({ queryKey: lessonPagesQueryKey });
      setPageDialogOpen(false);
      setEditingPage(null);
      setPageFormData({ title: "", description: "", estimatedMinutes: 5 });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update page.", variant: "destructive" });
    },
  });

  const deleteLessonPageMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const response = await apiRequest("DELETE", `/api/lesson-pages/${pageId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Page Deleted", description: "Page has been removed." });
      queryClient.invalidateQueries({ queryKey: lessonPagesQueryKey });
      if (selectedPage) setSelectedPage(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete page.", variant: "destructive" });
    },
  });

  const reorderLessonPagesMutation = useMutation({
    mutationFn: async ({ lessonId, pageIds }: { lessonId: string; pageIds: string[] }) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/pages/reorder`, { pageIds });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Pages Reordered", description: "Page order has been updated." });
      queryClient.invalidateQueries({ queryKey: lessonPagesQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reorder pages.", variant: "destructive" });
    },
  });

  // DnD sensors for lesson pages
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Pre-sort lesson pages for drag-and-drop
  const sortedLessonPages = [...lessonPages].sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !editingLesson) return;
    
    const oldIndex = sortedLessonPages.findIndex((p: any) => p.id === active.id);
    const newIndex = sortedLessonPages.findIndex((p: any) => p.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedPages = arrayMove(sortedLessonPages, oldIndex, newIndex);
      const pageIds = reorderedPages.map((p: any) => p.id);
      reorderLessonPagesMutation.mutate({ lessonId: editingLesson.id, pageIds });
    }
  };

  // Lesson Quiz mutations
  const saveLessonQuizMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; passingScore: number; maxAttempts?: number }) => {
      const response = await apiRequest("POST", `/api/lessons/${editingLesson?.id}/quiz`, {
        ...data,
        courseId: selectedCourse?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quiz Saved", description: "Lesson quiz has been saved." });
      queryClient.invalidateQueries({ queryKey: lessonQuizQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save quiz.", variant: "destructive" });
    },
  });

  const addQuizQuestionMutation = useMutation({
    mutationFn: async (data: { questionId: string; sortOrder: number }) => {
      const response = await apiRequest("POST", `/api/quizzes/${lessonQuiz?.id}/questions`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question Added", description: "Question added to the quiz." });
      queryClient.invalidateQueries({ queryKey: quizQuestionsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add question.", variant: "destructive" });
    },
  });

  const removeQuizQuestionMutation = useMutation({
    mutationFn: async (quizQuestionId: string) => {
      const response = await apiRequest("DELETE", `/api/quiz-questions/${quizQuestionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question Removed", description: "Question removed from the quiz." });
      queryClient.invalidateQueries({ queryKey: quizQuestionsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove question.", variant: "destructive" });
    },
  });

  const deleteLessonQuizMutation = useMutation({
    mutationFn: async () => {
      if (!lessonQuiz?.id) throw new Error("No quiz to delete");
      const response = await apiRequest("DELETE", `/api/quizzes/${lessonQuiz.id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quiz Deleted", description: "Lesson quiz has been removed." });
      queryClient.invalidateQueries({ queryKey: lessonQuizQueryKey });
      setLessonQuizExpanded(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quiz.", variant: "destructive" });
    },
  });

  // Link/unlink quiz to lesson mutation
  const linkQuizToLessonMutation = useMutation({
    mutationFn: async ({ quizId, lessonId }: { quizId: string | null; lessonId: string }) => {
      const response = await apiRequest("PATCH", `/api/lessons/${lessonId}/link-quiz`, { quizId });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Quiz Updated", description: "Quiz linking has been updated." });
      queryClient.invalidateQueries({ queryKey: courseQuizzesQueryKey });
      setLinkQuizDialogOpen(false);
      setLinkQuizLessonId(null);
      setSelectedQuizToLink("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quiz linking.", variant: "destructive" });
    },
  });

  // Helper function to get quiz linked to a lesson
  const getLinkedQuiz = (lessonId: string) => {
    return courseQuizzes.find((quiz: any) => quiz.lessonId === lessonId);
  };

  // Open page dialog for editing
  const openEditPage = (page: any) => {
    setEditingPage(page);
    setPageFormData({
      title: page.title,
      description: page.description || "",
      estimatedMinutes: page.estimatedMinutes || 5,
    });
    setPageDialogOpen(true);
  };

  // Reset page dialog
  const resetPageDialog = () => {
    setEditingPage(null);
    setPageFormData({ title: "", description: "", estimatedMinutes: 5 });
  };

  // Open edit dialog with existing block data
  const openEditContentBlock = (block: any, e?: React.MouseEvent) => {
    // Prevent event bubbling to parent elements that might open other dialogs
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Explicitly close any other dialogs that might be open
    setLessonDialogOpen(false);
    setPageDialogOpen(false);
    
    setEditingContentBlock(block);
    setNewBlockType(block.blockType || "text");
    setNewBlockContent(block.content || "");
    setNewBlockCaption(block.caption || "");
    setNewBlockImageUrl(block.imageUrl || "");
    setNewBlockLayout(block.layout || "full_width");
    setNewBlockImageSize(block.imageSize || "medium");
    setImagePreview(block.imageUrl || null);
    // Initialize video state for video blocks
    if (block.blockType === 'video' && block.videoUrl) {
      if (isUploadedVideoUrl(block.videoUrl)) {
        setNewBlockVideoUrl(block.videoUrl);
        setVideoPreview(block.videoUrl);
        setNewBlockContent(""); // Clear embed URL field since we're using uploaded video
      } else {
        setNewBlockVideoUrl("");
        setVideoPreview(null);
        setNewBlockContent(block.videoUrl); // Put embed URL in the content field
      }
    } else {
      setNewBlockVideoUrl("");
      setVideoPreview(null);
    }
    setContentBlockDialogOpen(true);
  };

  // If editing a specific lesson, show the lesson content editor
  if (editingLesson) {
    // Filter content blocks - if no page selected, show blocks without pageId (direct lesson blocks)
    const filteredBlocks = selectedPage 
      ? contentBlocks
      : contentBlocks.filter((block: any) => !block.pageId);
    
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => { setEditingLesson(null); setSelectedPage(null); }} data-testid="button-back-lessons">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Edit Lesson: {editingLesson.title}
                  </CardTitle>
                  <CardDescription>{editingLesson.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { 
                  // Open preview - query will auto-fetch when enabled
                  setPreviewPageIndex(-1);
                  setPreviewPageId(null);
                  setLessonPreviewOpen(true);
                }} data-testid="button-preview-lesson">
                  <Play className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" onClick={() => setPageDialogOpen(true)} data-testid="button-add-page">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Page
                </Button>
                <Button onClick={() => setContentBlockDialogOpen(true)} data-testid="button-add-content-block">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lesson Pages Navigation */}
            {lessonPagesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : lessonPages.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Pages:</span>
                  <span className="text-xs text-muted-foreground">(Drag to reorder)</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button 
                    variant={selectedPage === null ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setSelectedPage(null)}
                    data-testid="button-page-main"
                  >
                    Main Content
                  </Button>
                  <DndContext 
                    sensors={sensors} 
                    collisionDetection={closestCenter} 
                    onDragEnd={handlePageDragEnd}
                  >
                    <SortableContext 
                      items={sortedLessonPages.map((p: any) => p.id)} 
                      strategy={horizontalListSortingStrategy}
                    >
                      {sortedLessonPages.map((page: any) => (
                        <SortablePageItem
                          key={page.id}
                          page={page}
                          isSelected={selectedPage?.id === page.id}
                          onSelect={() => setSelectedPage(page)}
                          onEdit={() => openEditPage(page)}
                          onDelete={() => deleteLessonPageMutation.mutate(page.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                {selectedPage && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Editing: Page {selectedPage.pageNumber} - {selectedPage.title}</p>
                    {selectedPage.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedPage.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {contentBlocksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredBlocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No content yet. Click "Add Content" to build this {selectedPage ? 'page' : 'lesson'}.</p>
                <p className="text-sm mt-2">You can add text, images, videos, and more.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBlocks.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map((block: any, index: number) => (
                  <Card key={block.id} className="relative" data-testid={`card-content-block-${block.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {block.blockType === 'text' && 'Text'}
                                {block.blockType === 'image' && 'Image'}
                                {block.blockType === 'text_image' && 'Text + Image'}
                                {block.blockType === 'video' && 'Video'}
                                {block.blockType === 'file' && 'File'}
                                {block.blockType === 'divider' && 'Divider'}
                              </Badge>
                              {block.blockType === 'text_image' && block.layout && (
                                <Badge variant="secondary" className="text-xs">
                                  {block.layout === 'text_left_image_right' && 'Text Left'}
                                  {block.layout === 'image_left_text_right' && 'Image Left'}
                                  {block.layout === 'text_top_image_bottom' && 'Text Top'}
                                  {block.layout === 'image_top_text_bottom' && 'Image Top'}
                                </Badge>
                              )}
                              {block.caption && <span className="text-sm text-muted-foreground">{block.caption}</span>}
                            </div>
                            {block.blockType === 'text' && (
                              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                            )}
                            {block.blockType === 'image' && block.imageUrl && (
                              <img src={block.imageUrl} alt={block.caption || 'Lesson image'} className="max-w-full h-auto rounded-md" />
                            )}
                            {block.blockType === 'text_image' && (
                              <div className={`
                                ${(block.layout === 'text_left_image_right' || block.layout === 'image_left_text_right') 
                                  ? 'flex flex-col md:flex-row gap-4' 
                                  : 'flex flex-col gap-4'}
                                ${block.layout === 'image_left_text_right' ? 'md:flex-row-reverse' : ''}
                              `}>
                                {/* Text content */}
                                {(block.layout === 'text_left_image_right' || block.layout === 'image_left_text_right') ? (
                                  <>
                                    <div className={`
                                      prose prose-sm dark:prose-invert max-w-none
                                      ${block.imageSize === 'small' ? 'md:w-3/4' : ''}
                                      ${block.imageSize === 'medium' ? 'md:w-3/5' : ''}
                                      ${block.imageSize === 'large' ? 'md:w-1/2' : ''}
                                      ${block.imageSize === 'full' ? 'w-full' : ''}
                                    `} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                                    {block.imageUrl && (
                                      <div className={`
                                        ${block.imageSize === 'small' ? 'md:w-1/4' : ''}
                                        ${block.imageSize === 'medium' ? 'md:w-2/5' : ''}
                                        ${block.imageSize === 'large' ? 'md:w-1/2' : ''}
                                        ${block.imageSize === 'full' ? 'w-full' : ''}
                                      `}>
                                        <img src={block.imageUrl} alt={block.caption || 'Lesson image'} className="w-full h-auto rounded-md object-contain" />
                                      </div>
                                    )}
                                  </>
                                ) : block.layout === 'text_top_image_bottom' ? (
                                  <>
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                                    {block.imageUrl && (
                                      <img src={block.imageUrl} alt={block.caption || 'Lesson image'} className="max-w-full h-auto rounded-md mx-auto" />
                                    )}
                                  </>
                                ) : block.layout === 'image_top_text_bottom' ? (
                                  <>
                                    {block.imageUrl && (
                                      <img src={block.imageUrl} alt={block.caption || 'Lesson image'} className="max-w-full h-auto rounded-md mx-auto" />
                                    )}
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                                  </>
                                ) : (
                                  <>
                                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                                    {block.imageUrl && (
                                      <img src={block.imageUrl} alt={block.caption || 'Lesson image'} className="max-w-full h-auto rounded-md" />
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                            {block.blockType === 'video' && block.videoUrl && (
                              <div className="aspect-video">
                                {isUploadedVideoUrl(block.videoUrl) ? (
                                  <video 
                                    src={block.videoUrl} 
                                    controls
                                    className="w-full h-full rounded-md object-contain bg-black"
                                  />
                                ) : (
                                  <iframe 
                                    src={parseVideoUrl(block.videoUrl)} 
                                    className="w-full h-full rounded-md"
                                    allowFullScreen
                                  />
                                )}
                              </div>
                            )}
                            {block.blockType === 'divider' && (
                              <Separator className="my-2" />
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-primary" 
                          onClick={(e) => openEditContentBlock(block, e)}
                          data-testid={`button-edit-block-${block.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" data-testid={`button-delete-block-${block.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Content Block</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this content block? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteContentBlockMutation.mutate(block.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lesson Quiz Section */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover-elevate" 
            onClick={() => setLessonQuizExpanded(!lessonQuizExpanded)}
            data-testid="button-toggle-lesson-quiz"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    Lesson Quiz
                    {lessonQuiz && (
                      <Badge variant="secondary" className="ml-2">
                        {lessonQuizQuestions.length} question{lessonQuizQuestions.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {lessonQuiz 
                      ? `Passing score: ${lessonQuiz.passingScore || 70}%` 
                      : 'Add a quiz to test understanding of this lesson'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {lessonQuiz ? (
                  <Badge variant="outline" className="text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Quiz Created
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    No Quiz
                  </Badge>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform ${lessonQuizExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
          {lessonQuizExpanded && (
            <CardContent className="pt-0">
              {lessonQuizLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !lessonQuiz ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No quiz for this lesson yet.</p>
                  <Button 
                    onClick={() => {
                      saveLessonQuizMutation.mutate({
                        title: `Quiz: ${editingLesson.title}`,
                        description: `Quiz for lesson: ${editingLesson.title}`,
                        passingScore: 70,
                        maxAttempts: 3,
                      });
                    }}
                    disabled={saveLessonQuizMutation.isPending}
                    data-testid="button-create-lesson-quiz"
                  >
                    {saveLessonQuizMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz (70% to Pass)
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{lessonQuiz.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lessonQuizQuestions.length} question{lessonQuizQuestions.length !== 1 ? 's' : ''} | 
                        Passing: {lessonQuiz.passingScore || 70}% | 
                        Max Attempts: {lessonQuiz.maxAttempts || 'Unlimited'}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Quiz
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Lesson Quiz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the quiz and all its questions from this lesson. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteLessonQuizMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete Quiz
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {quizQuestionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : lessonQuizQuestions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                      <p className="text-sm">No questions added yet.</p>
                      <p className="text-xs mt-1">Add questions from the Question Bank.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Questions:</p>
                      {lessonQuizQuestions.map((qq: any, index: number) => (
                        <div 
                          key={qq.id} 
                          className="flex items-center justify-between gap-3 p-3 bg-card border rounded-lg"
                          data-testid={`quiz-question-${qq.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-sm truncate">
                              {qq.questionText || qq.question?.questionText || 'Question text not available'}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeQuizQuestionMutation.mutate(qq.id)}
                            disabled={removeQuizQuestionMutation.isPending}
                            data-testid={`button-remove-question-${qq.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Manage questions in the Question Banks tab, then add them here.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Add/Edit Lesson Page Dialog */}
        <Dialog open={pageDialogOpen} onOpenChange={(open) => {
          setPageDialogOpen(open);
          if (!open) resetPageDialog();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPage ? 'Edit Page' : 'Add New Page'}</DialogTitle>
              <DialogDescription>
                {editingPage 
                  ? 'Update the page title and description.' 
                  : 'Create a new page within this lesson to organize content into sections.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input 
                  placeholder="e.g., Introduction, Key Concepts, Summary..."
                  value={pageFormData.title}
                  onChange={(e) => setPageFormData({ ...pageFormData, title: e.target.value })}
                  data-testid="input-page-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea 
                  placeholder="Brief description of what this page covers..."
                  value={pageFormData.description}
                  onChange={(e) => setPageFormData({ ...pageFormData, description: e.target.value })}
                  data-testid="input-page-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Time (minutes)</Label>
                <Input 
                  type="number"
                  min="1"
                  value={pageFormData.estimatedMinutes}
                  onChange={(e) => setPageFormData({ ...pageFormData, estimatedMinutes: parseInt(e.target.value) || 5 })}
                  data-testid="input-page-time"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPageDialogOpen(false); resetPageDialog(); }}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (!pageFormData.title.trim()) {
                    toast({ title: "Error", description: "Page title is required.", variant: "destructive" });
                    return;
                  }
                  if (editingPage) {
                    updateLessonPageMutation.mutate({ id: editingPage.id, data: pageFormData });
                  } else {
                    createLessonPageMutation.mutate(pageFormData);
                  }
                }}
                disabled={createLessonPageMutation.isPending || updateLessonPageMutation.isPending}
                data-testid="button-save-page"
              >
                {(createLessonPageMutation.isPending || updateLessonPageMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingPage ? 'Update Page' : 'Create Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Content Block Dialog */}
        <Dialog open={contentBlockDialogOpen} onOpenChange={(open) => {
          setContentBlockDialogOpen(open);
          if (!open) resetContentBlockDialog();
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
            <DialogHeader>
              <DialogTitle>{editingContentBlock ? 'Edit Content Block' : 'Add Content Block'}</DialogTitle>
              <DialogDescription>
                {editingContentBlock 
                  ? 'Modify the content, add images, or change the layout.' 
                  : 'Add text, images, videos, or combined layouts to this lesson.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={newBlockType} onValueChange={(value) => {
                  setNewBlockType(value);
                  // Reset layout when switching types
                  if (value === 'text_image') {
                    setNewBlockLayout('text_left_image_right');
                  } else {
                    setNewBlockLayout('full_width');
                  }
                }}>
                  <SelectTrigger data-testid="select-block-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="image">Image / Screenshot Only</SelectItem>
                    <SelectItem value="text_image">Text + Image (Multi-Column)</SelectItem>
                    <SelectItem value="video">Video (YouTube/Vimeo)</SelectItem>
                    <SelectItem value="divider">Divider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text Input - for text and text_image types */}
              {(newBlockType === 'text' || newBlockType === 'text_image') && (
                <div className="space-y-2">
                  <Label>Text Content</Label>
                  <Textarea
                    value={newBlockContent}
                    onChange={(e) => setNewBlockContent(e.target.value)}
                    placeholder="Enter lesson content here... You can use basic HTML for formatting."
                    rows={6}
                    data-testid="input-block-content"
                  />
                  <p className="text-xs text-muted-foreground">Supports basic HTML: &lt;p&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;h3&gt;</p>
                </div>
              )}

              {/* Image Input - for image and text_image types */}
              {(newBlockType === 'image' || newBlockType === 'text_image') && (
                <div className="space-y-3">
                  <Label>Image / Screenshot</Label>
                  
                  {/* Upload Section */}
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                      data-testid="input-image-file"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        {isUploadingImage ? (
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {isUploadingImage ? 'Uploading...' : 'Click to upload or paste screenshot (Ctrl+V)'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Or enter URL */}
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={newBlockImageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      placeholder="https://example.com/image.png"
                      data-testid="input-image-url"
                    />
                    <p className="text-xs text-muted-foreground">Enter the URL of an existing image</p>
                  </div>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mt-3 border rounded-lg p-2 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Image Preview</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setImagePreview(null);
                            setNewBlockImageUrl("");
                          }}
                          data-testid="button-remove-image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-48 mx-auto rounded object-contain"
                        onError={() => {
                          setImagePreview(null);
                          toast({ title: "Invalid Image", description: "Could not load the image from this URL.", variant: "destructive" });
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Layout Options - only for text_image type */}
              {newBlockType === 'text_image' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <Label className="text-sm font-medium">Layout Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={newBlockLayout === 'text_left_image_right' ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setNewBlockLayout('text_left_image_right')}
                      data-testid="button-layout-text-left"
                    >
                      <div className="flex gap-1">
                        <div className="w-8 h-6 border rounded bg-background flex items-center justify-center text-[8px]">Txt</div>
                        <div className="w-6 h-6 border rounded bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                      </div>
                      <span className="text-xs">Text Left</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newBlockLayout === 'image_left_text_right' ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setNewBlockLayout('image_left_text_right')}
                      data-testid="button-layout-image-left"
                    >
                      <div className="flex gap-1">
                        <div className="w-6 h-6 border rounded bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                        <div className="w-8 h-6 border rounded bg-background flex items-center justify-center text-[8px]">Txt</div>
                      </div>
                      <span className="text-xs">Image Left</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newBlockLayout === 'text_top_image_bottom' ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setNewBlockLayout('text_top_image_bottom')}
                      data-testid="button-layout-text-top"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="w-12 h-3 border rounded bg-background flex items-center justify-center text-[6px]">Text</div>
                        <div className="w-12 h-5 border rounded bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                      </div>
                      <span className="text-xs">Text Top</span>
                    </Button>
                    <Button
                      type="button"
                      variant={newBlockLayout === 'image_top_text_bottom' ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setNewBlockLayout('image_top_text_bottom')}
                      data-testid="button-layout-image-top"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="w-12 h-5 border rounded bg-primary/20 flex items-center justify-center">
                          <ImageIcon className="h-3 w-3" />
                        </div>
                        <div className="w-12 h-3 border rounded bg-background flex items-center justify-center text-[6px]">Text</div>
                      </div>
                      <span className="text-xs">Image Top</span>
                    </Button>
                  </div>

                  {/* Image Size Option */}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Image Size</Label>
                    <Select value={newBlockImageSize} onValueChange={setNewBlockImageSize}>
                      <SelectTrigger className="mt-1" data-testid="select-image-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (25%)</SelectItem>
                        <SelectItem value="medium">Medium (40%)</SelectItem>
                        <SelectItem value="large">Large (50%)</SelectItem>
                        <SelectItem value="full">Full Width</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Video Input */}
              {newBlockType === 'video' && (
                <div className="space-y-4">
                  {/* Video Upload Section */}
                  <div className="space-y-2">
                    <Label>Upload Video File</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(file);
                        }}
                        id="video-upload"
                        className="hidden"
                        data-testid="input-video-file"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          {isUploadingVideo ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Uploading video...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm font-medium">Click to upload MP4 video</span>
                              <span className="text-xs text-muted-foreground">MP4, WebM, or OGG (max 500MB)</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Video Preview for Uploaded Files */}
                  {videoPreview && (
                    <div className="space-y-2">
                      <Label>Uploaded Video Preview</Label>
                      <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                        <video
                          src={videoPreview}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVideoPreview(null);
                          setNewBlockVideoUrl("");
                        }}
                        data-testid="button-remove-video"
                      >
                        <X className="h-4 w-4 mr-1" /> Remove Video
                      </Button>
                    </div>
                  )}

                  {/* Divider */}
                  {!videoPreview && (
                    <div className="flex items-center gap-3">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <Separator className="flex-1" />
                    </div>
                  )}

                  {/* YouTube/Vimeo Embed URL */}
                  {!videoPreview && (
                    <div className="space-y-2">
                      <Label>YouTube or Vimeo Video</Label>
                      <Input
                        value={newBlockContent}
                        onChange={(e) => setNewBlockContent(e.target.value)}
                        placeholder="Paste YouTube URL or embed code here..."
                        data-testid="input-video-url"
                      />
                      <p className="text-xs text-muted-foreground">
                        You can paste: YouTube embed code, YouTube URL (youtube.com/watch?v=...), short URL (youtu.be/...), or Vimeo URL
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Caption - for all types except divider */}
              {newBlockType !== 'divider' && (
                <div className="space-y-2">
                  <Label>Caption (Optional)</Label>
                  <Input
                    value={newBlockCaption}
                    onChange={(e) => setNewBlockCaption(e.target.value)}
                    placeholder="Add a caption or description..."
                    data-testid="input-block-caption"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => {
                setContentBlockDialogOpen(false);
                resetContentBlockDialog();
              }}>Cancel</Button>
              <Button 
                onClick={() => {
                  const data: any = {
                    blockType: newBlockType,
                    caption: newBlockCaption || undefined,
                    layout: newBlockLayout,
                    imageSize: newBlockImageSize,
                  };
                  if (!editingContentBlock) {
                    data.sortOrder = contentBlocks.length;
                  }
                  if (newBlockType === 'text') {
                    data.content = newBlockContent;
                  } else if (newBlockType === 'image') {
                    data.imageUrl = newBlockImageUrl || newBlockContent;
                  } else if (newBlockType === 'text_image') {
                    data.content = newBlockContent;
                    data.imageUrl = newBlockImageUrl;
                  } else if (newBlockType === 'video') {
                    // Prefer uploaded video URL over embed URL
                    // Parse the URL to extract embed URL from iframes, YouTube watch URLs, etc.
                    data.videoUrl = newBlockVideoUrl || parseVideoUrl(newBlockContent);
                  }
                  if (editingContentBlock) {
                    updateContentBlockMutation.mutate({ id: editingContentBlock.id, data });
                  } else {
                    createContentBlockMutation.mutate(data);
                  }
                }}
                disabled={
                  createContentBlockMutation.isPending || 
                  updateContentBlockMutation.isPending ||
                  isUploadingImage ||
                  isUploadingVideo ||
                  (newBlockType === 'text' && !newBlockContent) ||
                  (newBlockType === 'image' && !newBlockImageUrl) ||
                  (newBlockType === 'text_image' && (!newBlockContent || !newBlockImageUrl)) ||
                  (newBlockType === 'video' && !newBlockVideoUrl && !newBlockContent)
                }
                data-testid="button-save-content-block"
              >
                {(createContentBlockMutation.isPending || updateContentBlockMutation.isPending || isUploadingImage || isUploadingVideo) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingContentBlock ? 'Save Changes' : 'Add Content'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lesson Preview Dialog */}
        <Dialog open={lessonPreviewOpen} onOpenChange={setLessonPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Lesson Preview: {editingLesson?.title}
              </DialogTitle>
              <DialogDescription>
                This is how the lesson will appear to staff taking the training externally.
              </DialogDescription>
            </DialogHeader>
            
            {/* Page Navigation */}
            {lessonPages.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center border-b pb-4">
                <Button 
                  variant={previewPageIndex === -1 ? "default" : "outline"} 
                  size="sm"
                  onClick={() => { 
                    setPreviewPageIndex(-1); 
                    setPreviewPageId(null);
                  }}
                >
                  Main Content
                </Button>
                {lessonPages.map((page: any, idx: number) => (
                  <Button 
                    key={page.id}
                    variant={previewPageIndex === idx ? "default" : "outline"} 
                    size="sm"
                    onClick={() => { 
                      setPreviewPageIndex(idx); 
                      setPreviewPageId(page.id);
                    }}
                  >
                    Page {idx + 1}: {page.title}
                  </Button>
                ))}
              </div>
            )}

            {/* Preview Content */}
            <div className="space-y-6 py-4">
              {(() => {
                // Show loading state
                const isLoading = previewPageIndex === -1 ? previewMainLoading : previewPageLoading;
                if (isLoading) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  );
                }

                // Get the appropriate content blocks based on preview page index using dedicated preview queries
                const rawBlocks = previewPageIndex === -1 
                  ? previewMainContent
                  : previewPageContent;
                // Filter to only get main content (no pageId) when viewing main, and sort by order
                const previewBlocks = previewPageIndex === -1
                  ? rawBlocks.filter((block: any) => !block.pageId).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                  : rawBlocks.sort((a: any, b: any) => a.sortOrder - b.sortOrder);

                if (previewBlocks.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No content blocks in this section yet.</p>
                      <p className="text-sm mt-2">Add content blocks to see them in the preview.</p>
                    </div>
                  );
                }

                return previewBlocks.map((block: any) => {
                  if (block.blockType === 'text') {
                    return (
                      <div key={block.id} className="prose dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                        {block.caption && (
                          <p className="text-sm text-muted-foreground mt-2 italic">{block.caption}</p>
                        )}
                      </div>
                    );
                  }
                  
                  if (block.blockType === 'image') {
                    return (
                      <div key={block.id} className="text-center">
                        {block.imageUrl ? (
                          <img 
                            src={block.imageUrl} 
                            alt={block.caption || 'Lesson image'} 
                            className="max-w-full h-auto rounded-lg mx-auto"
                          />
                        ) : (
                          <div className="bg-muted rounded-lg p-8 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>Image not available</p>
                            </div>
                          </div>
                        )}
                        {block.caption && (
                          <p className="text-sm text-muted-foreground mt-2">{block.caption}</p>
                        )}
                      </div>
                    );
                  }

                  if (block.blockType === 'text_image') {
                    const layout = block.layout || 'text_left_image_right';
                    const isHorizontal = layout === 'text_left_image_right' || layout === 'image_left_text_right';
                    const imageFirst = layout === 'image_left_text_right' || layout === 'image_top_text_bottom';
                    
                    // Image size classes
                    const getImageWidth = () => {
                      switch (block.imageSize) {
                        case 'small': return 'w-1/4';
                        case 'medium': return 'w-2/5';
                        case 'large': return 'w-1/2';
                        case 'full': return 'w-full';
                        default: return 'w-2/5';
                      }
                    };

                    const textContent = (
                      <div className={`prose dark:prose-invert max-w-none ${isHorizontal ? 'flex-1' : ''}`}>
                        <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                      </div>
                    );

                    const imageContent = block.imageUrl ? (
                      <div className={isHorizontal ? getImageWidth() : ''}>
                        <img 
                          src={block.imageUrl} 
                          alt={block.caption || 'Lesson image'} 
                          className="w-full h-auto rounded-lg object-contain"
                        />
                      </div>
                    ) : null;

                    if (isHorizontal) {
                      return (
                        <div key={block.id} className={`flex gap-6 items-start ${imageFirst ? 'flex-row' : 'flex-row-reverse'}`}>
                          {imageContent}
                          {textContent}
                        </div>
                      );
                    } else {
                      return (
                        <div key={block.id} className="space-y-4">
                          {imageFirst ? (
                            <>{imageContent}{textContent}</>
                          ) : (
                            <>{textContent}{imageContent}</>
                          )}
                        </div>
                      );
                    }
                  }

                  if (block.blockType === 'video') {
                    const rawVideoUrl = block.videoUrl || block.content;
                    // Parse the URL to handle iframe HTML, YouTube watch URLs, etc.
                    const videoUrl = rawVideoUrl ? parseVideoUrl(rawVideoUrl) : null;
                    const isUploadedVideo = videoUrl && isUploadedVideoUrl(videoUrl);
                    return (
                      <div key={block.id} className="aspect-video w-full max-w-2xl mx-auto">
                        {videoUrl ? (
                          isUploadedVideo ? (
                            <video
                              src={videoUrl}
                              controls
                              className="w-full h-full rounded-lg object-contain bg-black"
                              data-testid={`video-player-${block.id}`}
                            />
                          ) : (
                            <iframe
                              src={videoUrl}
                              className="w-full h-full rounded-lg"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                            <p className="text-muted-foreground">Video not available</p>
                          </div>
                        )}
                        {block.caption && (
                          <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
                        )}
                      </div>
                    );
                  }

                  if (block.blockType === 'divider') {
                    return <Separator key={block.id} className="my-6" />;
                  }

                  return null;
                });
              })()}
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between border-t pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  const newIndex = Math.max(-1, previewPageIndex - 1);
                  setPreviewPageIndex(newIndex);
                  setPreviewPageId(newIndex === -1 ? null : lessonPages[newIndex]?.id || null);
                }}
                disabled={previewPageIndex === -1}
              >
                <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {previewPageIndex === -1 ? 'Main Content' : `Page ${previewPageIndex + 1} of ${lessonPages.length}`}
              </span>
              <Button 
                variant="outline" 
                onClick={() => {
                  const newIndex = Math.min(lessonPages.length - 1, previewPageIndex + 1);
                  setPreviewPageIndex(newIndex);
                  setPreviewPageId(lessonPages[newIndex]?.id || null);
                }}
                disabled={previewPageIndex >= lessonPages.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Course Builder
          </CardTitle>
          <CardDescription>
            Select a course to start building lessons and quizzes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedCourse(course)}
                data-testid={`card-select-course-${course.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{course.category}</Badge>
                    {course.isRequired && <Badge variant="destructive">Required</Badge>}
                  </div>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration} min
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {courses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No courses available. Create a course first from the Course Catalog tab.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedCourse(null)} data-testid="button-back-courses">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedCourse.name}
                </CardTitle>
                <CardDescription>{selectedCourse.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Department Targeting */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px] justify-between" data-testid="button-course-department-targeting">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Assigned Departments
                      {courseDepartments.length > 0 && (
                        <Badge variant="secondary" className="ml-1">{courseDepartments.length}</Badge>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="end">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search departments..."
                      value={deptSearchTerm}
                      onChange={(e) => setDeptSearchTerm(e.target.value)}
                      className="h-8"
                      data-testid="input-search-departments"
                    />
                  </div>
                  <div className="max-h-[250px] overflow-y-auto p-2">
                    {availableDepartments
                      .filter(dept => dept.toLowerCase().includes(deptSearchTerm.toLowerCase()))
                      .map((dept) => {
                        const isSelected = courseDepartments.includes(dept);
                        return (
                          <div
                            key={dept}
                            className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                            onClick={() => {
                              const newDepts = isSelected
                                ? courseDepartments.filter((d: string) => d !== dept)
                                : [...courseDepartments, dept];
                              updateCourseDepartmentsMutation.mutate({
                                courseId: selectedCourse.id,
                                departments: newDepts,
                              });
                            }}
                            data-testid={`course-dept-option-${dept.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="pointer-events-none"
                            />
                            <span className="text-sm">{dept}</span>
                          </div>
                        );
                      })}
                    {availableDepartments.filter(dept => dept.toLowerCase().includes(deptSearchTerm.toLowerCase())).length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No departments found
                      </div>
                    )}
                  </div>
                  {courseDepartments.length > 0 && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => updateCourseDepartmentsMutation.mutate({
                          courseId: selectedCourse.id,
                          departments: [],
                        })}
                        data-testid="button-clear-course-departments"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              
              <Button onClick={() => setLessonDialogOpen(true)} data-testid="button-add-lesson">
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No lessons yet. Click "Add Lesson" to create the first lesson.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.sort((a, b) => a.sortOrder - b.sortOrder).map((lesson, index, sortedLessons) => (
                <Card key={lesson.id} className="hover-elevate" data-testid={`card-lesson-${lesson.id}`}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === 0 || reorderLessonsMutation.isPending}
                            onClick={() => {
                              const newOrder = [...sortedLessons];
                              [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                              reorderLessonsMutation.mutate(newOrder.map(l => l.id));
                            }}
                            data-testid={`button-move-up-${lesson.id}`}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={index === sortedLessons.length - 1 || reorderLessonsMutation.isPending}
                            onClick={() => {
                              const newOrder = [...sortedLessons];
                              [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                              reorderLessonsMutation.mutate(newOrder.map(l => l.id));
                            }}
                            data-testid={`button-move-down-${lesson.id}`}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          {editingLessonId === lesson.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingLessonTitle}
                                onChange={(e) => setEditingLessonTitle(e.target.value)}
                                className="h-8 text-base font-semibold"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateLessonMutation.mutate({ lessonId: lesson.id, data: { title: editingLessonTitle } });
                                  } else if (e.key === "Escape") {
                                    setEditingLessonId(null);
                                  }
                                }}
                                autoFocus
                                data-testid={`input-edit-lesson-title-${lesson.id}`}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateLessonMutation.mutate({ lessonId: lesson.id, data: { title: editingLessonTitle } })}
                                disabled={updateLessonMutation.isPending}
                                data-testid={`button-save-lesson-title-${lesson.id}`}
                              >
                                <Save className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingLessonId(null)}
                                data-testid={`button-cancel-edit-lesson-${lesson.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{lesson.title}</CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-50 hover:opacity-100"
                                onClick={() => {
                                  setEditingLessonId(lesson.id);
                                  setEditingLessonTitle(lesson.title);
                                }}
                                data-testid={`button-rename-lesson-${lesson.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <CardDescription className="text-sm">{lesson.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {lesson.durationMinutes} min
                        </Badge>
                        {lesson.isRequired && <Badge>Required</Badge>}
                        {/* Quiz Badge */}
                        {getLinkedQuiz(lesson.id) ? (
                          <Badge 
                            variant="secondary" 
                            className="flex items-center gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 cursor-pointer"
                            onClick={() => {
                              setLinkQuizLessonId(lesson.id);
                              setSelectedQuizToLink(getLinkedQuiz(lesson.id)?.id || "");
                              setLinkQuizDialogOpen(true);
                            }}
                            data-testid={`badge-quiz-linked-${lesson.id}`}
                          >
                            <FileQuestion className="h-3 w-3" />
                            {getLinkedQuiz(lesson.id)?.title}
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLinkQuizLessonId(lesson.id);
                              setSelectedQuizToLink("");
                              setLinkQuizDialogOpen(true);
                            }}
                            data-testid={`button-link-quiz-${lesson.id}`}
                          >
                            <FileQuestion className="h-4 w-4 mr-1" />
                            Link Quiz
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingLesson(lesson)}
                          data-testid={`button-edit-lesson-${lesson.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Content
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              data-testid={`button-delete-lesson-${lesson.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{lesson.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid="button-cancel-delete-lesson">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid="button-confirm-delete-lesson"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
            <DialogDescription>Create a new lesson for this course</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                value={lessonFormData.title}
                onChange={(e) => setLessonFormData({ ...lessonFormData, title: e.target.value })}
                placeholder="Enter lesson title"
                data-testid="input-lesson-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={lessonFormData.description}
                onChange={(e) => setLessonFormData({ ...lessonFormData, description: e.target.value })}
                placeholder="Describe what this lesson covers"
                data-testid="input-lesson-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={lessonFormData.durationMinutes}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, durationMinutes: parseInt(e.target.value) || 0 })}
                  data-testid="input-lesson-duration"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={lessonFormData.sortOrder}
                  onChange={(e) => setLessonFormData({ ...lessonFormData, sortOrder: parseInt(e.target.value) || 0 })}
                  data-testid="input-lesson-sort-order"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={lessonFormData.isRequired}
                onCheckedChange={(checked) => setLessonFormData({ ...lessonFormData, isRequired: checked })}
                data-testid="switch-lesson-required"
              />
              <Label>Required lesson</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setLessonDialogOpen(false)} data-testid="button-cancel-lesson">
                Cancel
              </Button>
              <Button
                onClick={() => createLessonMutation.mutate(lessonFormData)}
                disabled={!lessonFormData.title || createLessonMutation.isPending}
                data-testid="button-create-lesson"
              >
                {createLessonMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Lesson
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Quiz Dialog */}
      <Dialog open={linkQuizDialogOpen} onOpenChange={(open) => {
        setLinkQuizDialogOpen(open);
        if (!open) {
          setLinkQuizLessonId(null);
          setSelectedQuizToLink("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Quiz to Lesson</DialogTitle>
            <DialogDescription>
              Select a quiz to link to this lesson. Learners must pass the quiz before proceeding to the next lesson.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Quiz</Label>
              <Select
                value={selectedQuizToLink}
                onValueChange={setSelectedQuizToLink}
              >
                <SelectTrigger data-testid="select-quiz-to-link">
                  <SelectValue placeholder="Choose a quiz..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No quiz (unlink)</SelectItem>
                  {courseQuizzes
                    .filter((quiz: any) => !quiz.lessonId || quiz.lessonId === linkQuizLessonId)
                    .map((quiz: any) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title} ({quiz.passingScore}% to pass)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {courseQuizzes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No quizzes available. Create quizzes in the Question Banks tab first.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setLinkQuizDialogOpen(false)} data-testid="button-cancel-link-quiz">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (linkQuizLessonId) {
                    linkQuizToLessonMutation.mutate({
                      quizId: selectedQuizToLink === "none" ? null : selectedQuizToLink,
                      lessonId: linkQuizLessonId,
                    });
                  }
                }}
                disabled={linkQuizToLessonMutation.isPending}
                data-testid="button-save-link-quiz"
              >
                {linkQuizToLessonMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuestionBanksTab() {
  const { toast } = useToast();
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [bankFormData, setBankFormData] = useState({
    name: "",
    description: "",
    category: "general",
  });
  const [questionFormData, setQuestionFormData] = useState({
    questionType: "multiple_choice",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    points: 1,
    difficultyLevel: "medium",
  });

  const banksQueryKey = ["/api/question-banks"];
  const questionsQueryKey = [`/api/question-banks/${selectedBank?.id}/questions`];

  const { data: questionBanks = [], isLoading: banksLoading } = useQuery<any[]>({
    queryKey: banksQueryKey,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<any[]>({
    queryKey: questionsQueryKey,
    enabled: !!selectedBank?.id,
  });

  const createBankMutation = useMutation({
    mutationFn: async (data: typeof bankFormData) => {
      const response = await apiRequest("POST", "/api/question-banks", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question Bank Created", description: "New question bank has been created." });
      queryClient.invalidateQueries({ queryKey: banksQueryKey });
      setBankDialogOpen(false);
      setBankFormData({ name: "", description: "", category: "general" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create question bank.", variant: "destructive" });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/question-banks/${selectedBank?.id}/questions`, {
        ...data,
        options: JSON.stringify(data.options.filter((o: string) => o.trim())),
        correctAnswer: JSON.stringify(data.correctAnswer),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question Created", description: "New question added to the bank." });
      queryClient.invalidateQueries({ queryKey: questionsQueryKey });
      setQuestionDialogOpen(false);
      setQuestionFormData({
        questionType: "multiple_choice",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        points: 1,
        difficultyLevel: "medium",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create question.", variant: "destructive" });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      const response = await apiRequest("DELETE", `/api/questions/${questionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question Deleted", description: "Question has been removed." });
      queryClient.invalidateQueries({ queryKey: questionsQueryKey });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete question.", variant: "destructive" });
    },
  });

  if (!selectedBank) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Question Banks
              </CardTitle>
              <CardDescription>
                Create and manage reusable question pools for quizzes and assessments
              </CardDescription>
            </div>
            <Button onClick={() => setBankDialogOpen(true)} data-testid="button-create-bank">
              <Plus className="h-4 w-4 mr-2" />
              Create Bank
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {banksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : questionBanks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No question banks yet. Create one to start building your question library.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {questionBanks.map((bank) => (
                <Card 
                  key={bank.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => setSelectedBank(bank)}
                  data-testid={`card-select-bank-${bank.id}`}
                >
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit">{bank.category || "General"}</Badge>
                    <CardTitle className="text-lg">{bank.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{bank.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <FileCheck className="h-3 w-3" />
                      <span>{bank.questionCount || 0} questions</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>

        {/* Create Bank Dialog */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Question Bank</DialogTitle>
              <DialogDescription>Create a new question bank to organize your assessment questions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={bankFormData.name}
                  onChange={(e) => setBankFormData({ ...bankFormData, name: e.target.value })}
                  placeholder="e.g., Fire Safety Questions"
                  data-testid="input-bank-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={bankFormData.description}
                  onChange={(e) => setBankFormData({ ...bankFormData, description: e.target.value })}
                  placeholder="Describe the purpose of this question bank"
                  data-testid="input-bank-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={bankFormData.category} 
                  onValueChange={(value) => setBankFormData({ ...bankFormData, category: value })}
                >
                  <SelectTrigger data-testid="select-bank-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setBankDialogOpen(false)} data-testid="button-cancel-bank">
                  Cancel
                </Button>
                <Button
                  onClick={() => createBankMutation.mutate(bankFormData)}
                  disabled={!bankFormData.name || createBankMutation.isPending}
                  data-testid="button-save-bank"
                >
                  {createBankMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Bank
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedBank(null)} data-testid="button-back-banks">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  {selectedBank.name}
                </CardTitle>
                <CardDescription>{selectedBank.description}</CardDescription>
              </div>
            </div>
            <Button onClick={() => setQuestionDialogOpen(true)} data-testid="button-add-question">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {questionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No questions yet. Click "Add Question" to create the first question.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question, index) => {
                const answerOptions = question.answerOptions as Array<{id: string; text: string}> | null;
                const correctAnswers = question.correctAnswers as string[] | null;
                return (
                  <Collapsible key={question.id}>
                    <Card className="hover-elevate" data-testid={`card-question-${question.id}`}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {QUESTION_TYPES.find(t => t.value === question.questionType)?.label || question.questionType}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {question.points} {question.points === 1 ? "point" : "points"}
                                </Badge>
                              </div>
                              <p className="text-sm">{question.questionText}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                data-testid={`button-view-question-${question.id}`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  data-testid={`button-delete-question-${question.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this question? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteQuestionMutation.mutate(question.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4">
                          <div className="border-t pt-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Answer Options:</p>
                            {answerOptions && answerOptions.length > 0 ? (
                              <div className="space-y-1">
                                {answerOptions.map((option) => {
                                  const isCorrect = correctAnswers?.includes(option.id);
                                  return (
                                    <div 
                                      key={option.id} 
                                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                                        isCorrect 
                                          ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700" 
                                          : "bg-muted/50"
                                      }`}
                                    >
                                      <span className="font-medium w-6">{option.id.toUpperCase()})</span>
                                      <span className="flex-1">{option.text}</span>
                                      {isCorrect && (
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Correct
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No answer options defined</p>
                            )}
                            {question.questionExplanation && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Explanation:</p>
                                <p className="text-sm">{question.questionExplanation}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Question</DialogTitle>
            <DialogDescription>Create a new question for this bank</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select 
                  value={questionFormData.questionType} 
                  onValueChange={(value) => setQuestionFormData({ ...questionFormData, questionType: value })}
                >
                  <SelectTrigger data-testid="select-question-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={questionFormData.points}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, points: parseInt(e.target.value) || 1 })}
                  data-testid="input-question-points"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={questionFormData.questionText}
                onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
                placeholder="Enter your question here"
                data-testid="input-question-text"
              />
            </div>
            {(questionFormData.questionType === "multiple_choice" || questionFormData.questionType === "multiple_select") && (
              <div className="space-y-2">
                <Label>Answer Options</Label>
                {questionFormData.options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionFormData.options];
                        newOptions[idx] = e.target.value;
                        setQuestionFormData({ ...questionFormData, options: newOptions });
                      }}
                      placeholder={`Option ${idx + 1}`}
                      data-testid={`input-option-${idx}`}
                    />
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setQuestionFormData({ ...questionFormData, options: [...questionFormData.options, ""] })}
                  data-testid="button-add-option"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            )}
            {questionFormData.questionType === "true_false" && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select 
                  value={questionFormData.correctAnswer} 
                  onValueChange={(value) => setQuestionFormData({ ...questionFormData, correctAnswer: value })}
                >
                  <SelectTrigger data-testid="select-correct-answer">
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {questionFormData.questionType === "multiple_choice" && (
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Select 
                  value={questionFormData.correctAnswer} 
                  onValueChange={(value) => setQuestionFormData({ ...questionFormData, correctAnswer: value })}
                >
                  <SelectTrigger data-testid="select-correct-answer">
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionFormData.options.filter(o => o.trim()).map((option, idx) => (
                      <SelectItem key={idx} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={questionFormData.explanation}
                onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                placeholder="Explain why this is the correct answer"
                data-testid="input-question-explanation"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setQuestionDialogOpen(false)} data-testid="button-cancel-question">
                Cancel
              </Button>
              <Button
                onClick={() => createQuestionMutation.mutate(questionFormData)}
                disabled={!questionFormData.questionText || createQuestionMutation.isPending}
                data-testid="button-save-question"
              >
                {createQuestionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LearnerPortalTab({ courses }: { courses: StaffCourse[] }) {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<StaffCourse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [showInteractiveTraining, setShowInteractiveTraining] = useState(false);

  // Check if this is the Front Desk Control Center Training course
  const isFrontDeskTrainingCourse = selectedCourse?.name === "Front Desk Control Center Training";

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const staffId = currentUser?.staffId || "";
  const lessonsQueryKey = [`/api/courses/${selectedCourse?.id}/lessons`];
  const lessonContentQueryKey = [`/api/lessons/${selectedLesson?.id}/content-blocks`];
  const lessonPagesQueryKey = [`/api/lessons/${selectedLesson?.id}/pages`];
  const lessonQuizQueryKey = [`/api/lessons/${selectedLesson?.id}/quiz`];
  
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery<any[]>({
    queryKey: lessonsQueryKey,
    enabled: !!selectedCourse?.id,
  });

  const { data: lessonContentBlocks = [], isLoading: contentLoading } = useQuery<any[]>({
    queryKey: lessonContentQueryKey,
    enabled: !!selectedLesson?.id,
  });

  const { data: lessonPages = [], isLoading: pagesLoading } = useQuery<any[]>({
    queryKey: lessonPagesQueryKey,
    enabled: !!selectedLesson?.id,
  });

  const { data: lessonQuiz } = useQuery<any>({
    queryKey: lessonQuizQueryKey,
    enabled: !!selectedLesson?.id,
  });

  const { data: lessonQuizQuestions = [], isLoading: lessonQuizQuestionsLoading } = useQuery<any[]>({
    queryKey: [`/api/quizzes/${lessonQuiz?.id}/questions`],
    enabled: !!lessonQuiz?.id && quizMode,
  });

  const { data: lessonProgress = [] } = useQuery<any[]>({
    queryKey: [`/api/lesson-progress`],
  });

  const { data: myCertificates = [] } = useQuery<any[]>({
    queryKey: [`/api/staff/${staffId}/certificates`],
    enabled: !!staffId,
  });

  const { data: myBadges = [] } = useQuery<any[]>({
    queryKey: [`/api/staff/${staffId}/badges`],
    enabled: !!staffId,
  });

  const { data: courseQuizzes = [] } = useQuery<any[]>({
    queryKey: [`/api/courses/${selectedCourse?.id}/quizzes`],
    enabled: !!selectedCourse?.id,
  });

  const { data: quizQuestions = [], isLoading: questionsLoading } = useQuery<any[]>({
    queryKey: [`/api/quizzes/${courseQuizzes[0]?.id}/questions`],
    enabled: quizMode && courseQuizzes.length > 0,
  });

  const markLessonCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/progress`, {
        courseId,
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Lesson Completed!", description: "Your progress has been saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/lesson-progress`] });
      setSelectedLesson(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save progress.", variant: "destructive" });
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: Record<string, string> }) => {
      const response = await apiRequest("POST", `/api/quizzes/${quizId}/submit`, { answers });
      return response.json();
    },
    onSuccess: (data) => {
      setQuizResult({ score: data.score, passed: data.passed });
      if (data.passed) {
        toast({ title: "Quiz Passed!", description: `You scored ${data.score}%. Great job!` });
      } else {
        toast({ 
          title: "Quiz Not Passed", 
          description: `You scored ${data.score}%. You need ${lessonQuiz?.passingScore || 70}% to pass.`,
          variant: "destructive" 
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/lesson-progress`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit quiz.", variant: "destructive" });
    },
  });

  const getLessonStatus = (lessonId: string) => {
    const progress = lessonProgress.find((p: any) => p.lessonId === lessonId);
    return progress?.status || "not_started";
  };

  const calculateCourseProgress = (courseId: string) => {
    if (!lessons.length) return 0;
    const courseLessons = lessons.filter((l: any) => l.courseId === courseId);
    const completedLessons = courseLessons.filter((l: any) => getLessonStatus(l.id) === "completed");
    return Math.round((completedLessons.length / courseLessons.length) * 100);
  };

  if (selectedLesson) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedLesson(null)} data-testid="button-back-lesson">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {selectedLesson.title}
                </CardTitle>
                <CardDescription>{selectedLesson.description}</CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {selectedLesson.durationMinutes} min
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(contentLoading || pagesLoading) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : lessonContentBlocks.length === 0 && lessonPages.length === 0 ? (
              <div className="bg-muted rounded-lg p-8 min-h-[300px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Lesson content has not been added yet.</p>
                  <p className="text-sm text-muted-foreground">Contact your administrator to add content to this lesson.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const sortedPages = [...lessonPages].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
                  const orphanBlocks = lessonContentBlocks.filter((b: any) => !b.pageId);
                  const pageBlocks = lessonContentBlocks.filter((b: any) => b.pageId);
                  
                  const renderBlock = (block: any) => (
                    <div key={block.id} className="lesson-content-block" data-testid={`lesson-block-${block.id}`}>
                      {block.blockType === 'text' && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                          {block.caption && (
                            <p className="text-sm text-muted-foreground mt-2 italic">{block.caption}</p>
                          )}
                        </div>
                      )}
                      {block.blockType === 'image' && block.imageUrl && (
                        <figure className="my-4">
                          <img 
                            src={block.imageUrl} 
                            alt={block.caption || 'Lesson image'} 
                            className="max-w-full h-auto rounded-lg border shadow-sm"
                          />
                          {block.caption && (
                            <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                              {block.caption}
                            </figcaption>
                          )}
                        </figure>
                      )}
                      {block.blockType === 'video' && block.videoUrl && (
                        <figure className="my-4">
                          <div className="aspect-video rounded-lg overflow-hidden border shadow-sm">
                            {isUploadedVideoUrl(block.videoUrl) ? (
                              <video 
                                src={block.videoUrl} 
                                controls
                                className="w-full h-full object-contain bg-black"
                              />
                            ) : (
                              <iframe 
                                src={parseVideoUrl(block.videoUrl)} 
                                className="w-full h-full"
                                allowFullScreen
                                title={block.caption || 'Video content'}
                              />
                            )}
                          </div>
                          {block.caption && (
                            <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
                              {block.caption}
                            </figcaption>
                          )}
                        </figure>
                      )}
                      {block.blockType === 'divider' && (
                        <Separator className="my-6" />
                      )}
                    </div>
                  );

                  return (
                    <>
                      {orphanBlocks.length > 0 && (
                        <div className="space-y-4">
                          {sortedPages.length > 0 && (
                            <div className="border-b pb-2">
                              <h3 className="font-semibold text-lg">Introduction</h3>
                            </div>
                          )}
                          {orphanBlocks.sort((a: any, b: any) => a.sortOrder - b.sortOrder).map(renderBlock)}
                        </div>
                      )}
                      
                      {sortedPages.map((page: any) => {
                        const blocksForPage = pageBlocks
                          .filter((b: any) => b.pageId === page.id)
                          .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
                        
                        return (
                          <div key={page.id} className="space-y-4">
                            <div className="border-b pb-2">
                              <h3 className="font-semibold text-lg">{page.title}</h3>
                              {page.description && (
                                <p className="text-sm text-muted-foreground">{page.description}</p>
                              )}
                            </div>
                            {blocksForPage.map(renderBlock)}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}

            {lessonQuiz && !quizMode && (
              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      Lesson Quiz: {lessonQuiz.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Complete this quiz to test your knowledge. Passing score: {lessonQuiz.passingScore}%
                    </p>
                  </div>
                  <Button onClick={() => setQuizMode(true)} data-testid="button-start-quiz">
                    <Play className="h-4 w-4 mr-1" />
                    Take Quiz
                  </Button>
                </div>
              </div>
            )}

            {quizMode && lessonQuiz && (
              <div className="mt-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      {lessonQuiz.title}
                    </CardTitle>
                    <CardDescription>
                      Answer all questions to complete the quiz. Passing score: {lessonQuiz.passingScore}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {lessonQuizQuestionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : lessonQuizQuestions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No questions available for this quiz.</p>
                    ) : (
                      <>
                        {lessonQuizQuestions.map((question: any, index: number) => (
                          <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                            <p className="font-medium">
                              {index + 1}. {question.questionText}
                            </p>
                            <div className="space-y-2 pl-4">
                              {question.options?.map((option: string, optIndex: number) => (
                                <label key={optIndex} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    value={option}
                                    checked={quizAnswers[question.id] === option}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                        {quizResult ? (
                          <div className={`p-4 rounded-lg text-center ${quizResult.passed ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                            <h4 className={`font-semibold text-lg ${quizResult.passed ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                              {quizResult.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                            </h4>
                            <p className={`${quizResult.passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                              Your score: {quizResult.score}%
                            </p>
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => { setQuizMode(false); setQuizAnswers({}); setQuizResult(null); }}
                              data-testid="button-close-quiz"
                            >
                              Close Quiz
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => { setQuizMode(false); setQuizAnswers({}); }} data-testid="button-cancel-quiz">
                              Cancel
                            </Button>
                            <Button 
                              disabled={Object.keys(quizAnswers).length < lessonQuizQuestions.length || submitQuizMutation.isPending}
                              onClick={() => submitQuizMutation.mutate({ quizId: lessonQuiz.id, answers: quizAnswers })}
                              data-testid="button-submit-quiz"
                            >
                              {submitQuizMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Submit Quiz
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedLesson(null)} data-testid="button-exit-lesson">
                Exit Lesson
              </Button>
              <Button 
                onClick={() => markLessonCompleteMutation.mutate({ 
                  lessonId: selectedLesson.id, 
                  courseId: selectedCourse?.id || "" 
                })}
                disabled={markLessonCompleteMutation.isPending || getLessonStatus(selectedLesson.id) === "completed"}
                data-testid="button-mark-complete"
              >
                {markLessonCompleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {getLessonStatus(selectedLesson.id) === "completed" ? "Completed" : "Mark as Complete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => { setSelectedCourse(null); setShowInteractiveTraining(false); }} data-testid="button-back-portal">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    {selectedCourse.name}
                  </CardTitle>
                  <CardDescription>{selectedCourse.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{selectedCourse.category}</Badge>
                <Badge variant="secondary">{selectedCourse.duration} min</Badge>
                {isFrontDeskTrainingCourse && (
                  <Button 
                    onClick={() => setShowInteractiveTraining(!showInteractiveTraining)}
                    data-testid="button-start-interactive-training"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    {showInteractiveTraining ? "View Lessons" : "Start Interactive Training"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showInteractiveTraining && isFrontDeskTrainingCourse ? (
              <FrontDeskTrainingContent onComplete={() => setShowInteractiveTraining(false)} />
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Course Progress</span>
                    <span className="text-sm text-muted-foreground">{calculateCourseProgress(selectedCourse.id)}%</span>
                  </div>
                  <Progress value={calculateCourseProgress(selectedCourse.id)} className="h-2" />
                </div>

            {lessonsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lessons available for this course yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.sort((a, b) => a.sortOrder - b.sortOrder).map((lesson, index) => {
                  const status = getLessonStatus(lesson.id);
                  return (
                    <Card 
                      key={lesson.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => setSelectedLesson(lesson)}
                      data-testid={`card-lesson-portal-${lesson.id}`}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                              status === "completed" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                                : "bg-primary/10 text-primary"
                            } font-semibold text-sm`}>
                              {status === "completed" ? <CheckCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            <div>
                              <CardTitle className="text-base">{lesson.title}</CardTitle>
                              <CardDescription className="text-sm">{lesson.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.durationMinutes} min
                            </Badge>
                            {status === "completed" && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                Completed
                              </Badge>
                            )}
                            {status === "in_progress" && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Certificates and Badges Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-primary" />
              My Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myCertificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete courses to earn certificates.
              </p>
            ) : (
              <div className="space-y-2">
                {myCertificates.slice(0, 3).map((cert: any) => (
                  <div key={cert.id} className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span>{cert.courseName}</span>
                  </div>
                ))}
                {myCertificates.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{myCertificates.length - 3} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              My Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Earn badges by completing courses and achieving milestones.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myBadges.slice(0, 5).map((badge: any) => (
                  <Badge key={badge.id} variant="secondary">
                    <Star className="h-3 w-3 mr-1" />
                    {badge.name}
                  </Badge>
                ))}
                {myBadges.length > 5 && (
                  <Badge variant="outline">+{myBadges.length - 5}</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Courses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            My Learning
          </CardTitle>
          <CardDescription>
            Browse available courses and continue your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => setSelectedCourse(course)}
                data-testid={`card-course-portal-${course.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{course.category}</Badge>
                    {course.isRequired && <Badge variant="destructive">Required</Badge>}
                  </div>
                  <CardTitle className="text-lg">{course.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {course.passingScore}% to pass
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {courses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No courses available. Contact your administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrainingLMS() {
  const facilityId = useFacility();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<StaffCourse | null>(null);
  const [courseFormData, setCourseFormData] = useState({
    name: "",
    description: "",
    category: "clinical",
    courseType: "self_paced",
    duration: 0,
    passingScore: 80,
    isRequired: false,
    renewalFrequencyDays: 365,
    completionDays: 30,
    regulatoryReference: "",
    contentUrl: "",
    contentType: "video",
  });
  const [assignFormData, setAssignFormData] = useState({
    staffId: "",
    courseId: "",
    dueDate: "",
  });
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [sendInvitesOnAssign, setSendInvitesOnAssign] = useState<boolean>(false);
  
  // View Assigned Staff Dialog state
  const [viewAssignedStaffDialogOpen, setViewAssignedStaffDialogOpen] = useState(false);
  const [viewAssignedStaffCourseId, setViewAssignedStaffCourseId] = useState<string | null>(null);
  
  // Email Training Dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [staffSearchOpen, setStaffSearchOpen] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    staffId: "",
    courseId: "",
    quizId: "",
    recipientEmail: "",
    recipientName: "",
    expirationDays: 14,
    attemptsAllowed: 3,
  });
  
  // Competency Checklists state
  const [selectedModule, setSelectedModule] = useState<CompetencyModule | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<StaffCompetencyAssessment | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [assignAssessmentDialogOpen, setAssignAssessmentDialogOpen] = useState(false);
  const [assessmentFormData, setAssessmentFormData] = useState({
    staffId: "",
    moduleId: "",
    assessmentType: "upon_hire" as string,
  });
  const [itemResponses, setItemResponses] = useState<Record<string, boolean>>({});
  const [sectionValidations, setSectionValidations] = useState<Record<string, { validation: string; scenarioResponse: string }>>({});
  const [attestationSignature, setAttestationSignature] = useState("");
  const [supervisorNotes, setSupervisorNotes] = useState("");

  const { data: courses = [], isLoading: coursesLoading } = useQuery<StaffCourse[]>({
    queryKey: ["/api/staff-courses", { facilityId }],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<StaffCourseAssignment[]>({
    queryKey: ["/api/course-assignments", { facilityId }],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff", { facilityId }],
  });

  // Competency module queries
  const { data: competencyModules = [], isLoading: modulesLoading } = useQuery<CompetencyModule[]>({
    queryKey: ["/api/competency-modules", { facilityId }],
  });

  const { data: competencyAssessments = [] } = useQuery<StaffCompetencyAssessment[]>({
    queryKey: ["/api/competency-assessments", { facilityId }],
  });

  const { data: moduleSections = [], isLoading: sectionsLoading } = useQuery<(CompetencySection & { items: CompetencyItem[] })[]>({
    queryKey: ["/api/competency-modules", selectedModule?.id, "sections"],
    enabled: !!selectedModule,
  });

  const { data: assessmentResponses } = useQuery<{ sectionResponses: StaffCompetencySectionResponse[], itemResponses: StaffCompetencyItemResponse[] }>({
    queryKey: ["/api/competency-assessments", selectedAssessment?.id, "responses"],
    enabled: !!selectedAssessment,
  });

  // Reset state when switching assessments or when assessment is deselected
  useEffect(() => {
    // Always reset state when assessment changes to avoid stale data
    setItemResponses({});
    setSectionValidations({});
    setSupervisorNotes(selectedAssessment?.supervisorNotes || "");
    setAttestationSignature(selectedAssessment?.employeeSignature || "");
    
    // When assessment is deselected, ensure all fields are cleared
    if (!selectedAssessment) {
      setSupervisorNotes("");
      setAttestationSignature("");
    }
  }, [selectedAssessment]);

  // Hydrate state from API when responses are loaded
  useEffect(() => {
    if (assessmentResponses) {
      // Hydrate item responses
      const newItemResponses: Record<string, boolean> = {};
      if (assessmentResponses.itemResponses) {
        assessmentResponses.itemResponses.forEach((response: StaffCompetencyItemResponse) => {
          newItemResponses[response.itemId] = response.isCompleted;
        });
      }
      setItemResponses(newItemResponses);

      // Hydrate section validations
      const newSectionValidations: Record<string, { validation: string; scenarioResponse: string }> = {};
      if (assessmentResponses.sectionResponses) {
        assessmentResponses.sectionResponses.forEach((response: StaffCompetencySectionResponse) => {
          newSectionValidations[response.sectionId] = {
            validation: response.supervisorValidation || "",
            scenarioResponse: (response as any).scenarioResponse || "",
          };
        });
      }
      setSectionValidations(newSectionValidations);
    }
  }, [assessmentResponses]);

  const createCourseMutation = useMutation({
    mutationFn: async (data: typeof courseFormData) => {
      return apiRequest("POST", "/api/staff-courses", { ...data, facilityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-courses", { facilityId }] });
      setCourseDialogOpen(false);
      resetCourseForm();
      toast({ title: "Course created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create course", variant: "destructive" });
    },
  });

  // Query to get aggregate department targeting for the selected course
  const { data: courseDepartmentTargeting } = useQuery<{ courseId: string; departments: string[] }>({
    queryKey: [`/api/courses/${assignFormData.courseId}/department-targeting`],
    enabled: !!assignFormData.courseId && assignDialogOpen,
  });
  const assignCourseDepartments = courseDepartmentTargeting?.departments || [];

  // Query to get staff filtered by the course's lesson departments
  const staffByDepartmentsUrl = assignCourseDepartments.length > 0
    ? `/api/staff-by-departments?${assignCourseDepartments.map(d => `departments=${encodeURIComponent(d)}`).join('&')}`
    : '/api/staff-by-departments';
  const { data: filteredStaffForAssign = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff-by-departments', assignCourseDepartments],
    queryFn: async () => {
      const response = await fetch(staffByDepartmentsUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: assignDialogOpen && !!assignFormData.courseId,
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: typeof assignFormData) => {
      return apiRequest("POST", `/api/course-assignments?facilityId=${facilityId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course-assignments", { facilityId }] });
      setAssignDialogOpen(false);
      resetAssignForm();
      toast({ title: "Course assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign course", variant: "destructive" });
    },
  });

  // Bulk assignment mutation (uses server-side API)
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ staffIds, courseId, dueDate, sendInvites }: { staffIds: string[]; courseId: string; dueDate: string; sendInvites: boolean }) => {
      const response = await apiRequest("POST", `/api/course-assignments/bulk`, { staffIds, courseId, dueDate, sendInvites });
      return response.json();
    },
    onSuccess: (data: { successCount: number; failureCount: number; invitesSent?: number; results: any[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/course-assignments", { facilityId }] });
      setAssignDialogOpen(false);
      setSelectedStaffIds([]);
      setSendInvitesOnAssign(false);
      resetAssignForm();
      let description = '';
      if (data.failureCount > 0) {
        description = `${data.failureCount} already assigned.`;
      }
      if (data.invitesSent && data.invitesSent > 0) {
        description += ` ${data.invitesSent} invite${data.invitesSent !== 1 ? 's' : ''} sent.`;
      }
      toast({ 
        title: `Course assigned to ${data.successCount} staff member${data.successCount !== 1 ? 's' : ''}`,
        description: description.trim() || undefined,
      });
    },
    onError: () => {
      toast({ title: "Failed to assign course", variant: "destructive" });
    },
  });

  const sendTrainingEmailMutation = useMutation({
    mutationFn: async (data: typeof emailFormData) => {
      return apiRequest("POST", "/api/external-training/send-invitation", {
        targetStaffId: data.staffId,
        courseId: data.courseId,
        quizId: data.quizId || null,
        recipientEmail: data.recipientEmail,
        recipientName: data.recipientName,
        expirationDays: data.expirationDays,
        attemptsAllowed: data.attemptsAllowed,
      });
    },
    onSuccess: () => {
      setEmailDialogOpen(false);
      setEmailFormData({
        staffId: "",
        courseId: "",
        quizId: "",
        recipientEmail: "",
        recipientName: "",
        expirationDays: 14,
        attemptsAllowed: 3,
      });
      toast({ 
        title: "Training email sent", 
        description: "The staff member will receive an email with training access link." 
      });
    },
    onError: () => {
      toast({ title: "Failed to send training email", variant: "destructive" });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffCourseAssignment> }) => {
      return apiRequest("PATCH", `/api/course-assignments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/course-assignments", { facilityId }] });
      toast({ title: "Progress updated" });
    },
  });

  // Competency assessment mutations
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: { staffId: string; moduleId: string; assessmentType: string }) => {
      return apiRequest("POST", "/api/competency-assessments", {
        ...data,
        facilityId,
        status: "assigned",
        assignedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-assessments", { facilityId }] });
      setAssignAssessmentDialogOpen(false);
      setAssessmentFormData({ staffId: "", moduleId: "", assessmentType: "upon_hire" });
      toast({ title: "Competency assessment assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign assessment", variant: "destructive" });
    },
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StaffCompetencyAssessment> }) => {
      return apiRequest("PATCH", `/api/competency-assessments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-assessments", { facilityId }] });
      toast({ title: "Assessment updated" });
    },
    onError: () => {
      toast({ title: "Failed to update assessment", variant: "destructive" });
    },
  });

  const upsertItemResponseMutation = useMutation({
    mutationFn: async (data: { assessmentId: string; itemId: string; isCompleted: boolean }) => {
      return apiRequest("POST", `/api/competency-assessments/${data.assessmentId}/items/${data.itemId}`, {
        isCompleted: data.isCompleted,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-assessments", selectedAssessment?.id, "responses"] });
    },
  });

  const upsertSectionResponseMutation = useMutation({
    mutationFn: async (data: { assessmentId: string; sectionId: string; validationResult: string; scenarioResponse?: string; supervisorNotes?: string }) => {
      return apiRequest("POST", `/api/competency-assessments/${data.assessmentId}/sections/${data.sectionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competency-assessments", selectedAssessment?.id, "responses"] });
      toast({ title: "Section validation saved" });
    },
  });

  const resetCourseForm = () => {
    setCourseFormData({
      name: "",
      description: "",
      category: "clinical",
      courseType: "self_paced",
      duration: 0,
      passingScore: 80,
      isRequired: false,
      renewalFrequencyDays: 365,
      completionDays: 30,
      regulatoryReference: "",
      contentUrl: "",
      contentType: "video",
    });
    setSelectedCourse(null);
  };

  const resetAssignForm = () => {
    setAssignFormData({
      staffId: "",
      courseId: "",
      dueDate: "",
    });
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || course.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeStaff = staff.filter(s => s.isActive);
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const inProgressAssignments = assignments.filter(a => a.status === "in_progress").length;
  const overdueAssignments = assignments.filter(a => {
    if (!a.dueDate) return false;
    return new Date(a.dueDate) < new Date() && a.status !== "completed";
  }).length;

  const overallComplianceRate = assignments.length > 0 
    ? Math.round((completedAssignments / assignments.length) * 100) 
    : 0;

  if (coursesLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Training LMS</h1>
          <p className="text-muted-foreground mt-1">
            Learning Management System for staff training and compliance
          </p>
        </div>
        <TrainingPortalSettingsDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-courses">{courses.length}</div>
            <p className="text-xs text-muted-foreground">Available courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-compliance">{overallComplianceRate}%</div>
            <Progress value={overallComplianceRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-in-progress">{inProgressAssignments}</div>
            <p className="text-xs text-muted-foreground">Active enrollments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-overdue">{overdueAssignments}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="courses" data-testid="tab-courses">Course Catalog</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="competency" data-testid="tab-competency">
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Competency Checklists
          </TabsTrigger>
          <TabsTrigger value="course-builder" data-testid="tab-course-builder">
            <BookOpen className="h-4 w-4 mr-1" />
            Course Builder
          </TabsTrigger>
          <TabsTrigger value="learner-portal" data-testid="tab-learner-portal">
            <GraduationCap className="h-4 w-4 mr-2" />
            Learner Portal
          </TabsTrigger>
          <TabsTrigger value="question-banks" data-testid="tab-question-banks">
            <FileCheck className="h-4 w-4 mr-1" />
            Question Banks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 flex-1 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-courses"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-category">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => setCourseDialogOpen(true)} data-testid="button-add-course">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCourses.map((course) => (
                  <Card key={course.id} className="hover-elevate" data-testid={`course-card-${course.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{course.name}</CardTitle>
                          <CardDescription className="mt-1">{course.description}</CardDescription>
                        </div>
                        {course.isRequired && (
                          <Badge variant="destructive" className="shrink-0">Required</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <Badge variant="outline">
                            {CATEGORIES.find(c => c.value === course.category)?.label}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{course.duration ? `${course.duration} min` : "Self-paced"}</span>
                        </div>
                        {course.regulatoryReference && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reference:</span>
                            <span className="text-xs">{course.regulatoryReference}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => {
                            setAssignFormData({ ...assignFormData, courseId: course.id });
                            setAssignDialogOpen(true);
                          }}
                          data-testid={`button-assign-${course.id}`}
                        >
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Assign to Staff
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => {
                            setViewAssignedStaffCourseId(course.id);
                            setViewAssignedStaffDialogOpen(true);
                          }}
                          data-testid={`button-view-assigned-${course.id}`}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View Assigned Staff ({assignments.filter(a => a.courseId === course.id).length})
                        </Button>
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => {
                            setEmailFormData({ ...emailFormData, courseId: course.id });
                            setEmailDialogOpen(true);
                          }}
                          data-testid={`button-email-training-${course.id}`}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Send via Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredCourses.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No courses found. Create your first course to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Course Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const staffMember = staff.find(s => s.id === assignment.staffId);
                    const course = courses.find(c => c.id === assignment.courseId);
                    const statusConfig = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.assigned;
                    
                    return (
                      <TableRow key={assignment.id} data-testid={`assignment-row-${assignment.id}`}>
                        <TableCell className="font-medium">
                          {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Unknown"}
                        </TableCell>
                        <TableCell>{course?.name || "Unknown Course"}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={assignment.progress} className="w-16" />
                            <span className="text-sm">{assignment.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.dueDate 
                            ? format(new Date(assignment.dueDate), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {assignment.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateAssignmentMutation.mutate({
                                  id: assignment.id,
                                  data: {
                                    status: "completed",
                                    progress: 100,
                                    completedAt: new Date(),
                                  } as Partial<StaffCourseAssignment>,
                                });
                              }}
                              data-testid={`button-complete-${assignment.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No course assignments yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Compliance Status</CardTitle>
              <CardDescription>
                Training compliance status per EOEA 651 CMR 12 requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeStaff.map((member) => {
                    const memberAssignments = assignments.filter(a => a.staffId === member.id);
                    const memberCompleted = memberAssignments.filter(a => a.status === "completed").length;
                    const complianceRate = memberAssignments.length > 0
                      ? Math.round((memberCompleted / memberAssignments.length) * 100)
                      : 0;
                    
                    return (
                      <TableRow key={member.id} data-testid={`compliance-row-${member.id}`}>
                        <TableCell className="font-medium">
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{member.role}</Badge>
                        </TableCell>
                        <TableCell>{memberAssignments.length}</TableCell>
                        <TableCell>{memberCompleted}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={complianceRate} 
                              className={`w-16 ${complianceRate < 80 ? '[&>div]:bg-red-500' : ''}`}
                            />
                            <span className={`text-sm ${complianceRate < 80 ? 'text-red-600' : ''}`}>
                              {complianceRate}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competency" className="space-y-4">
          {selectedAssessment ? (
            // Assessment Detail View
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4 flex-wrap">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedAssessment(null);
                      setItemResponses({});
                      setSectionValidations({});
                      setAttestationSignature("");
                    }}
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      Assessment: {competencyModules.find(m => m.id === selectedAssessment.moduleId)?.name}
                    </CardTitle>
                    <CardDescription>
                      Staff: {staff.find(s => s.id === selectedAssessment.staffId)?.firstName} {staff.find(s => s.id === selectedAssessment.staffId)?.lastName}
                      {" | "}Type: {ASSESSMENT_TYPE_CONFIG[selectedAssessment.assessmentType] || selectedAssessment.assessmentType}
                    </CardDescription>
                  </div>
                  <Badge className={ASSESSMENT_STATUS_CONFIG[selectedAssessment.status]?.color || ""}>
                    {ASSESSMENT_STATUS_CONFIG[selectedAssessment.status]?.label || selectedAssessment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {sectionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {moduleSections.map((section, idx) => {
                      const sectionItemResponses = section.items?.map(item => 
                        itemResponses[item.id] ?? false
                      ) || [];
                      const completedCount = sectionItemResponses.filter(Boolean).length;
                      const totalCount = section.items?.length || 0;
                      const isComplete = completedCount === totalCount && totalCount > 0;
                      const validation = sectionValidations[section.id];

                      return (
                        <Card key={section.id} className={isComplete ? "border-green-300 dark:border-green-800" : ""} data-testid={`section-card-${section.id}`}>
                          <Collapsible defaultOpen={idx === 0}>
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover-elevate">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                                    <div>
                                      <CardTitle className="text-base">
                                        Section {section.sectionNumber}: {section.name}
                                      </CardTitle>
                                      {section.description && (
                                        <CardDescription className="text-sm mt-1">
                                          {section.description}
                                        </CardDescription>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {completedCount}/{totalCount}
                                    </span>
                                    {isComplete && (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="space-y-4">
                                <div className="space-y-2">
                                  {section.items?.map((item) => (
                                    <div 
                                      key={item.id} 
                                      className="flex items-start gap-3 p-2 rounded-md hover-elevate"
                                      data-testid={`item-${item.id}`}
                                    >
                                      <Checkbox
                                        id={item.id}
                                        checked={itemResponses[item.id] || false}
                                        onCheckedChange={(checked) => {
                                          setItemResponses(prev => ({ ...prev, [item.id]: !!checked }));
                                          if (selectedAssessment) {
                                            upsertItemResponseMutation.mutate({
                                              assessmentId: selectedAssessment.id,
                                              itemId: item.id,
                                              isCompleted: !!checked,
                                            });
                                          }
                                        }}
                                        data-testid={`checkbox-item-${item.id}`}
                                      />
                                      <Label 
                                        htmlFor={item.id} 
                                        className={`flex-1 cursor-pointer ${item.isScenarioItem ? "font-medium text-orange-700 dark:text-orange-300" : ""}`}
                                      >
                                        {item.text}
                                        {item.isScenarioItem && (
                                          <Badge variant="outline" className="ml-2 text-xs">Scenario</Badge>
                                        )}
                                      </Label>
                                    </div>
                                  ))}
                                </div>

                                {section.hasScenarioValidation && (
                                  <div className="border rounded-md p-4 bg-orange-50 dark:bg-orange-950/20 space-y-3">
                                    <Label className="font-medium flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      Scenario Validation Required: {section.scenarioDescription}
                                    </Label>
                                    <Textarea
                                      placeholder="Document the employee's response to the scenario..."
                                      value={sectionValidations[section.id]?.scenarioResponse || ""}
                                      onChange={(e) => setSectionValidations(prev => ({
                                        ...prev,
                                        [section.id]: {
                                          ...prev[section.id],
                                          scenarioResponse: e.target.value,
                                          validation: prev[section.id]?.validation || "",
                                        }
                                      }))}
                                      data-testid={`textarea-scenario-${section.id}`}
                                    />
                                  </div>
                                )}

                                {isComplete && (
                                  <div className="border rounded-md p-4 space-y-3">
                                    <Label className="font-medium">Supervisor Validation</Label>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant={sectionValidations[section.id]?.validation === "pass" ? "default" : "outline"}
                                        onClick={() => {
                                          setSectionValidations(prev => ({
                                            ...prev,
                                            [section.id]: { ...prev[section.id], validation: "pass", scenarioResponse: prev[section.id]?.scenarioResponse || "" }
                                          }));
                                          if (selectedAssessment) {
                                            upsertSectionResponseMutation.mutate({
                                              assessmentId: selectedAssessment.id,
                                              sectionId: section.id,
                                              validationResult: "pass",
                                              scenarioResponse: sectionValidations[section.id]?.scenarioResponse,
                                            });
                                          }
                                        }}
                                        data-testid={`button-pass-${section.id}`}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Pass
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={sectionValidations[section.id]?.validation === "needs_retraining" ? "destructive" : "outline"}
                                        onClick={() => {
                                          setSectionValidations(prev => ({
                                            ...prev,
                                            [section.id]: { ...prev[section.id], validation: "needs_retraining", scenarioResponse: prev[section.id]?.scenarioResponse || "" }
                                          }));
                                          if (selectedAssessment) {
                                            upsertSectionResponseMutation.mutate({
                                              assessmentId: selectedAssessment.id,
                                              sectionId: section.id,
                                              validationResult: "needs_retraining",
                                              scenarioResponse: sectionValidations[section.id]?.scenarioResponse,
                                            });
                                          }
                                        }}
                                        data-testid={`button-retraining-${section.id}`}
                                      >
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        Needs Retraining
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      );
                    })}

                    {/* Employee Attestation */}
                    <Card className="border-blue-300 dark:border-blue-800">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Employee Attestation
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          I confirm that I have been trained on each competency listed, have demonstrated understanding,
                          and will perform these duties in accordance with The Gables' policies and EOEA 651 CMR 12 requirements.
                        </p>
                        <div className="space-y-2">
                          <Label>Electronic Signature (Type Full Name)</Label>
                          <Input
                            value={attestationSignature}
                            onChange={(e) => setAttestationSignature(e.target.value)}
                            placeholder="Type your full legal name"
                            data-testid="input-attestation-signature"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Supervisor Notes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Supervisor Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={supervisorNotes}
                          onChange={(e) => setSupervisorNotes(e.target.value)}
                          placeholder="Additional notes, observations, or recommendations..."
                          data-testid="textarea-supervisor-notes"
                        />
                      </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      {selectedAssessment.status === "assigned" && (
                        <Button
                          onClick={() => {
                            updateAssessmentMutation.mutate({
                              id: selectedAssessment.id,
                              data: { status: "in_progress", startedAt: new Date() },
                            });
                            setSelectedAssessment({ ...selectedAssessment, status: "in_progress" });
                          }}
                          data-testid="button-start-assessment"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Assessment
                        </Button>
                      )}
                      {(selectedAssessment.status === "in_progress" || selectedAssessment.status === "assigned") && (
                        <Button
                          disabled={!attestationSignature}
                          onClick={() => {
                            updateAssessmentMutation.mutate({
                              id: selectedAssessment.id,
                              data: {
                                status: "pending_approval",
                                employeeSignature: attestationSignature,
                                supervisorNotes,
                              },
                            });
                            setSelectedAssessment({ ...selectedAssessment, status: "pending_approval" });
                            toast({ title: "Assessment submitted for approval" });
                          }}
                          data-testid="button-submit-for-approval"
                        >
                          Submit for Approval
                        </Button>
                      )}
                      {selectedAssessment.status === "pending_approval" && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              updateAssessmentMutation.mutate({
                                id: selectedAssessment.id,
                                data: { status: "rejected" },
                              });
                              setSelectedAssessment({ ...selectedAssessment, status: "rejected" });
                            }}
                            data-testid="button-reject-assessment"
                          >
                            Reject / Needs Retraining
                          </Button>
                          <Button
                            onClick={() => {
                              updateAssessmentMutation.mutate({
                                id: selectedAssessment.id,
                                data: {
                                  status: "approved",
                                  completedAt: new Date(),
                                  supervisorNotes,
                                },
                              });
                              setSelectedAssessment({ ...selectedAssessment, status: "approved" });
                              toast({ title: "Assessment approved!" });
                            }}
                            data-testid="button-approve-assessment"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Assessment
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Modules & Assessments List View
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold">Competency Modules</h2>
                  <p className="text-sm text-muted-foreground">
                    Competency-based assessment checklists for regulatory compliance (EOEA 651 CMR 12)
                  </p>
                </div>
                <Button onClick={() => setAssignAssessmentDialogOpen(true)} data-testid="button-assign-assessment">
                  <Plus className="h-4 w-4 mr-1" />
                  Assign Assessment
                </Button>
              </div>

              {modulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {competencyModules.map((module) => {
                    const moduleAssessments = competencyAssessments.filter(a => a.moduleId === module.id);
                    
                    return (
                      <Card key={module.id} data-testid={`module-card-${module.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5" />
                                {module.name}
                              </CardTitle>
                              <CardDescription className="mt-1">{module.description}</CardDescription>
                            </div>
                            <Badge variant="outline">{module.regulatoryReference}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm mb-4">
                            <p><strong>Purpose:</strong> {module.purpose}</p>
                            <p><strong>Applies To:</strong> {module.appliesTo}</p>
                            <p><strong>Frequency:</strong> {module.frequency?.map(f => ASSESSMENT_TYPE_CONFIG[f] || f).join(", ")}</p>
                            <p><strong>Requirement:</strong> {module.passingRequirement}</p>
                          </div>
                          
                          {moduleAssessments.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Staff Assessments ({moduleAssessments.length})
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Assigned</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {moduleAssessments.map((assessment) => {
                                    const staffMember = staff.find(s => s.id === assessment.staffId);
                                    return (
                                      <TableRow key={assessment.id} data-testid={`assessment-row-${assessment.id}`}>
                                        <TableCell className="font-medium">
                                          {staffMember?.firstName} {staffMember?.lastName}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-xs">
                                            {ASSESSMENT_TYPE_CONFIG[assessment.assessmentType] || assessment.assessmentType}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={ASSESSMENT_STATUS_CONFIG[assessment.status]?.color || ""}>
                                            {ASSESSMENT_STATUS_CONFIG[assessment.status]?.label || assessment.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {assessment.assignedDate ? format(new Date(assessment.assignedDate), "MMM d, yyyy") : "-"}
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setSelectedAssessment(assessment);
                                              setSelectedModule(module);
                                            }}
                                            data-testid={`button-view-assessment-${assessment.id}`}
                                          >
                                            View / Conduct
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {competencyModules.length === 0 && (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No competency modules available. Contact administrator to set up modules.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Course Builder Tab */}
        <TabsContent value="course-builder" className="space-y-4">
          <CourseBuilderTab courses={courses} />
        </TabsContent>

        {/* Learner Portal Tab */}
        <TabsContent value="learner-portal" className="space-y-4">
          <LearnerPortalTab courses={courses} />
        </TabsContent>

        {/* Question Banks Tab */}
        <TabsContent value="question-banks" className="space-y-4">
          <QuestionBanksTab />
        </TabsContent>
      </Tabs>

      {/* Assign Assessment Dialog */}
      <Dialog open={assignAssessmentDialogOpen} onOpenChange={setAssignAssessmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Competency Assessment</DialogTitle>
            <DialogDescription>
              Assign a competency checklist assessment to a staff member for validation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={assessmentFormData.staffId}
                onValueChange={(value) => setAssessmentFormData({ ...assessmentFormData, staffId: value })}
              >
                <SelectTrigger data-testid="select-assessment-staff">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Competency Module</Label>
              <Select
                value={assessmentFormData.moduleId}
                onValueChange={(value) => setAssessmentFormData({ ...assessmentFormData, moduleId: value })}
              >
                <SelectTrigger data-testid="select-assessment-module">
                  <SelectValue placeholder="Select competency module" />
                </SelectTrigger>
                <SelectContent>
                  {competencyModules.map(module => (
                    <SelectItem key={module.id} value={module.id}>{module.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assessment Type</Label>
              <Select
                value={assessmentFormData.assessmentType}
                onValueChange={(value) => setAssessmentFormData({ ...assessmentFormData, assessmentType: value })}
              >
                <SelectTrigger data-testid="select-assessment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upon_hire">Upon Hire</SelectItem>
                  <SelectItem value="annual">Annual Renewal</SelectItem>
                  <SelectItem value="after_issue">After Performance/Compliance Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignAssessmentDialogOpen(false)} data-testid="button-cancel-assessment">
              Cancel
            </Button>
            <Button
              onClick={() => createAssessmentMutation.mutate(assessmentFormData)}
              disabled={!assessmentFormData.staffId || !assessmentFormData.moduleId || createAssessmentMutation.isPending}
              data-testid="button-confirm-assessment"
            >
              {createAssessmentMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Assign Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Training Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Course Name</Label>
              <Input
                value={courseFormData.name}
                onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
                placeholder="e.g., Personal Care Services Training"
                data-testid="input-course-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={courseFormData.description}
                onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                placeholder="Course description and learning objectives..."
                data-testid="input-course-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={courseFormData.category} 
                  onValueChange={(value) => setCourseFormData({ ...courseFormData, category: value })}
                >
                  <SelectTrigger data-testid="select-course-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Course Type</Label>
                <Select 
                  value={courseFormData.courseType} 
                  onValueChange={(value) => setCourseFormData({ ...courseFormData, courseType: value })}
                >
                  <SelectTrigger data-testid="select-course-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={courseFormData.duration}
                  onChange={(e) => setCourseFormData({ ...courseFormData, duration: parseInt(e.target.value) || 0 })}
                  data-testid="input-duration"
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={courseFormData.passingScore}
                  onChange={(e) => setCourseFormData({ ...courseFormData, passingScore: parseInt(e.target.value) || 80 })}
                  data-testid="input-passing-score"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Completion Timeframe (days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={courseFormData.completionDays}
                onChange={(e) => setCourseFormData({ ...courseFormData, completionDays: parseInt(e.target.value) || 30 })}
                placeholder="30"
                data-testid="input-completion-days"
              />
              <p className="text-xs text-muted-foreground">Number of days staff have to complete this course after assignment</p>
            </div>
            <div className="space-y-2">
              <Label>Regulatory Reference</Label>
              <Input
                value={courseFormData.regulatoryReference}
                onChange={(e) => setCourseFormData({ ...courseFormData, regulatoryReference: e.target.value })}
                placeholder="e.g., 651 CMR 12.07(3)"
                data-testid="input-regulatory-ref"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Required Training</Label>
                <p className="text-sm text-muted-foreground">Mark as mandatory for compliance</p>
              </div>
              <Switch
                checked={courseFormData.isRequired}
                onCheckedChange={(checked) => setCourseFormData({ ...courseFormData, isRequired: checked })}
                data-testid="switch-required"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCourseDialogOpen(false)} data-testid="button-cancel-course">
                Cancel
              </Button>
              <Button 
                onClick={() => createCourseMutation.mutate(courseFormData)}
                disabled={!courseFormData.name || !courseFormData.category}
                data-testid="button-create-course"
              >
                Create Course
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open);
        if (!open) {
          setSelectedStaffIds([]);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Course to Staff</DialogTitle>
            <DialogDescription>
              Select a course first, then choose staff members to assign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Course Selection First */}
            <div className="space-y-2">
              <Label>Course</Label>
              <Select 
                value={assignFormData.courseId} 
                onValueChange={(value) => {
                  setAssignFormData({ ...assignFormData, courseId: value, staffId: "" });
                  setSelectedStaffIds([]);
                }}
              >
                <SelectTrigger data-testid="select-assign-course">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Targeting Info */}
            {assignFormData.courseId && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Department Targeting:</span>
                  {assignCourseDepartments.length === 0 ? (
                    <span className="text-muted-foreground">All Departments</span>
                  ) : (
                    <span>{assignCourseDepartments.join(", ")}</span>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Department targeting is set at the course level. Use the Department Targeting button in the Course Builder to change which departments are targeted.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            {/* Staff Selection with Multi-Select */}
            {assignFormData.courseId && (() => {
              const staffToShow = (filteredStaffForAssign.length > 0 ? filteredStaffForAssign : activeStaff) as Staff[];
              const alreadyAssignedIds = assignments
                .filter(a => a.courseId === assignFormData.courseId)
                .map(a => a.staffId);
              const availableStaff = staffToShow.filter(s => !alreadyAssignedIds.includes(s.id));
              const assignedStaff = staffToShow.filter(s => alreadyAssignedIds.includes(s.id));
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Staff Members</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStaffIds(availableStaff.map((s: Staff) => s.id));
                        }}
                        disabled={availableStaff.length === 0}
                        data-testid="button-select-all-staff"
                      >
                        Select All ({availableStaff.length})
                      </Button>
                      {selectedStaffIds.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStaffIds([])}
                          data-testid="button-clear-selection"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                    {/* Available staff (selectable) */}
                    {availableStaff.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedStaffIds(prev => 
                            prev.includes(member.id) 
                              ? prev.filter(id => id !== member.id)
                              : [...prev, member.id]
                          );
                        }}
                        data-testid={`staff-checkbox-${member.id}`}
                      >
                        <Checkbox
                          checked={selectedStaffIds.includes(member.id)}
                          onCheckedChange={() => {
                            setSelectedStaffIds(prev => 
                              prev.includes(member.id) 
                                ? prev.filter(id => id !== member.id)
                                : [...prev, member.id]
                            );
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.role}
                          </p>
                        </div>
                      </div>
                    ))}
                    {/* Already assigned staff (greyed out) */}
                    {assignedStaff.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 border-b last:border-b-0 opacity-50 cursor-not-allowed"
                        data-testid={`staff-assigned-${member.id}`}
                      >
                        <Checkbox checked disabled className="opacity-50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.role}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">Already Assigned</Badge>
                      </div>
                    ))}
                    {(staffToShow.length === 0) && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No staff members available
                      </div>
                    )}
                    {(availableStaff.length === 0 && assignedStaff.length > 0) && (
                      <div className="p-4 text-center text-sm text-muted-foreground border-t">
                        All staff in this department have already been assigned
                      </div>
                    )}
                  </div>
                  {selectedStaffIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedStaffIds.length} staff member{selectedStaffIds.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="input-assign-due-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {assignFormData.dueDate ? (
                      format(new Date(assignFormData.dueDate), "PPP")
                    ) : (
                      <span className="text-muted-foreground">Select a due date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={assignFormData.dueDate ? new Date(assignFormData.dueDate) : undefined}
                    onSelect={(date) => setAssignFormData({ 
                      ...assignFormData, 
                      dueDate: date ? format(date, "yyyy-MM-dd") : "" 
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Send Training Invites Option */}
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <Checkbox
                id="send-invites"
                checked={sendInvitesOnAssign}
                onCheckedChange={(checked) => setSendInvitesOnAssign(checked === true)}
                data-testid="checkbox-send-invites"
              />
              <div className="flex-1">
                <label htmlFor="send-invites" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send training portal invites
                </label>
                <p className="text-xs text-muted-foreground">
                  Email staff with their login credentials for the training portal
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setAssignDialogOpen(false); setSelectedStaffIds([]); }} data-testid="button-cancel-assign">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedStaffIds.length > 0) {
                    bulkAssignMutation.mutate({
                      staffIds: selectedStaffIds,
                      courseId: assignFormData.courseId,
                      dueDate: assignFormData.dueDate,
                      sendInvites: sendInvitesOnAssign,
                    });
                  }
                }}
                disabled={selectedStaffIds.length === 0 || !assignFormData.courseId || bulkAssignMutation.isPending}
                data-testid="button-confirm-assign"
              >
                {bulkAssignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {sendInvitesOnAssign ? `Assign & Invite ${selectedStaffIds.length} Staff` : `Assign to ${selectedStaffIds.length} Staff`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Assigned Staff Dialog */}
      <Dialog open={viewAssignedStaffDialogOpen} onOpenChange={setViewAssignedStaffDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Staff
            </DialogTitle>
            <DialogDescription>
              {viewAssignedStaffCourseId && courses.find(c => c.id === viewAssignedStaffCourseId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const courseAssignments = assignments.filter(a => a.courseId === viewAssignedStaffCourseId);
              if (courseAssignments.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No staff assigned to this course yet.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setViewAssignedStaffDialogOpen(false);
                        if (viewAssignedStaffCourseId) {
                          setAssignFormData({ ...assignFormData, courseId: viewAssignedStaffCourseId });
                          setAssignDialogOpen(true);
                        }
                      }}
                      data-testid="button-assign-from-empty"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Staff
                    </Button>
                  </div>
                );
              }
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseAssignments.map(assignment => {
                      const staffMember = activeStaff.find(s => s.id === assignment.staffId);
                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                assignment.status === "completed" ? "default" : 
                                assignment.status === "in_progress" ? "secondary" : "outline"
                              }
                              className={
                                assignment.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                                assignment.status === "in_progress" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" :
                                ""
                              }
                            >
                              {assignment.status === "completed" ? "Completed" : 
                               assignment.status === "in_progress" ? "In Progress" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={assignment.progress || 0} className="w-16 h-2" />
                              <span className="text-sm text-muted-foreground">{assignment.progress || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.dueDate ? format(new Date(assignment.dueDate), "MMM d, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {assignment.score !== null && assignment.score !== undefined ? (
                              <Badge 
                                variant="outline"
                                className={
                                  assignment.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" :
                                  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                                }
                              >
                                {assignment.score}%
                              </Badge>
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewAssignedStaffDialogOpen(false)} data-testid="button-close-assigned-staff">
              Close
            </Button>
            <Button 
              onClick={() => {
                setViewAssignedStaffDialogOpen(false);
                if (viewAssignedStaffCourseId) {
                  setAssignFormData({ ...assignFormData, courseId: viewAssignedStaffCourseId });
                  setAssignDialogOpen(true);
                }
              }}
              data-testid="button-add-more-staff"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign More Staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Training via Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Training via Email</DialogTitle>
            <DialogDescription>
              Send training materials directly to a staff member's email. They can complete the training without portal access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Popover open={staffSearchOpen} onOpenChange={setStaffSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={staffSearchOpen}
                    className="w-full justify-between"
                    data-testid="select-email-staff"
                  >
                    {emailFormData.staffId
                      ? (() => {
                          const member = activeStaff.find(s => s.id === emailFormData.staffId);
                          return member ? `${member.firstName} ${member.lastName} - ${member.role}` : "Select staff member";
                        })()
                      : "Select staff member"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search staff by name..." />
                    <CommandList>
                      <CommandEmpty>No staff member found.</CommandEmpty>
                      <CommandGroup>
                        {activeStaff.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={`${member.firstName} ${member.lastName} ${member.role}`}
                            onSelect={() => {
                              setEmailFormData({ 
                                ...emailFormData, 
                                staffId: member.id,
                                recipientName: `${member.firstName} ${member.lastName}`,
                                recipientEmail: member.email || "",
                              });
                              setStaffSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                emailFormData.staffId === member.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {member.firstName} {member.lastName} - {member.role}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Select 
                value={emailFormData.courseId} 
                onValueChange={(value) => setEmailFormData({ ...emailFormData, courseId: value })}
              >
                <SelectTrigger data-testid="select-email-course">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={emailFormData.recipientEmail}
                onChange={(e) => setEmailFormData({ ...emailFormData, recipientEmail: e.target.value })}
                placeholder="staff@example.com"
                data-testid="input-email-recipient"
              />
            </div>
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={emailFormData.recipientName}
                onChange={(e) => setEmailFormData({ ...emailFormData, recipientName: e.target.value })}
                placeholder="John Smith"
                data-testid="input-email-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={emailFormData.expirationDays}
                  onChange={(e) => setEmailFormData({ ...emailFormData, expirationDays: parseInt(e.target.value) || 14 })}
                  data-testid="input-email-expiration"
                />
              </div>
              <div className="space-y-2">
                <Label>Attempts Allowed</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={emailFormData.attemptsAllowed}
                  onChange={(e) => setEmailFormData({ ...emailFormData, attemptsAllowed: parseInt(e.target.value) || 3 })}
                  data-testid="input-email-attempts"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)} data-testid="button-cancel-email">
                Cancel
              </Button>
              <Button 
                onClick={() => sendTrainingEmailMutation.mutate(emailFormData)}
                disabled={!emailFormData.staffId || !emailFormData.courseId || !emailFormData.recipientEmail || !emailFormData.recipientName || sendTrainingEmailMutation.isPending}
                data-testid="button-send-training-email"
              >
                {sendTrainingEmailMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Send Training Email
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
