import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Award,
  PlayCircle,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  Home,
  Folder,
  Video,
  List,
  ChevronRight,
  Layers,
  Link,
  Database,
  Copy
} from "lucide-react";
import { getModuleDocs } from "@/docs";
import ModuleDocumentation from "@/components/ModuleDocumentation";
import "@/docs/lms";

interface LmsCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

interface LmsCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  status: 'draft' | 'published' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_minutes: number;
  passing_score: number;
  certificate_enabled: boolean;
  sort_order: number;
  lesson_count: number;
  question_count: number;
  enrollment_count: number;
  created_at: string;
  published_at: string | null;
}

interface LmsLesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  lesson_type: 'text' | 'video' | 'document' | 'interactive';
  content: string | null;
  video_url: string | null;
  document_url: string | null;
  estimated_minutes: number;
  sort_order: number;
  active: boolean;
}

interface LmsQuizQuestion {
  id: string;
  course_id: string;
  lesson_id: string | null;
  question: string;
  question_type: 'multiple_choice' | 'true_false' | 'multi_select';
  options: QuizOption[];
  explanation: string | null;
  points: number;
  sort_order: number;
  active: boolean;
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface LmsStats {
  published_courses: number;
  draft_courses: number;
  total_enrollments: number;
  completed_enrollments: number;
  in_progress_enrollments: number;
  passed_quizzes: number;
  certificates_issued: number;
}

interface LmsEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  course_title: string;
  user_email: string;
  first_name: string;
  last_name: string;
  status: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  final_score: number | null;
  total_lessons: number;
  completed_lessons: number;
}

