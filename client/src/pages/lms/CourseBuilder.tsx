import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Clock,
  FileText,
  GripVertical,
  Image,
  Video,
  Type,
  Layers,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  status: string;
  estimated_minutes: number;
  passing_score: number;
  lesson_count: number;
  lessons?: Lesson[];
  courseQuizzes?: Quiz[];
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  estimated_minutes: number;
  sort_order: number;
  quiz_count?: number;
  quiz_title?: string;
  pages?: LessonPage[];
  mainContentBlocks?: ContentBlock[];
  quizzes?: Quiz[];
}

interface LessonPage {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  page_number: number;
  sort_order: number;
  estimated_minutes: number | null;
  contentBlocks?: ContentBlock[];
}

interface ContentBlock {
  id: string;
  lesson_id: string;
  page_id: string | null;
  block_type: string;
  content: string | null;
  video_url: string | null;
  image_url: string | null;
  layout: string | null;
  image_size: string | null;
  caption: string | null;
  sort_order: number;
}

interface Quiz {
  id: string;
  title: string;
  lesson_id: string | null;
  passing_score: number;
}

type ViewMode = "courses" | "course" | "lesson";

export default function CourseBuilder() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; lesson: Partial<Lesson> | null }>({ open: false, lesson: null });
  const [pageDialog, setPageDialog] = useState<{ open: boolean; page: Partial<LessonPage> | null }>({ open: false, page: null });
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; block: Partial<ContentBlock> | null }>({ open: false, block: null });
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/lms/admin/courses'],
  });

  const { data: fullCourse, isLoading: courseLoading, refetch: refetchCourse } = useQuery<Course>({
    queryKey: ['/api/lms/admin/courses', selectedCourse?.id, 'full'],
    enabled: !!selectedCourse?.id,
    queryFn: async () => {
      const res = await fetch(`/api/lms/admin/courses/${selectedCourse!.id}/full`);
      return res.json();
    }
  });

  const { data: fullLesson, isLoading: lessonLoading, refetch: refetchLesson } = useQuery<Lesson>({
    queryKey: ['/api/lms/admin/lessons', selectedLesson?.id, 'full'],
    enabled: !!selectedLesson?.id && viewMode === "lesson",
    queryFn: async () => {
      const res = await fetch(`/api/lms/admin/lessons/${selectedLesson!.id}/full`);
      return res.json();
    }
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: Partial<Lesson>) => {
      return apiRequest('POST', `/api/lms/admin/courses/${selectedCourse!.id}/lessons`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses', selectedCourse?.id, 'full'] });
      setLessonDialog({ open: false, lesson: null });
      toast({ title: "Success", description: "Lesson created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create lesson", variant: "destructive" })
  });

  const updateLessonMutation = useMutation({
    mutationFn: async (data: Partial<Lesson> & { id: string }) => {
      return apiRequest('PUT', `/api/lms/admin/lessons/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses', selectedCourse?.id, 'full'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/lessons', selectedLesson?.id, 'full'] });
      setLessonDialog({ open: false, lesson: null });
      toast({ title: "Success", description: "Lesson updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update lesson", variant: "destructive" })
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/admin/courses', selectedCourse?.id, 'full'] });
      toast({ title: "Success", description: "Lesson deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" })
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: Partial<LessonPage>) => {
      return apiRequest('POST', `/api/lms/admin/lessons/${selectedLesson!.id}/pages`, data);
    },
    onSuccess: () => {
      refetchLesson();
      setPageDialog({ open: false, page: null });
      toast({ title: "Success", description: "Page created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create page", variant: "destructive" })
  });

  const updatePageMutation = useMutation({
    mutationFn: async (data: Partial<LessonPage> & { id: string }) => {
      return apiRequest('PATCH', `/api/lms/admin/pages/${data.id}`, data);
    },
    onSuccess: () => {
      refetchLesson();
      setPageDialog({ open: false, page: null });
      toast({ title: "Success", description: "Page updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update page", variant: "destructive" })
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/pages/${id}`),
    onSuccess: (_data, deletedId) => {
      refetchLesson();
      if (selectedPageId === deletedId) setSelectedPageId(null);
      toast({ title: "Success", description: "Page deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete page", variant: "destructive" })
  });

  const createBlockMutation = useMutation({
    mutationFn: async (data: Partial<ContentBlock>) => {
      if (selectedPageId) {
        return apiRequest('POST', `/api/lms/admin/pages/${selectedPageId}/blocks`, {
          ...data,
          lessonId: selectedLesson!.id
        });
      } else {
        return apiRequest('POST', `/api/lms/admin/lessons/${selectedLesson!.id}/blocks`, data);
      }
    },
    onSuccess: () => {
      refetchLesson();
      setBlockDialog({ open: false, block: null });
      toast({ title: "Success", description: "Content block created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create block", variant: "destructive" })
  });

  const updateBlockMutation = useMutation({
    mutationFn: async (data: Partial<ContentBlock> & { id: string }) => {
      return apiRequest('PATCH', `/api/lms/admin/blocks/${data.id}`, data);
    },
    onSuccess: () => {
      refetchLesson();
      setBlockDialog({ open: false, block: null });
      toast({ title: "Success", description: "Content block updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update block", variant: "destructive" })
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/blocks/${id}`),
    onSuccess: () => {
      refetchLesson();
      toast({ title: "Success", description: "Content block deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete block", variant: "destructive" })
  });

  const [quizDialog, setQuizDialog] = useState<{ open: boolean; quiz: Partial<Quiz> | null; lessonId: string | null }>({ 
    open: false, 
    quiz: null,
    lessonId: null 
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; passingScore: number; lessonId: string | null }) => {
      return apiRequest('POST', `/api/lms/admin/courses/${selectedCourse!.id}/quizzes`, {
        title: data.title,
        description: data.description,
        lessonId: data.lessonId,
        passingScore: data.passingScore,
        quizType: 'standard'
      });
    },
    onSuccess: () => {
      refetchCourse();
      if (selectedLesson) refetchLesson();
      setQuizDialog({ open: false, quiz: null, lessonId: null });
      toast({ title: "Success", description: "Quiz created" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create quiz", variant: "destructive" })
  });

  const updateQuizMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; description?: string; passingScore: number }) => {
      return apiRequest('PUT', `/api/lms/admin/quizzes/${data.id}`, {
        title: data.title,
        description: data.description,
        passingScore: data.passingScore
      });
    },
    onSuccess: () => {
      refetchCourse();
      if (selectedLesson) refetchLesson();
      setQuizDialog({ open: false, quiz: null, lessonId: null });
      toast({ title: "Success", description: "Quiz updated" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update quiz", variant: "destructive" })
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/lms/admin/quizzes/${id}`),
    onSuccess: () => {
      refetchCourse();
      if (selectedLesson) refetchLesson();
      toast({ title: "Success", description: "Quiz deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete quiz", variant: "destructive" })
  });

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode("course");
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedPageId(null);
    setViewMode("lesson");
  };

  const handleBack = () => {
    if (viewMode === "lesson") {
      setSelectedLesson(null);
      setSelectedPageId(null);
      setViewMode("course");
    } else if (viewMode === "course") {
      setSelectedCourse(null);
      setViewMode("courses");
    }
  };

  const getCurrentBlocks = useCallback((): ContentBlock[] => {
    if (!fullLesson) return [];
    if (selectedPageId === null) {
      return fullLesson.mainContentBlocks || [];
    }
    const page = fullLesson.pages?.find(p => p.id === selectedPageId);
    return page?.contentBlocks || [];
  }, [fullLesson, selectedPageId]);

  const getBlockTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'text_image': return <Layers className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLayoutLabel = (layout: string | null) => {
    switch (layout) {
      case 'text_left_image_right': return 'Text Left';
      case 'image_left_text_right': return 'Image Left';
      case 'text_top_image_bottom': return 'Text Top';
      case 'image_top_text_bottom': return 'Image Top';
      default: return 'Full Width';
    }
  };

  const renderCourseList = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Course Builder</h2>
      </div>
      <p className="text-muted-foreground">Select a course to start building lessons and quizzes</p>

      {coursesLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No courses yet. Create a course in the Courses tab first.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card 
              key={course.id} 
              className="cursor-pointer hover-elevate"
              onClick={() => handleSelectCourse(course)}
              data-testid={`card-course-${course.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {course.category_name || 'uncategorized'}
                  </Badge>
                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                    {course.status === 'required' ? 'Required' : course.status}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {course.description || 'No description'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{course.estimated_minutes || 0} min</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderCourseEditor = () => {
    const lessons = fullCourse?.lessons || [];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-to-courses">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{selectedCourse?.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCourse?.description || 'No description'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setLessonDialog({ open: true, lesson: null })} data-testid="button-add-lesson">
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        </div>

        {courseLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <Card className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No lessons yet. Add your first lesson to get started.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <Card key={lesson.id} className="hover-elevate" data-testid={`card-lesson-${lesson.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {lesson.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right text-sm text-muted-foreground mr-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{lesson.estimated_minutes || 0} min</span>
                        </div>
                      </div>
                      {lesson.quiz_count && lesson.quiz_count > 0 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200">
                          <FileText className="h-3 w-3 mr-1" />
                          Quiz: {lesson.quiz_title || 'Attached'}
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectLesson(lesson)}
                        data-testid={`button-edit-content-${lesson.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit Content
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLessonMutation.mutate(lesson.id)}
                        data-testid={`button-delete-lesson-${lesson.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderLessonEditor = () => {
    const pages = fullLesson?.pages || [];
    const currentBlocks = getCurrentBlocks();
    const currentPage = selectedPageId ? pages.find(p => p.id === selectedPageId) : null;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-to-course">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Edit Lesson: {selectedLesson?.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLesson?.description || 'No description'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setPreviewOpen(true)} data-testid="button-preview-lesson">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setPageDialog({ open: true, page: null })} variant="outline" data-testid="button-add-page">
            <Plus className="h-4 w-4 mr-2" />
            Add Page
          </Button>
          <Button onClick={() => setBlockDialog({ open: true, block: null })} data-testid="button-add-content">
            <Plus className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Pages: (Drag to reorder)</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPageId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPageId(null)}
              data-testid="button-page-main"
            >
              Main Content
            </Button>
            {pages.map((page, index) => (
              <div key={page.id} className="flex items-center gap-1">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Button
                  variant={selectedPageId === page.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPageId(page.id)}
                  data-testid={`button-page-${page.id}`}
                >
                  Page {index + 1}: {page.title}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPageDialog({ open: true, page })}
                  data-testid={`button-edit-page-${page.id}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deletePageMutation.mutate(page.id)}
                  data-testid={`button-delete-page-${page.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {selectedPageId === null ? 'Main Content' : `Page: ${currentPage?.title}`}
          </h3>
          {currentPage?.description && (
            <p className="text-sm text-muted-foreground">{currentPage.description}</p>
          )}
        </div>

        {lessonLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : currentBlocks.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No content blocks yet. Add text, images, or videos.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentBlocks.map((block, index) => (
              <Card key={block.id} className="hover-elevate" data-testid={`card-block-${block.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                      <GripVertical className="h-4 w-4 cursor-grab" />
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getBlockTypeIcon(block.block_type)}
                          <span className="capitalize">{block.block_type.replace('_', ' + ')}</span>
                        </Badge>
                        {block.layout && block.block_type === 'text_image' && (
                          <Badge variant="secondary">
                            {getLayoutLabel(block.layout)}
                          </Badge>
                        )}
                      </div>
                      
                      {block.block_type === 'text' || block.block_type === 'text_image' ? (
                        <div className="flex gap-4">
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none flex-1"
                            dangerouslySetInnerHTML={{ __html: block.content?.substring(0, 300) + (block.content && block.content.length > 300 ? '...' : '') || '' }}
                          />
                          {block.block_type === 'text_image' && block.image_url && (
                            <div className="w-32 shrink-0">
                              <img src={block.image_url} alt="Block image" className="w-full h-auto rounded" />
                            </div>
                          )}
                        </div>
                      ) : block.block_type === 'image' ? (
                        <div className="flex items-center gap-4">
                          {block.image_url ? (
                            <img src={block.image_url} alt="Block image" className="h-20 w-auto rounded" />
                          ) : (
                            <div className="h-20 w-32 bg-muted rounded flex items-center justify-center">
                              <Image className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          {block.caption && <p className="text-sm text-muted-foreground">{block.caption}</p>}
                        </div>
                      ) : block.block_type === 'video' ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span>{block.video_url || 'No video URL'}</span>
                        </div>
                      ) : (
                        <Separator />
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setBlockDialog({ open: true, block })}
                        data-testid={`button-edit-block-${block.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBlockMutation.mutate(block.id)}
                        data-testid={`button-delete-block-${block.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Lesson Quiz
            </h3>
            {(!fullLesson?.quizzes || fullLesson.quizzes.length === 0) && (
              <Button
                variant="outline"
                onClick={() => setQuizDialog({ open: true, quiz: null, lessonId: selectedLesson?.id || null })}
                data-testid="button-add-lesson-quiz"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Quiz
              </Button>
            )}
          </div>
          
          {fullLesson?.quizzes && fullLesson.quizzes.length > 0 ? (
            <div className="space-y-2">
              {fullLesson.quizzes.map((quiz) => (
                <Card key={quiz.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium">{quiz.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Passing score: {quiz.passing_score}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setQuizDialog({ open: true, quiz, lessonId: selectedLesson?.id || null })}
                          data-testid={`button-edit-quiz-${quiz.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuizMutation.mutate(quiz.id)}
                          data-testid={`button-delete-quiz-${quiz.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center border-dashed">
              <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No quiz attached to this lesson yet. Add a quiz to test learners.
              </p>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {viewMode === "courses" && renderCourseList()}
      {viewMode === "course" && renderCourseEditor()}
      {viewMode === "lesson" && renderLessonEditor()}

      <Dialog open={lessonDialog.open} onOpenChange={(open) => setLessonDialog({ open, lesson: open ? lessonDialog.lesson : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{lessonDialog.lesson?.id ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            <DialogDescription>
              {lessonDialog.lesson?.id ? 'Update the lesson details' : 'Create a new lesson for this course'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              estimated_minutes: parseInt(formData.get('estimated_minutes') as string) || 0,
            };
            if (lessonDialog.lesson?.id) {
              updateLessonMutation.mutate({ ...data, id: lessonDialog.lesson.id });
            } else {
              createLessonMutation.mutate(data);
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={lessonDialog.lesson?.title || ''} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={lessonDialog.lesson?.description || ''} />
              </div>
              <div>
                <Label htmlFor="estimated_minutes">Estimated Minutes</Label>
                <Input id="estimated_minutes" name="estimated_minutes" type="number" defaultValue={lessonDialog.lesson?.estimated_minutes || 0} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setLessonDialog({ open: false, lesson: null })}>Cancel</Button>
              <Button type="submit" disabled={createLessonMutation.isPending || updateLessonMutation.isPending}>
                {lessonDialog.lesson?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pageDialog.open} onOpenChange={(open) => setPageDialog({ open, page: open ? pageDialog.page : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pageDialog.page?.id ? 'Edit Page' : 'Add Page'}</DialogTitle>
            <DialogDescription>
              {pageDialog.page?.id ? 'Update the page details' : 'Create a new page in this lesson'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              title: formData.get('title') as string,
              description: formData.get('description') as string,
              estimatedMinutes: parseInt(formData.get('estimatedMinutes') as string) || 0,
            };
            if (pageDialog.page?.id) {
              updatePageMutation.mutate({ ...data, id: pageDialog.page.id });
            } else {
              createPageMutation.mutate(data);
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="page-title">Title</Label>
                <Input id="page-title" name="title" defaultValue={pageDialog.page?.title || ''} required />
              </div>
              <div>
                <Label htmlFor="page-description">Description (optional)</Label>
                <Textarea id="page-description" name="description" defaultValue={pageDialog.page?.description || ''} />
              </div>
              <div>
                <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
                <Input id="estimatedMinutes" name="estimatedMinutes" type="number" defaultValue={pageDialog.page?.estimated_minutes || 0} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setPageDialog({ open: false, page: null })}>Cancel</Button>
              <Button type="submit" disabled={createPageMutation.isPending || updatePageMutation.isPending}>
                {pageDialog.page?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ open, block: open ? blockDialog.block : null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{blockDialog.block?.id ? 'Edit Content Block' : 'Add Content Block'}</DialogTitle>
            <DialogDescription>
              Choose the type of content and configure its appearance
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const blockType = formData.get('blockType') as string;
            const data: Partial<ContentBlock> = {
              block_type: blockType,
              content: formData.get('content') as string,
              video_url: formData.get('videoUrl') as string,
              image_url: formData.get('imageUrl') as string,
              layout: formData.get('layout') as string,
              image_size: formData.get('imageSize') as string,
              caption: formData.get('caption') as string,
            };
            if (blockDialog.block?.id) {
              updateBlockMutation.mutate({ ...data, id: blockDialog.block.id });
            } else {
              createBlockMutation.mutate(data);
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="blockType">Block Type</Label>
                <Select name="blockType" defaultValue={blockDialog.block?.block_type || 'text'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="image">Image Only</SelectItem>
                    <SelectItem value="text_image">Text + Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="divider">Divider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">Content (HTML)</Label>
                <Textarea 
                  id="content" 
                  name="content" 
                  defaultValue={blockDialog.block?.content || ''} 
                  rows={6}
                  placeholder="Enter your text content here. HTML is supported."
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input id="imageUrl" name="imageUrl" defaultValue={blockDialog.block?.image_url || ''} placeholder="https://..." />
              </div>

              <div>
                <Label htmlFor="videoUrl">Video URL (YouTube or Vimeo)</Label>
                <Input id="videoUrl" name="videoUrl" defaultValue={blockDialog.block?.video_url || ''} placeholder="https://youtube.com/watch?v=..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="layout">Layout</Label>
                  <Select name="layout" defaultValue={blockDialog.block?.layout || 'text_left_image_right'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text_left_image_right">Text Left, Image Right</SelectItem>
                      <SelectItem value="image_left_text_right">Image Left, Text Right</SelectItem>
                      <SelectItem value="text_top_image_bottom">Text Top, Image Bottom</SelectItem>
                      <SelectItem value="image_top_text_bottom">Image Top, Text Bottom</SelectItem>
                      <SelectItem value="full_width">Full Width</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="imageSize">Image Size</Label>
                  <Select name="imageSize" defaultValue={blockDialog.block?.image_size || 'medium'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
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

              <div>
                <Label htmlFor="caption">Caption (optional)</Label>
                <Input id="caption" name="caption" defaultValue={blockDialog.block?.caption || ''} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setBlockDialog({ open: false, block: null })}>Cancel</Button>
              <Button type="submit" disabled={createBlockMutation.isPending || updateBlockMutation.isPending}>
                {blockDialog.block?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Lesson Preview: {selectedLesson?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {fullLesson?.pages && fullLesson.pages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedPageId === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPageId(null)}
                >
                  Main Content
                </Button>
                {fullLesson.pages.map((page, index) => (
                  <Button
                    key={page.id}
                    variant={selectedPageId === page.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    Page {index + 1}: {page.title}
                  </Button>
                ))}
              </div>
            )}
            
            <div className="space-y-4">
              {getCurrentBlocks().map((block) => {
                if (block.block_type === 'text') {
                  return (
                    <div 
                      key={block.id}
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: block.content || '' }}
                    />
                  );
                }
                if (block.block_type === 'image') {
                  return (
                    <div key={block.id} className="my-4">
                      {block.image_url && (
                        <img src={block.image_url} alt={block.caption || 'Image'} className="max-w-full rounded-lg mx-auto" />
                      )}
                      {block.caption && (
                        <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
                      )}
                    </div>
                  );
                }
                if (block.block_type === 'text_image') {
                  const isHorizontal = block.layout === 'text_left_image_right' || block.layout === 'image_left_text_right';
                  const isImageFirst = block.layout === 'image_left_text_right' || block.layout === 'image_top_text_bottom';
                  
                  return (
                    <div key={block.id} className="my-4">
                      <div className={isHorizontal ? 'flex flex-col md:flex-row gap-4' : 'flex flex-col gap-4'}>
                        {isImageFirst && block.image_url && (
                          <div className="md:w-2/5">
                            <img src={block.image_url} alt={block.caption || 'Image'} className="w-full h-auto rounded-lg" />
                          </div>
                        )}
                        <div className={`prose prose-sm dark:prose-invert max-w-none ${isHorizontal ? 'md:w-3/5' : ''}`} dangerouslySetInnerHTML={{ __html: block.content || '' }} />
                        {!isImageFirst && block.image_url && (
                          <div className="md:w-2/5">
                            <img src={block.image_url} alt={block.caption || 'Image'} className="w-full h-auto rounded-lg" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                if (block.block_type === 'video') {
                  const videoUrl = block.video_url || '';
                  const videoId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
                  const vimeoId = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
                  
                  return (
                    <div key={block.id} className="my-4 aspect-video rounded-lg overflow-hidden bg-muted">
                      {videoId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${videoId}`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : vimeoId ? (
                        <iframe
                          src={`https://player.vimeo.com/video/${vimeoId}`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <Video className="h-12 w-12 mr-2" />
                          <span>Video: {videoUrl}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                if (block.block_type === 'divider') {
                  return <Separator key={block.id} className="my-6" />;
                }
                return null;
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={quizDialog.open} onOpenChange={(open) => setQuizDialog({ open, quiz: open ? quizDialog.quiz : null, lessonId: open ? quizDialog.lessonId : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{quizDialog.quiz?.id ? 'Edit Quiz' : 'Add Quiz'}</DialogTitle>
            <DialogDescription>
              {quizDialog.lessonId ? 'This quiz will be attached to the current lesson' : 'This will be a course-level quiz'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const title = formData.get('title') as string;
            const description = formData.get('description') as string;
            const passingScore = parseInt(formData.get('passingScore') as string) || 70;
            
            if (quizDialog.quiz?.id) {
              updateQuizMutation.mutate({ 
                id: quizDialog.quiz.id, 
                title, 
                description, 
                passingScore 
              });
            } else {
              createQuizMutation.mutate({ 
                title, 
                description, 
                passingScore, 
                lessonId: quizDialog.lessonId 
              });
            }
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input 
                  id="quiz-title" 
                  name="title" 
                  defaultValue={quizDialog.quiz?.title || ''} 
                  placeholder="Enter quiz title"
                  required
                  data-testid="input-quiz-title"
                />
              </div>
              <div>
                <Label htmlFor="quiz-description">Description (optional)</Label>
                <Textarea 
                  id="quiz-description" 
                  name="description" 
                  rows={3}
                  placeholder="Brief description of the quiz"
                  data-testid="input-quiz-description"
                />
              </div>
              <div>
                <Label htmlFor="quiz-passingScore">Passing Score (%)</Label>
                <Input 
                  id="quiz-passingScore" 
                  name="passingScore" 
                  type="number" 
                  min="0" 
                  max="100"
                  defaultValue={quizDialog.quiz?.passing_score || 70}
                  data-testid="input-quiz-passing-score"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setQuizDialog({ open: false, quiz: null, lessonId: null })}>
                Cancel
              </Button>
              <Button type="submit" disabled={createQuizMutation.isPending || updateQuizMutation.isPending}>
                {quizDialog.quiz?.id ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
