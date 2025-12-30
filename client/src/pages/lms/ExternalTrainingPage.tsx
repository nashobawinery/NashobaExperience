import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GraduationCap, 
  BookOpen, 
  Play,
  CheckCircle,
  Circle,
  Clock,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  User,
  Loader2
} from "lucide-react";

interface ExternalTrainingData {
  id: string;
  course_id: string;
  token: string;
  staff_name: string;
  staff_email: string | null;
  course_title: string;
  course_description: string | null;
  thumbnail_url: string | null;
  estimated_minutes: number;
  difficulty: string;
  lessons: ExternalLesson[];
  progress: ExternalProgress[];
  expires_at: string | null;
}

interface ExternalLesson {
  id: string;
  title: string;
  description: string | null;
  lesson_type: string;
  content: string | null;
  video_url: string | null;
  document_url: string | null;
  estimated_minutes: number;
  sort_order: number;
}

interface ExternalProgress {
  lesson_id: string;
  completed: boolean;
  time_spent_seconds: number;
  completed_at: string | null;
}

export default function ExternalTrainingPage() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  const token = params.token;
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [viewingCourse, setViewingCourse] = useState(false);
  const [localProgress, setLocalProgress] = useState<Record<string, boolean>>({});

  const { data: trainingData, isLoading, error } = useQuery<ExternalTrainingData>({
    queryKey: ['/api/lms/external', token],
    queryFn: async () => {
      const res = await fetch(`/api/lms/external/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to load training');
      }
      return res.json();
    },
    enabled: !!token,
    retry: false
  });

  const progressMutation = useMutation({
    mutationFn: async (data: { lessonId: string; completed: boolean; timeSpentSeconds: number }) => {
      return apiRequest('POST', `/api/lms/external/${token}/progress`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/external', token] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving progress",
        description: error.message || "Failed to save your lesson progress. Please try again.",
        variant: "destructive"
      });
      if (trainingData) {
        const currentLesson = trainingData.lessons[currentLessonIndex];
        setLocalProgress(prev => ({ ...prev, [currentLesson.id]: false }));
      }
    }
  });

  useEffect(() => {
    if (trainingData?.progress) {
      const progressMap: Record<string, boolean> = {};
      trainingData.progress.forEach(p => {
        progressMap[p.lesson_id] = p.completed;
      });
      setLocalProgress(progressMap);
    }
  }, [trainingData?.progress]);

  const isLessonCompleted = (lessonId: string) => {
    return localProgress[lessonId] || trainingData?.progress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const completedLessonsCount = trainingData?.lessons.filter(l => isLessonCompleted(l.id)).length || 0;
  const totalLessons = trainingData?.lessons.length || 0;
  const overallProgress = totalLessons > 0 ? (completedLessonsCount / totalLessons) * 100 : 0;

  const handleCompleteLesson = () => {
    if (!trainingData) return;
    const currentLesson = trainingData.lessons[currentLessonIndex];
    progressMutation.mutate({
      lessonId: currentLesson.id,
      completed: true,
      timeSpentSeconds: currentLesson.estimated_minutes * 60
    });
    setLocalProgress(prev => ({ ...prev, [currentLesson.id]: true }));
  };

  const handleNextLesson = () => {
    handleCompleteLesson();
    if (trainingData && currentLessonIndex < trainingData.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const getLessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading training...</p>
        </div>
      </div>
    );
  }

  if (error || !trainingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Training Not Available</CardTitle>
            <CardDescription>
              {(error as Error)?.message || 'This training link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact your manager or administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewingCourse && trainingData.lessons.length > 0) {
    const currentLesson = trainingData.lessons[currentLessonIndex];
    const lessonProgress = ((currentLessonIndex + 1) / trainingData.lessons.length) * 100;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setViewingCourse(false)} data-testid="button-back-to-overview">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-bold">{trainingData.course_title}</h1>
                <p className="text-sm text-muted-foreground">
                  Lesson {currentLessonIndex + 1} of {trainingData.lessons.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Progress value={lessonProgress} />
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(lessonProgress)}%</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <aside className="w-64 border-r bg-card p-4 hidden md:block">
            <h3 className="font-semibold mb-4">Lessons</h3>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-1">
                {trainingData.lessons.map((lesson, idx) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLessonIndex(idx)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover-elevate ${idx === currentLessonIndex ? 'bg-primary/10' : ''}`}
                    data-testid={`sidebar-lesson-${idx}`}
                  >
                    {isLessonCompleted(lesson.id) ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-2 mb-6">
                {getLessonTypeIcon(currentLesson.lesson_type)}
                <Badge variant="outline">{currentLesson.lesson_type}</Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {currentLesson.estimated_minutes} min
                </Badge>
              </div>

              <h2 className="text-2xl font-bold">{currentLesson.title}</h2>
              
              {currentLesson.description && (
                <p className="text-muted-foreground">{currentLesson.description}</p>
              )}

              {currentLesson.lesson_type === 'video' && currentLesson.video_url && (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={currentLesson.video_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title={currentLesson.title}
                  />
                </div>
              )}

              {currentLesson.lesson_type === 'document' && currentLesson.document_url && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <a 
                    href={currentLesson.document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="h-5 w-5" />
                    View Document
                  </a>
                </div>
              )}

              {currentLesson.content && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: currentLesson.content.replace(/\n/g, '<br />') }} />
                </div>
              )}

              <div className="flex items-center justify-between pt-8 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevLesson}
                  disabled={currentLessonIndex === 0}
                  data-testid="button-prev-lesson"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNextLesson} data-testid="button-next-lesson">
                  {currentLessonIndex === trainingData.lessons.length - 1 ? (
                    <>
                      Complete Course
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next Lesson
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Staff Training</h1>
              <p className="text-sm text-muted-foreground">Nashoba Valley</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{trainingData.staff_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <Card data-testid="training-overview-card">
          <div className="aspect-video relative bg-muted rounded-t-lg overflow-hidden">
            {trainingData.thumbnail_url ? (
              <img 
                src={trainingData.thumbnail_url} 
                alt={trainingData.course_title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <GraduationCap className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{trainingData.course_title}</CardTitle>
                <CardDescription className="mt-2">
                  {trainingData.course_description}
                </CardDescription>
              </div>
              <Badge className={getDifficultyColor(trainingData.difficulty)}>
                {trainingData.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>{totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>~{trainingData.estimated_minutes} minutes</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Progress</span>
                <span className="font-medium">{completedLessonsCount} of {totalLessons} completed</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => setViewingCourse(true)}
              data-testid="button-start-course"
            >
              {completedLessonsCount > 0 ? (
                <>
                  Continue Training
                  <Play className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Start Training
                  <Play className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trainingData.lessons.map((lesson, idx) => (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => { setCurrentLessonIndex(idx); setViewingCourse(true); }}
                  data-testid={`lesson-item-${idx}`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {isLessonCompleted(lesson.id) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <span className="text-sm font-medium">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.title}</p>
                    <p className="text-sm text-muted-foreground">{lesson.estimated_minutes} min</p>
                  </div>
                  {getLessonTypeIcon(lesson.lesson_type)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
