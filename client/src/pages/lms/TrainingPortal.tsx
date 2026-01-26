import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  BookOpen, 
  GraduationCap, 
  LogIn,
  LogOut,
  Play,
  CheckCircle,
  Circle,
  Clock,
  Award,
  Video,
  FileText,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface PortalSession {
  sessionToken: string;
  userId: string;
  displayName: string;
  department: string;
  expiresAt: string;
}

interface PortalCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category_name: string | null;
  status: string;
  difficulty: string;
  estimated_minutes: number;
  passing_score: number;
  certificate_enabled: boolean;
  lesson_count: number;
  question_count: number;
  enrollment: any;
  isEnrolled: boolean;
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
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string | null;
  points: number;
}

function LoginView({ onLogin }: { onLogin: (session: PortalSession) => void }) {
  const [accessCode, setAccessCode] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { accessCode: string; lastName: string }) => {
      const res = await fetch('/api/lms/portal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Login failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('trainingPortalSession', JSON.stringify(data));
      onLogin(data);
      toast({ title: "Welcome!", description: `Logged in as ${data.displayName}` });
    },
    onError: (error: Error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.length !== 4) {
      toast({ title: "Invalid Code", description: "Please enter your 4-digit access code", variant: "destructive" });
      return;
    }
    if (!lastName.trim()) {
      toast({ title: "Last Name Required", description: "Please enter your last name", variant: "destructive" });
      return;
    }
    loginMutation.mutate({ accessCode, lastName });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Staff Training Portal</CardTitle>
          <CardDescription>
            Enter your 4-digit access code and last name to access your training courses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-center text-2xl tracking-widest"
                data-testid="input-access-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                data-testid="input-last-name"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending || accessCode.length !== 4 || !lastName.trim()}
              data-testid="button-login"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Access Training
                </>
              )}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Contact your manager if you need an access code
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CourseListView({ 
  session, 
  onSelectCourse, 
  onLogout 
}: { 
  session: PortalSession; 
  onSelectCourse: (course: PortalCourse) => void;
  onLogout: () => void;
}) {
  const { data: courses, isLoading } = useQuery<PortalCourse[]>({
    queryKey: ['/api/lms/portal/courses', session.userId],
    queryFn: async () => {
      const res = await fetch(`/api/lms/portal/courses?userId=${session.userId}`);
      if (!res.ok) throw new Error('Failed to fetch courses');
      return res.json();
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">Training Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {session.displayName}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-6">Your Training Courses</h2>
        
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Courses Available</h3>
              <p className="text-sm text-muted-foreground">
                Check back later for new training courses
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses?.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => onSelectCourse(course)}
                data-testid={`card-course-${course.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    {course.isEnrolled && course.enrollment?.status === 'completed' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : course.isEnrolled ? (
                      <Badge variant="secondary">In Progress</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {course.lesson_count} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.estimated_minutes} min
                    </span>
                  </div>
                  {course.isEnrolled && course.enrollment?.total_lessons > 0 && (
                    <div className="mt-3">
                      <Progress 
                        value={(course.enrollment.completed_lessons / course.enrollment.total_lessons) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {course.enrollment.completed_lessons} of {course.enrollment.total_lessons} lessons completed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseView({ 
  session, 
  course, 
  onBack 
}: { 
  session: PortalSession; 
  course: PortalCourse;
  onBack: () => void;
}) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: courseData, isLoading } = useQuery({
    queryKey: ['/api/lms/courses', course.id],
    queryFn: async () => {
      const res = await fetch(`/api/lms/courses/${course.id}`);
      if (!res.ok) throw new Error('Failed to fetch course');
      return res.json();
    }
  });

  const lessons: LmsLesson[] = courseData?.lessons || [];
  const quizQuestions: LmsQuizQuestion[] = courseData?.quizQuestions || [];
  const currentLesson = lessons[currentLessonIndex];

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lms/enroll/${course.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.userId })
      });
      if (!res.ok) throw new Error('Failed to enroll');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Enrolled!", description: "You've been enrolled in this course" });
    }
  });

  useEffect(() => {
    if (!course.isEnrolled && courseData) {
      enrollMutation.mutate();
    }
  }, [courseData, course.isEnrolled]);

  const handleQuizSubmit = () => {
    let correct = 0;
    quizQuestions.forEach((q) => {
      const answer = quizAnswers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (answer === correctOption?.id) {
        correct++;
      }
    });
    const score = Math.round((correct / quizQuestions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score >= course.passing_score) {
      toast({ 
        title: "Congratulations!", 
        description: `You passed with ${score}%!` 
      });
    } else {
      toast({ 
        title: "Not quite", 
        description: `You scored ${score}%. You need ${course.passing_score}% to pass.`,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showQuiz) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowQuiz(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{course.title}</h1>
              <p className="text-sm text-muted-foreground">Course Quiz</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {quizSubmitted ? (
            <Card>
              <CardContent className="p-8 text-center">
                {quizScore !== null && quizScore >= course.passing_score ? (
                  <>
                    <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Course Complete!</h2>
                    <p className="text-muted-foreground mb-4">
                      You scored {quizScore}% and passed the course
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-4">
                      <Circle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Keep Trying!</h2>
                    <p className="text-muted-foreground mb-4">
                      You scored {quizScore}%. You need {course.passing_score}% to pass.
                    </p>
                  </>
                )}
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={onBack}>
                    Back to Courses
                  </Button>
                  {quizScore !== null && quizScore < course.passing_score && (
                    <Button onClick={() => {
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                      setQuizScore(null);
                    }}>
                      Retake Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {quizQuestions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Question {index + 1} of {quizQuestions.length}
                    </CardTitle>
                    <CardDescription>{question.question}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={quizAnswers[question.id] || ''}
                      onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: value }))}
                    >
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                          <Label htmlFor={`${question.id}-${option.id}`}>{option.text}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleQuizSubmit}
                disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                data-testid="button-submit-quiz"
              >
                Submit Quiz
              </Button>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{course.title}</h1>
            <p className="text-sm text-muted-foreground">
              Lesson {currentLessonIndex + 1} of {lessons.length}
            </p>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 border-r min-h-[calc(100vh-65px)] p-4">
          <h3 className="font-medium mb-3">Lessons</h3>
          <nav className="space-y-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setCurrentLessonIndex(index)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                  index === currentLessonIndex 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover-elevate'
                }`}
                data-testid={`button-lesson-${index}`}
              >
                {index < currentLessonIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <span className="truncate">{lesson.title}</span>
              </button>
            ))}
            {quizQuestions.length > 0 && (
              <button
                onClick={() => setShowQuiz(true)}
                className="w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover-elevate"
                data-testid="button-take-quiz"
              >
                <GraduationCap className="h-4 w-4" />
                <span>Take Quiz</span>
              </button>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          {currentLesson && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {currentLesson.lesson_type === 'video' && <Video className="h-5 w-5 text-primary" />}
                  {currentLesson.lesson_type === 'document' && <FileText className="h-5 w-5 text-primary" />}
                  {currentLesson.lesson_type === 'text' && <BookOpen className="h-5 w-5 text-primary" />}
                  <Badge variant="outline">{currentLesson.lesson_type}</Badge>
                </div>
                <CardTitle>{currentLesson.title}</CardTitle>
                {currentLesson.description && (
                  <CardDescription>{currentLesson.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {currentLesson.video_url && (
                  <div className="aspect-video mb-4">
                    <iframe
                      src={currentLesson.video_url}
                      className="w-full h-full rounded-md"
                      allowFullScreen
                    />
                  </div>
                )}
                {currentLesson.content && (
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentLesson.content }}
                  />
                )}
                {currentLesson.document_url && (
                  <a 
                    href={currentLesson.document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentLessonIndex(prev => prev - 1)}
              disabled={currentLessonIndex === 0}
              data-testid="button-prev-lesson"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentLessonIndex === lessons.length - 1 ? (
              quizQuestions.length > 0 ? (
                <Button onClick={() => setShowQuiz(true)} data-testid="button-start-quiz">
                  Take Quiz
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={onBack}>
                  Complete Course
                  <CheckCircle className="h-4 w-4 ml-2" />
                </Button>
              )
            ) : (
              <Button
                onClick={() => setCurrentLessonIndex(prev => prev + 1)}
                data-testid="button-next-lesson"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function TrainingPortal() {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<PortalCourse | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('trainingPortalSession');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (new Date(data.expiresAt) > new Date()) {
          setSession(data);
        } else {
          localStorage.removeItem('trainingPortalSession');
        }
      } catch {
        localStorage.removeItem('trainingPortalSession');
      }
    }
  }, []);

  const handleLogout = async () => {
    if (session?.sessionToken) {
      try {
        await fetch('/api/lms/portal/logout', {
          method: 'POST',
          headers: { 'x-portal-session': session.sessionToken }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('trainingPortalSession');
    setSession(null);
    setSelectedCourse(null);
  };

  if (!session) {
    return <LoginView onLogin={setSession} />;
  }

  if (selectedCourse) {
    return (
      <CourseView 
        session={session} 
        course={selectedCourse} 
        onBack={() => setSelectedCourse(null)} 
      />
    );
  }

  return (
    <CourseListView 
      session={session} 
      onSelectCourse={setSelectedCourse} 
      onLogout={handleLogout} 
    />
  );
}