export default function LmsAdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; category: Partial<LmsCategory> | null }>({ open: false, category: null });
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; course: Partial<LmsCourse> | null }>({ open: false, course: null });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; courseId: string | null; lesson: Partial<LmsLesson> | null }>({ open: false, courseId: null, lesson: null });
  const [quizDialog, setQuizDialog] = useState<{ open: boolean; courseId: string | null; question: Partial<LmsQuizQuestion> | null }>({ open: false, courseId: null, question: null });
  const [selectedCourse, setSelectedCourse] = useState<LmsCourse | null>(null);
  const [quizOptions, setQuizOptions] = useState<QuizOption[]>([{ id: '1', text: '', isCorrect: false }]);

  const { data: stats, isLoading: statsLoading } = useQuery<LmsStats>({
    queryKey: ['/api/lms/admin/stats'],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<LmsCategory[]>({
    queryKey: ['/api/lms/admin/categories'],
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<LmsCourse[]>({
    queryKey: ['/api/lms/admin/courses'],
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<LmsEnrollment[]>({
    queryKey: ['/api/lms/admin/enrollments'],
  });

  const { data: courseLessons = [], isLoading: lessonsLoading } = useQuery<LmsLesson[]>({
    queryKey: ['/api/lms/courses', selectedCourse?.id, 'lessons'],
    enabled: !!selectedCourse,
    queryFn: async () => {
      if (!selectedCourse) return [];
      const res = await fetch(`/api/lms/courses/${selectedCourse.id}/lessons`);
      return res.json();
    }
  });

  const { data: courseQuiz = [], isLoading: quizLoading } = useQuery<LmsQuizQuestion[]>({
    queryKey: ['/api/lms/courses', selectedCourse?.id, 'quiz'],
    enabled: !!selectedCourse,
    queryFn: async () => {
      if (!selectedCourse) return [];
      const res = await fetch(`/api/lms/courses/${selectedCourse.id}/quiz`);
      return res.json();
    }
  });

  const categoryMutation = useMutation({
    mutationFn: async (data: Partial<LmsCategory>) => {
      if (data.id) {
        return apiRequest('PUT', `/api/lms/admin/categories/${data.id}`, data);
      }
      return apiRequest('POST', '/api/lms/admin/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/categories'] });
      setCategoryDialog({ open: false, category: null });
      toast({ title: "Success", description: "Category saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save category", variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/categories'] });
      toast({ title: "Success", description: "Category deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
    }
  });

  const courseMutation = useMutation({
    mutationFn: async (data: Partial<LmsCourse>) => {
      if (data.id) {
        return apiRequest('PUT', `/api/lms/admin/courses/${data.id}`, data);
      }
      return apiRequest('POST', '/api/lms/admin/courses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/stats'] });
      setCourseDialog({ open: false, course: null });
      toast({ title: "Success", description: "Course saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save course", variant: "destructive" });
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/stats'] });
      setSelectedCourse(null);
      toast({ title: "Success", description: "Course deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete course", variant: "destructive" });
    }
  });

  const lessonMutation = useMutation({
    mutationFn: async (data: Partial<LmsLesson> & { courseId: string }) => {
      if (data.id) {
        return apiRequest('PUT', `/api/lms/admin/lessons/${data.id}`, data);
      }
      return apiRequest('POST', `/api/lms/admin/courses/${data.courseId}/lessons`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/courses', selectedCourse?.id, 'lessons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      setLessonDialog({ open: false, courseId: null, lesson: null });
      toast({ title: "Success", description: "Lesson saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save lesson", variant: "destructive" });
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/courses', selectedCourse?.id, 'lessons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      toast({ title: "Success", description: "Lesson deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" });
    }
  });

  const quizMutation = useMutation({
    mutationFn: async (data: Partial<LmsQuizQuestion> & { courseId: string }) => {
      if (data.id) {
        return apiRequest('PUT', `/api/lms/admin/quiz/${data.id}`, data);
      }
      return apiRequest('POST', `/api/lms/admin/courses/${data.courseId}/quiz`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/courses', selectedCourse?.id, 'quiz'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      setQuizDialog({ open: false, courseId: null, question: null });
      setQuizOptions([{ id: '1', text: '', isCorrect: false }]);
      toast({ title: "Success", description: "Quiz question saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save quiz question", variant: "destructive" });
    }
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/quiz/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/courses', selectedCourse?.id, 'quiz'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses'] });
      toast({ title: "Success", description: "Quiz question deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete quiz question", variant: "destructive" });
    }
  });

  const addQuizOption = () => {
    setQuizOptions([...quizOptions, { id: String(quizOptions.length + 1), text: '', isCorrect: false }]);
  };

  const removeQuizOption = (id: string) => {
    if (quizOptions.length > 1) {
      setQuizOptions(quizOptions.filter(o => o.id !== id));
    }
  };

  const updateQuizOption = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setQuizOptions(quizOptions.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'archived': return 'bg-gray-500/10 text-gray-600 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'intermediate': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'advanced': return 'bg-red-500/10 text-red-600 border-red-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      case 'interactive': return <PlayCircle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLocation("/admin-hub")}
              data-testid="button-back-to-hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">LMS Admin</h1>
                <p className="text-sm text-muted-foreground">Learning Management System</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline"
            onClick={() => setLocation("/lms")}
            data-testid="button-view-learner"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            View Learner Portal
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 w-full max-w-4xl">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <Folder className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-courses">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="question-banks" data-testid="tab-question-banks">
              <Database className="h-4 w-4 mr-2" />
              Question Banks
            </TabsTrigger>
            <TabsTrigger value="enrollments" data-testid="tab-enrollments">
              <Users className="h-4 w-4 mr-2" />
              Enrollments
            </TabsTrigger>
            <TabsTrigger value="external-training" data-testid="tab-external-training">
              <Link className="h-4 w-4 mr-2" />
              External Links
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              <Award className="h-4 w-4 mr-2" />
              Certificates
            </TabsTrigger>
            <TabsTrigger value="documentation" data-testid="tab-documentation">
              <FileText className="h-4 w-4 mr-2" />
              Docs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card data-testid="stat-published-courses">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Published Courses</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.published_courses || 0}</div>
                      <p className="text-xs text-muted-foreground">{stats?.draft_courses || 0} drafts</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-enrollments">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Enrollments</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.total_enrollments || 0}</div>
                      <p className="text-xs text-muted-foreground">{stats?.in_progress_enrollments || 0} in progress</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-completions">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.completed_enrollments || 0}</div>
                      <p className="text-xs text-muted-foreground">{stats?.passed_quizzes || 0} quizzes passed</p>
                    </CardContent>
                  </Card>
                  <Card data-testid="stat-certificates">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Certificates</CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.certificates_issued || 0}</div>
                      <p className="text-xs text-muted-foreground">issued</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Recent Courses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {coursesLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : courses.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No courses yet. Create your first course!</p>
                  ) : (
                    <div className="space-y-3">
                      {courses.slice(0, 5).map((course) => (
                        <div key={course.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => { setSelectedCourse(course); setActiveTab('courses'); }}>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-sm text-muted-foreground">{course.lesson_count} lessons</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(course.status)}>{course.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recent Enrollments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enrollmentsLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : enrollments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No enrollments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.slice(0, 5).map((enrollment) => (
                        <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{enrollment.first_name} {enrollment.last_name}</p>
                            <p className="text-sm text-muted-foreground">{enrollment.course_title}</p>
                          </div>
                          <div className="text-right">
                            <Progress value={(enrollment.completed_lessons / enrollment.total_lessons) * 100} className="w-20 h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{enrollment.completed_lessons}/{enrollment.total_lessons}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Categories</h2>
              <Button onClick={() => setCategoryDialog({ open: true, category: {} })} data-testid="button-add-category">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            {categoriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <Card className="p-8 text-center">
                <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Categories</h3>
                <p className="text-muted-foreground mb-4">Create categories to organize your courses.</p>
                <Button onClick={() => setCategoryDialog({ open: true, category: {} })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Category
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Card key={category.id} className="hover-elevate" data-testid={`category-card-${category.id}`}>
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: category.color ? `${category.color}20` : 'var(--primary-10)' }}>
                          <Folder className="h-5 w-5" style={{ color: category.color || 'var(--primary)' }} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription>{category.description || 'No description'}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={category.active ? "default" : "secondary"}>{category.active ? 'Active' : 'Inactive'}</Badge>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCategoryDialog({ open: true, category })} data-testid={`button-edit-category-${category.id}`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteCategoryMutation.mutate(category.id)} data-testid={`button-delete-category-${category.id}`}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            {selectedCourse ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setSelectedCourse(null)} data-testid="button-back-to-courses">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedCourse.title}</h2>
                      <Badge className={getStatusColor(selectedCourse.status)}>{selectedCourse.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">{selectedCourse.description || 'No description'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCourseDialog({ open: true, course: selectedCourse })} data-testid="button-edit-course">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Course
                    </Button>
                    <Button variant="destructive" onClick={() => deleteCourseMutation.mutate(selectedCourse.id)} data-testid="button-delete-course">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Difficulty</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getDifficultyColor(selectedCourse.difficulty)}>{selectedCourse.difficulty}</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{selectedCourse.estimated_minutes} min</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Passing Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{selectedCourse.passing_score}%</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <List className="h-5 w-5" />
                          Lessons ({courseLessons.length})
                        </CardTitle>
                        <CardDescription>Drag to reorder lessons</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setLessonDialog({ open: true, courseId: selectedCourse.id, lesson: {} })} data-testid="button-add-lesson">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Lesson
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {lessonsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : courseLessons.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No lessons yet. Add your first lesson!</p>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {courseLessons.map((lesson, idx) => (
                              <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate" data-testid={`lesson-item-${lesson.id}`}>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground text-sm w-6">{idx + 1}.</span>
                                  {getLessonTypeIcon(lesson.lesson_type)}
                                  <div>
                                    <p className="font-medium">{lesson.title}</p>
                                    <p className="text-xs text-muted-foreground">{lesson.estimated_minutes} min</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => setLessonDialog({ open: true, courseId: selectedCourse.id, lesson })} data-testid={`button-edit-lesson-${lesson.id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteLessonMutation.mutate(lesson.id)} data-testid={`button-delete-lesson-${lesson.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          Quiz Questions ({courseQuiz.length})
                        </CardTitle>
                        <CardDescription>Questions for course assessment</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => { setQuizOptions([{ id: '1', text: '', isCorrect: false }]); setQuizDialog({ open: true, courseId: selectedCourse.id, question: {} }); }} data-testid="button-add-quiz">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Question
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {quizLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : courseQuiz.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No quiz questions. Add questions to assess learners!</p>
                      ) : (
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-2">
                            {courseQuiz.map((question, idx) => (
                              <div key={question.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate" data-testid={`quiz-item-${question.id}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="text-muted-foreground text-sm w-6">Q{idx + 1}.</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{question.question}</p>
                                    <p className="text-xs text-muted-foreground">{question.points} pts - {question.options.length} options</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => { setQuizOptions(question.options || [{ id: '1', text: '', isCorrect: false }]); setQuizDialog({ open: true, courseId: selectedCourse.id, question }); }} data-testid={`button-edit-quiz-${question.id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteQuizMutation.mutate(question.id)} data-testid={`button-delete-quiz-${question.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Courses</h2>
                  <Button onClick={() => setCourseDialog({ open: true, course: {} })} data-testid="button-add-course">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </div>

                {coursesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-32 w-full rounded-lg" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : courses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Courses</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to start building training content.</p>
                    <Button onClick={() => setCourseDialog({ open: true, course: {} })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Course
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map((course) => (
                      <Card key={course.id} className="hover-elevate cursor-pointer overflow-hidden" onClick={() => setSelectedCourse(course)} data-testid={`course-card-${course.id}`}>
                        <div className="aspect-video bg-muted relative">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <BookOpen className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Badge className={getStatusColor(course.status)}>{course.status}</Badge>
                          </div>
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                              {course.category_name && (
                                <p className="text-sm text-muted-foreground">{course.category_name}</p>
                              )}
                            </div>
                            <Badge className={getDifficultyColor(course.difficulty)} variant="outline">{course.difficulty}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description || 'No description'}</p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Layers className="h-4 w-4" />
                              {course.lesson_count} lessons
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {course.estimated_minutes} min
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {course.enrollment_count}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Enrollments</h2>
            </div>

            {enrollmentsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Enrollments</h3>
                <p className="text-muted-foreground">Learners will appear here when they enroll in courses.</p>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between p-4" data-testid={`enrollment-row-${enrollment.id}`}>
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{enrollment.first_name} {enrollment.last_name}</p>
                            <p className="text-sm text-muted-foreground">{enrollment.user_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-medium">{enrollment.course_title}</p>
                            <p className="text-sm text-muted-foreground">
                              Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="w-32">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">Progress</span>
                              <span className="text-xs font-medium">{Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100)}%</span>
                            </div>
                            <Progress value={(enrollment.completed_lessons / enrollment.total_lessons) * 100} />
                          </div>
                          <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'}>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="question-banks" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Question Banks</h2>
              <Button data-testid="button-add-question-bank">
                <Plus className="h-4 w-4 mr-2" />
                Create Question Bank
              </Button>
            </div>

            <Card className="p-8 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Question Bank Management</h3>
              <p className="text-muted-foreground mb-4">Create reusable question banks that can be shared across multiple courses and quizzes.</p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary">0 question banks</Badge>
                <Badge variant="outline">0 questions</Badge>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="external-training" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">External Training Links</h2>
              <Button data-testid="button-add-external-token">
                <Plus className="h-4 w-4 mr-2" />
                Create Training Link
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Public Training Access
                </CardTitle>
                <CardDescription>
                  Generate unique links to allow staff members to access training without requiring a platform account.
                  These links can be shared via email, SMS, or printed QR codes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Active Links</p>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </Card>
                    <Card className="p-4">
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-sm text-muted-foreground">Expired</p>
                    </Card>
                  </div>
                  <p className="text-center text-muted-foreground py-4">
                    No external training links have been created yet. Click "Create Training Link" to get started.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Certificates</h2>
            </div>

            <Card className="p-8 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Certificate Management</h3>
              <p className="text-muted-foreground mb-4">Certificate generation will be available once courses are completed.</p>
              <Badge variant="secondary">{stats?.certificates_issued || 0} certificates issued</Badge>
            </Card>
          </TabsContent>

          <TabsContent value="documentation">
            {getModuleDocs("lms") && (
              <ModuleDocumentation documentation={getModuleDocs("lms")!} />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={categoryDialog.open} onOpenChange={(open) => !open && setCategoryDialog({ open: false, category: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{categoryDialog.category?.id ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>Organize your courses with categories</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" value={categoryDialog.category?.name || ''} onChange={(e) => setCategoryDialog({ ...categoryDialog, category: { ...categoryDialog.category, name: e.target.value } })} placeholder="e.g., Food Safety" data-testid="input-category-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea id="category-description" value={categoryDialog.category?.description || ''} onChange={(e) => setCategoryDialog({ ...categoryDialog, category: { ...categoryDialog.category, description: e.target.value } })} placeholder="Brief description of this category" data-testid="input-category-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon</Label>
                <Input id="category-icon" value={categoryDialog.category?.icon || ''} onChange={(e) => setCategoryDialog({ ...categoryDialog, category: { ...categoryDialog.category, icon: e.target.value } })} placeholder="e.g., book" data-testid="input-category-icon" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <Input id="category-color" type="color" value={categoryDialog.category?.color || '#3B82F6'} onChange={(e) => setCategoryDialog({ ...categoryDialog, category: { ...categoryDialog.category, color: e.target.value } })} data-testid="input-category-color" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="category-active" checked={categoryDialog.category?.active !== false} onCheckedChange={(checked) => setCategoryDialog({ ...categoryDialog, category: { ...categoryDialog.category, active: checked } })} data-testid="switch-category-active" />
              <Label htmlFor="category-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, category: null })}>Cancel</Button>
            <Button onClick={() => categoryMutation.mutate(categoryDialog.category!)} disabled={categoryMutation.isPending} data-testid="button-save-category">
              {categoryMutation.isPending ? 'Saving...' : 'Save Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={courseDialog.open} onOpenChange={(open) => !open && setCourseDialog({ open: false, course: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{courseDialog.course?.id ? 'Edit Course' : 'Create Course'}</DialogTitle>
            <DialogDescription>Build your training course</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="course-title">Title</Label>
                <Input id="course-title" value={courseDialog.course?.title || ''} onChange={(e) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, title: e.target.value } })} placeholder="e.g., Wine Service Fundamentals" data-testid="input-course-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea id="course-description" value={courseDialog.course?.description || ''} onChange={(e) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, description: e.target.value } })} placeholder="What will learners gain from this course?" rows={3} data-testid="input-course-description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-thumbnail">Thumbnail URL</Label>
                <Input id="course-thumbnail" value={courseDialog.course?.thumbnail_url || ''} onChange={(e) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, thumbnail_url: e.target.value } })} placeholder="https://..." data-testid="input-course-thumbnail" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-category">Category</Label>
                  <Select value={courseDialog.course?.category_id || ''} onValueChange={(value) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, category_id: value } })}>
                    <SelectTrigger data-testid="select-course-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-status">Status</Label>
                  <Select value={courseDialog.course?.status || 'draft'} onValueChange={(value) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, status: value as 'draft' | 'published' | 'archived' } })}>
                    <SelectTrigger data-testid="select-course-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course-difficulty">Difficulty</Label>
                  <Select value={courseDialog.course?.difficulty || 'beginner'} onValueChange={(value) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, difficulty: value as 'beginner' | 'intermediate' | 'advanced' } })}>
                    <SelectTrigger data-testid="select-course-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-duration">Duration (min)</Label>
                  <Input id="course-duration" type="number" value={courseDialog.course?.estimated_minutes || 15} onChange={(e) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, estimated_minutes: parseInt(e.target.value) || 15 } })} data-testid="input-course-duration" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-passing">Passing Score (%)</Label>
                  <Input id="course-passing" type="number" min={0} max={100} value={courseDialog.course?.passing_score || 80} onChange={(e) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, passing_score: parseInt(e.target.value) || 80 } })} data-testid="input-course-passing" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="course-certificate" checked={courseDialog.course?.certificate_enabled || false} onCheckedChange={(checked) => setCourseDialog({ ...courseDialog, course: { ...courseDialog.course, certificate_enabled: checked } })} data-testid="switch-course-certificate" />
                <Label htmlFor="course-certificate">Issue certificate on completion</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialog({ open: false, course: null })}>Cancel</Button>
            <Button onClick={() => courseMutation.mutate(courseDialog.course!)} disabled={courseMutation.isPending} data-testid="button-save-course">
              {courseMutation.isPending ? 'Saving...' : 'Save Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonDialog.open} onOpenChange={(open) => !open && setLessonDialog({ open: false, courseId: null, lesson: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{lessonDialog.lesson?.id ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
            <DialogDescription>Build lesson content for this course</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">Title</Label>
                <Input id="lesson-title" value={lessonDialog.lesson?.title || ''} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, title: e.target.value } })} placeholder="e.g., Introduction to Wine Service" data-testid="input-lesson-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-description">Description</Label>
                <Textarea id="lesson-description" value={lessonDialog.lesson?.description || ''} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, description: e.target.value } })} placeholder="Brief overview of this lesson" data-testid="input-lesson-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson-type">Lesson Type</Label>
                  <Select value={lessonDialog.lesson?.lesson_type || 'text'} onValueChange={(value) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, lesson_type: value as 'text' | 'video' | 'document' | 'interactive' } })}>
                    <SelectTrigger data-testid="select-lesson-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Content</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="interactive">Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson-duration">Duration (min)</Label>
                  <Input id="lesson-duration" type="number" value={lessonDialog.lesson?.estimated_minutes || 5} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, estimated_minutes: parseInt(e.target.value) || 5 } })} data-testid="input-lesson-duration" />
                </div>
              </div>
              {lessonDialog.lesson?.lesson_type === 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="lesson-video">Video URL</Label>
                  <Input id="lesson-video" value={lessonDialog.lesson?.video_url || ''} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, video_url: e.target.value } })} placeholder="https://youtube.com/..." data-testid="input-lesson-video" />
                </div>
              )}
              {lessonDialog.lesson?.lesson_type === 'document' && (
                <div className="space-y-2">
                  <Label htmlFor="lesson-document">Document URL</Label>
                  <Input id="lesson-document" value={lessonDialog.lesson?.document_url || ''} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, document_url: e.target.value } })} placeholder="https://..." data-testid="input-lesson-document" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="lesson-content">Content</Label>
                <Textarea id="lesson-content" value={lessonDialog.lesson?.content || ''} onChange={(e) => setLessonDialog({ ...lessonDialog, lesson: { ...lessonDialog.lesson, content: e.target.value } })} placeholder="Write your lesson content here..." rows={8} data-testid="input-lesson-content" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog({ open: false, courseId: null, lesson: null })}>Cancel</Button>
            <Button onClick={() => lessonMutation.mutate({ ...lessonDialog.lesson!, courseId: lessonDialog.courseId! })} disabled={lessonMutation.isPending} data-testid="button-save-lesson">
              {lessonMutation.isPending ? 'Saving...' : 'Save Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quizDialog.open} onOpenChange={(open) => { if (!open) { setQuizDialog({ open: false, courseId: null, question: null }); setQuizOptions([{ id: '1', text: '', isCorrect: false }]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{quizDialog.question?.id ? 'Edit Quiz Question' : 'Add Quiz Question'}</DialogTitle>
            <DialogDescription>Create questions to assess learner understanding</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-question">Question</Label>
                <Textarea id="quiz-question" value={quizDialog.question?.question || ''} onChange={(e) => setQuizDialog({ ...quizDialog, question: { ...quizDialog.question, question: e.target.value } })} placeholder="Enter your question..." rows={2} data-testid="input-quiz-question" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-type">Question Type</Label>
                  <Select value={quizDialog.question?.question_type || 'multiple_choice'} onValueChange={(value) => setQuizDialog({ ...quizDialog, question: { ...quizDialog.question, question_type: value as 'multiple_choice' | 'true_false' | 'multi_select' } })}>
                    <SelectTrigger data-testid="select-quiz-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="multi_select">Multi-Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiz-points">Points</Label>
                  <Input id="quiz-points" type="number" min={1} value={quizDialog.question?.points || 1} onChange={(e) => setQuizDialog({ ...quizDialog, question: { ...quizDialog.question, points: parseInt(e.target.value) || 1 } })} data-testid="input-quiz-points" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Answer Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuizOption} data-testid="button-add-option">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {quizOptions.map((option, idx) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Switch checked={option.isCorrect} onCheckedChange={(checked) => updateQuizOption(option.id, 'isCorrect', checked)} data-testid={`switch-option-correct-${idx}`} />
                      <Input value={option.text} onChange={(e) => updateQuizOption(option.id, 'text', e.target.value)} placeholder={`Option ${idx + 1}`} className="flex-1" data-testid={`input-option-${idx}`} />
                      {quizOptions.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeQuizOption(option.id)} data-testid={`button-remove-option-${idx}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Toggle switch to mark correct answer(s)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-explanation">Explanation (shown after answering)</Label>
                <Textarea id="quiz-explanation" value={quizDialog.question?.explanation || ''} onChange={(e) => setQuizDialog({ ...quizDialog, question: { ...quizDialog.question, explanation: e.target.value } })} placeholder="Explain why this answer is correct..." rows={2} data-testid="input-quiz-explanation" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQuizDialog({ open: false, courseId: null, question: null }); setQuizOptions([{ id: '1', text: '', isCorrect: false }]); }}>Cancel</Button>
            <Button onClick={() => quizMutation.mutate({ ...quizDialog.question!, options: quizOptions, courseId: quizDialog.courseId! })} disabled={quizMutation.isPending} data-testid="button-save-quiz">
              {quizMutation.isPending ? 'Saving...' : 'Save Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
