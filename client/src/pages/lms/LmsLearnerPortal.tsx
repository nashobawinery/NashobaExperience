import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  ArrowRight,
  BookOpen, 
  GraduationCap, 
  Play,
  CheckCircle,
  Circle,
  Clock,
  Award,
  Video,
  FileText,
  Home,
  Layers,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn
} from "lucide-react";

interface LmsCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  status: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_minutes: number;
  passing_score: number;
  certificate_enabled: boolean;
  lesson_count: number;
  question_count: number;
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
}

interface LmsQuizQuestion {
  id: string;
  question: string;
  question_type: string;
  options: QuizOption[];
  explanation: string | null;
  points: number;
}

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface LmsEnrollment {
  id: string;
  course_id: string;
  course_title: string;
  course_thumbnail: string | null;
  course_minutes: number;
  course_difficulty: string;
  category_name: string | null;
  category_icon: string | null;
  status: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  final_score: number | null;
  total_lessons: number;
  completed_lessons: number;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
  time_spent_seconds: number;
}

interface CourseDetail extends LmsCourse {
  lessons: LmsLesson[];
  quizQuestions: LmsQuizQuestion[];
}

export default function LmsLearnerPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("catalog");
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<LmsEnrollment | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; passingScore: number } | null>(null);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<LmsCourse[]>({
    queryKey: ['/api/lms/courses'],
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<LmsEnrollment[]>({
    queryKey: ['/api/lms/enrollments'],
    enabled: !!user,
  });

  const { data: courseDetail, isLoading: courseDetailLoading } = useQuery<CourseDetail>({
    queryKey: ['/api/lms/courses', selectedCourse?.id],
    enabled: !!selectedCourse?.id,
    queryFn: async () => {
      const res = await fetch(`/api/lms/courses/${selectedCourse!.id}`);
      return res.json();
    }
  });

  const { data: enrollmentProgress = [] } = useQuery<LessonProgress[]>({
    queryKey: ['/api/lms/enrollments', selectedEnrollment?.id, 'progress'],
    enabled: !!selectedEnrollment,
    queryFn: async () => {
      if (!selectedEnrollment) return [];
      const res = await fetch(`/api/lms/enrollments/${selectedEnrollment.id}/progress`);
      return res.json();
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest('POST', `/api/lms/enroll/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/enrollments'] });
      toast({ title: "Enrolled!", description: "You have been enrolled in this course" });
      setActiveTab("my-courses");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to enroll", variant: "destructive" });
    }
  });

  const progressMutation = useMutation({
    mutationFn: async (data: { enrollmentId: string; lessonId: string; completed: boolean; timeSpentSeconds?: number }) => {
      return apiRequest('POST', '/api/lms/progress', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lms/enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lms/enrollments', selectedEnrollment?.id, 'progress'] });
    }
  });

  const quizMutation = useMutation({
    mutationFn: async (data: { enrollmentId: string; courseId: string; answers: any[] }) => {
      return apiRequest('POST', '/api/lms/quiz/submit', data);
    },
    onSuccess: (data: any) => {
      setQuizResult({ score: data.scorePercent, passed: data.passed, passingScore: data.passingScore });
      setQuizSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/lms/enrollments'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" });
    }
  });

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
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const isEnrolled = (courseId: string) => enrollments.some(e => e.course_id === courseId);
  const getEnrollment = (courseId: string) => enrollments.find(e => e.course_id === courseId);

  const handleStartCourse = (course: LmsCourse) => {
    const enrollment = getEnrollment(course.id);
    if (enrollment) {
      setSelectedEnrollment(enrollment);
      setSelectedCourse(course as CourseDetail);
      setCurrentLessonIndex(0);
      setShowQuiz(false);
      setQuizSubmitted(false);
      setQuizResult(null);
      setQuizAnswers({});
    }
  };

  const handleCompleteLesson = () => {
    if (!selectedEnrollment || !courseDetail) return;
    
    const currentLesson = courseDetail.lessons[currentLessonIndex];
    progressMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      lessonId: currentLesson.id,
      completed: true,
      timeSpentSeconds: currentLesson.estimated_minutes * 60
    });
    
    setLessonProgress(prev => ({ ...prev, [currentLesson.id]: true }));
  };

  const handleNextLesson = () => {
    if (!courseDetail) return;
    handleCompleteLesson();
    
    if (currentLessonIndex < courseDetail.lessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    } else if (courseDetail.quizQuestions.length > 0) {
      setShowQuiz(true);
    }
  };

  const handlePrevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (!selectedEnrollment || !courseDetail) return;
    
    const answers = courseDetail.quizQuestions.map(q => ({
      questionId: q.id,
      selectedOptionIds: quizAnswers[q.id] || []
    }));
    
    quizMutation.mutate({
      enrollmentId: selectedEnrollment.id,
      courseId: courseDetail.id,
      answers
    });
  };

  const closeLearning = () => {
    setSelectedCourse(null);
    setSelectedEnrollment(null);
    setCurrentLessonIndex(0);
    setShowQuiz(false);
    setQuizSubmitted(false);
    setQuizResult(null);
    setQuizAnswers({});
    setLessonProgress({});
  };

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress[lessonId] || enrollmentProgress.some(p => p.lesson_id === lessonId && p.completed);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (selectedCourse && selectedEnrollment && courseDetail) {
    const currentLesson = courseDetail.lessons[currentLessonIndex];
    const progress = ((currentLessonIndex + (showQuiz ? 1 : 0)) / (courseDetail.lessons.length + (courseDetail.quizQuestions.length > 0 ? 1 : 0))) * 100;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={closeLearning} data-testid="button-close-course">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-bold">{courseDetail.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {showQuiz ? 'Quiz' : `Lesson ${currentLessonIndex + 1} of ${courseDetail.lessons.length}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Progress value={progress} />
              </div>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {showQuiz ? (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
              {quizSubmitted ? (
                <Card className="text-center p-8">
                  {quizResult?.passed ? (
                    <>
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold mb-2">Congratulations!</h2>
                      <p className="text-muted-foreground mb-4">You passed with a score of {quizResult.score}%</p>
                      {courseDetail.certificate_enabled && (
                        <Badge className="mb-4">
                          <Award className="h-4 w-4 mr-1" />
                          Certificate Earned
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <Circle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold mb-2">Keep Trying!</h2>
                      <p className="text-muted-foreground mb-4">
                        You scored {quizResult?.score}%. You need {quizResult?.passingScore}% to pass.
                      </p>
                    </>
                  )}
                  <Button onClick={closeLearning} data-testid="button-finish-course">
                    Return to Courses
                  </Button>
                </Card>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Course Quiz</h2>
                    <p className="text-muted-foreground">Answer all questions to complete the course. You need {courseDetail.passing_score}% to pass.</p>
                  </div>

                  <div className="space-y-6">
                    {courseDetail.quizQuestions.map((question, qIdx) => (
                      <Card key={question.id} data-testid={`quiz-question-${qIdx}`}>
                        <CardHeader>
                          <CardTitle className="text-lg">Question {qIdx + 1}</CardTitle>
                          <CardDescription>{question.question}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <RadioGroup
                            value={quizAnswers[question.id]?.[0] || ''}
                            onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: [value] }))}
                          >
                            {question.options.map((option, oIdx) => (
                              <div key={option.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={option.id} id={`q${qIdx}-o${oIdx}`} data-testid={`radio-q${qIdx}-o${oIdx}`} />
                                <Label htmlFor={`q${qIdx}-o${oIdx}`}>{option.text}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmitQuiz} disabled={quizMutation.isPending} data-testid="button-submit-quiz">
                      {quizMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Submit Quiz
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : currentLesson ? (
            <div className="flex h-full">
              <aside className="w-64 border-r bg-card p-4 hidden md:block">
                <h3 className="font-semibold mb-4">Lessons</h3>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-1">
                    {courseDetail.lessons.map((lesson, idx) => (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonIndex(idx)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover-elevate ${idx === currentLessonIndex ? 'bg-primary/10' : ''}`}
                        data-testid={`sidebar-lesson-${idx}`}
                      >
                        {isLessonCompleted(lesson.id) ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    ))}
                    {courseDetail.quizQuestions.length > 0 && (
                      <button
                        onClick={() => setShowQuiz(true)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover-elevate"
                        data-testid="sidebar-quiz"
                      >
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span>Final Quiz</span>
                      </button>
                    )}
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
                      />
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
                      {currentLessonIndex === courseDetail.lessons.length - 1 ? (
                        courseDetail.quizQuestions.length > 0 ? (
                          <>
                            Start Quiz
                            <Award className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Complete Course
                            <CheckCircle className="h-4 w-4 ml-2" />
                          </>
                        )
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
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setLocation("/")}
              data-testid="button-back-home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Learning Portal</h1>
                <p className="text-sm text-muted-foreground">Nashoba Valley Training</p>
              </div>
            </div>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Welcome, {user.firstName || user.email}</span>
            </div>
          ) : (
            <Button onClick={() => window.location.href = '/api/login'} data-testid="button-login">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="catalog" data-testid="tab-catalog">
              <BookOpen className="h-4 w-4 mr-2" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="my-courses" data-testid="tab-my-courses" disabled={!user}>
              <Layers className="h-4 w-4 mr-2" />
              My Learning
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates" disabled={!user}>
              <Award className="h-4 w-4 mr-2" />
              Certificates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Course Catalog</h2>
              <p className="text-muted-foreground">Browse available training courses</p>
            </div>

            {coursesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-40 w-full" />
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
                <p className="text-muted-foreground">Check back soon for new training content.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const enrolled = isEnrolled(course.id);
                  return (
                    <Card key={course.id} className="overflow-hidden hover-elevate" data-testid={`catalog-course-${course.id}`}>
                      <div className="aspect-video bg-muted relative">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <BookOpen className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {enrolled && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-500 text-white">Enrolled</Badge>
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                          <Badge className={getDifficultyColor(course.difficulty)} variant="outline">{course.difficulty}</Badge>
                        </div>
                        {course.category_name && (
                          <p className="text-sm text-muted-foreground">{course.category_name}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{course.description || 'No description'}</p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Layers className="h-4 w-4" />
                            {course.lesson_count} lessons
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {course.estimated_minutes} min
                          </div>
                        </div>
                        {enrolled ? (
                          <Button className="w-full" onClick={() => handleStartCourse(course)} data-testid={`button-continue-${course.id}`}>
                            <Play className="h-4 w-4 mr-2" />
                            Continue Learning
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            onClick={() => user ? enrollMutation.mutate(course.id) : window.location.href = '/api/login'}
                            disabled={enrollMutation.isPending}
                            data-testid={`button-enroll-${course.id}`}
                          >
                            {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {user ? 'Enroll Now' : 'Sign in to Enroll'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-courses" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">My Learning</h2>
              <p className="text-muted-foreground">Continue where you left off</p>
            </div>

            {!user ? (
              <Card className="p-8 text-center">
                <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
                <p className="text-muted-foreground mb-4">Sign in to track your learning progress.</p>
                <Button onClick={() => window.location.href = '/api/login'}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Card>
            ) : enrollmentsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Enrollments</h3>
                <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                <Button onClick={() => setActiveTab('catalog')}>
                  Browse Courses
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {enrollments.map((enrollment) => {
                  const progressPercent = enrollment.total_lessons > 0 
                    ? Math.round((enrollment.completed_lessons / enrollment.total_lessons) * 100) 
                    : 0;
                  
                  return (
                    <Card key={enrollment.id} className="hover-elevate" data-testid={`enrollment-card-${enrollment.id}`}>
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {enrollment.course_thumbnail ? (
                            <img src={enrollment.course_thumbnail} alt={enrollment.course_title} className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{enrollment.course_title}</h3>
                            {enrollment.status === 'completed' && (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                          {enrollment.category_name && (
                            <p className="text-sm text-muted-foreground">{enrollment.category_name}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span>{enrollment.completed_lessons} of {enrollment.total_lessons} lessons</span>
                                <span className="font-medium">{progressPercent}%</span>
                              </div>
                              <Progress value={progressPercent} />
                            </div>
                            {enrollment.final_score !== null && (
                              <Badge variant="outline">Score: {enrollment.final_score}%</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const course = courses.find(c => c.id === enrollment.course_id);
                            if (course) {
                              handleStartCourse(course);
                            }
                          }}
                          data-testid={`button-resume-${enrollment.id}`}
                        >
                          {enrollment.status === 'completed' ? 'Review' : 'Continue'}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">My Certificates</h2>
              <p className="text-muted-foreground">Certificates earned from completed courses</p>
            </div>

            {!user ? (
              <Card className="p-8 text-center">
                <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
                <p className="text-muted-foreground mb-4">Sign in to view your certificates.</p>
                <Button onClick={() => window.location.href = '/api/login'}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Certificates Yet</h3>
                <p className="text-muted-foreground mb-4">Complete courses to earn certificates.</p>
                <Button onClick={() => setActiveTab('catalog')}>
                  Browse Courses
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
