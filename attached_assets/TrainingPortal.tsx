import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  BookOpen,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Trophy,
  XCircle,
  FileText,
  Play,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const isUploadedVideoUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.includes('storage.googleapis.com') || 
         url.includes('replit-objstore') ||
         url.includes('/objects/uploads/') ||
         url.includes('.private/uploads/') ||
         url.startsWith('/api/objects/') ||
         url.endsWith('.mp4') || 
         url.endsWith('.webm') || 
         url.endsWith('.ogg');
};

interface ContentBlock {
  id: string;
  lessonId: string;
  blockType: string;
  content: string | null;
  sortOrder: number;
  caption?: string | null;
  imageUrl?: string | null;
  layout?: string | null;
  imageSize?: string | null;
  videoUrl?: string | null;
  pageId?: string | null;
}

interface LessonPage {
  id: string;
  lessonId: string;
  pageNumber: number;
  sortOrder: number;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  contentBlocks: ContentBlock[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  estimatedMinutes: number;
  pages: LessonPage[];
  contentBlocks: ContentBlock[];
  quiz?: any;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  lessons: Lesson[];
  quiz?: any;
}

interface CourseAssignment {
  id: string;
  courseId: string;
  status: string;
  assignedAt: string;
  dueDate?: string | null;
  completedAt?: string | null;
  course: Course;
}

interface PortalSession {
  staffId: string;
  staffName: string;
  facilityName: string;
  sessionToken: string;
  assignments: CourseAssignment[];
}

export default function TrainingPortal() {
  const { toast } = useToast();
  const [lastName, setLastName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (lockoutRemaining > 0) {
      const timer = setTimeout(() => setLockoutRemaining(lockoutRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutRemaining]);

  const loginMutation = useMutation({
    mutationFn: async ({ lastName, accessCode }: { lastName: string; accessCode: string }) => {
      const response = await fetch("/api/training-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastName, accessCode }),
        credentials: "include",
      });
      
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server error. Please try again.");
      }
      
      if (!response.ok) {
        const error: any = new Error(data.error || "Login failed");
        error.retryAfter = data.retryAfter;
        error.remainingAttempts = data.remainingAttempts;
        throw error;
      }
      
      return data;
    },
    onSuccess: (data) => {
      setSession(data);
      toast({
        title: "Welcome!",
        description: `Hello ${data.staffName}, you have ${data.assignments.length} training course(s) to complete.`,
      });
    },
    onError: (error: any) => {
      if (error.retryAfter) {
        setLockoutRemaining(error.retryAfter);
      }
      const description = error.remainingAttempts !== undefined 
        ? `${error.message} (${error.remainingAttempts} attempts remaining)`
        : error.message || "Invalid credentials. Please try again.";
      toast({
        title: "Access Denied",
        description,
        variant: "destructive",
      });
    },
  });

  const viewLessonMutation = useMutation({
    mutationFn: async ({ lessonId }: { lessonId: string }) => {
      const response = await apiRequest("POST", `/api/training-portal/${session?.sessionToken}/lessons/${lessonId}/view`);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setLessonProgress(prev => ({ ...prev, [variables.lessonId]: true }));
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({ lessonId, answers }: { lessonId?: string; answers: Record<string, string> }) => {
      const url = lessonId 
        ? `/api/training-portal/${session?.sessionToken}/lessons/${lessonId}/submit-quiz`
        : `/api/training-portal/${session?.sessionToken}/submit-quiz`;
      const response = await apiRequest("POST", url, { answers, courseId: selectedCourse?.id });
      return response.json();
    },
    onSuccess: (data) => {
      setQuizResult(data);
      setQuizSubmitted(true);
      if (data.passed) {
        toast({
          title: "Congratulations!",
          description: "You passed the quiz!",
        });
      } else {
        toast({
          title: "Quiz Not Passed",
          description: `You need ${data.passingScore}% to pass. You scored ${data.score}%.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim()) {
      toast({
        title: "Last Name Required",
        description: "Please enter your last name.",
        variant: "destructive",
      });
      return;
    }
    if (accessCode.length !== 4 || !/^\d{4}$/.test(accessCode)) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 4-digit access code.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ lastName, accessCode });
  };

  const handleStartCourse = (assignment: CourseAssignment) => {
    // Sort lessons by sortOrder to ensure correct sequence
    const sortedCourse = {
      ...assignment.course,
      lessons: [...assignment.course.lessons].sort((a, b) => a.sortOrder - b.sortOrder)
    };
    setSelectedCourse(sortedCourse);
    setCurrentLessonIndex(0);
    const firstLesson = sortedCourse.lessons[0];
    const hasMainContent = firstLesson?.contentBlocks && firstLesson.contentBlocks.length > 0;
    console.log('[Training Portal] First lesson:', firstLesson?.title, 'hasMainContent:', hasMainContent, 'blocks:', firstLesson?.contentBlocks?.length);
    setCurrentPageIndex(hasMainContent ? -1 : 0);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
    
    if (sortedCourse.lessons.length > 0) {
      viewLessonMutation.mutate({ lessonId: sortedCourse.lessons[0].id });
    }
  };

  const handleNextLesson = () => {
    if (!selectedCourse) return;
    
    const currentLesson = selectedCourse.lessons[currentLessonIndex];
    const sortedPages = currentLesson?.pages 
      ? [...currentLesson.pages].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    const hasPages = sortedPages.length > 0;
    const hasMainContent = currentLesson?.contentBlocks && currentLesson.contentBlocks.length > 0;
    
    if (currentPageIndex === -1 && hasPages) {
      setCurrentPageIndex(0);
    } else if (hasPages && currentPageIndex < sortedPages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (currentLessonIndex < selectedCourse.lessons.length - 1) {
      const nextLessonIndex = currentLessonIndex + 1;
      setCurrentLessonIndex(nextLessonIndex);
      const nextLesson = selectedCourse.lessons[nextLessonIndex];
      const nextHasMainContent = nextLesson?.contentBlocks && nextLesson.contentBlocks.length > 0;
      setCurrentPageIndex(nextHasMainContent ? -1 : 0);
      viewLessonMutation.mutate({ lessonId: selectedCourse.lessons[nextLessonIndex].id });
    }
  };

  const handlePrevLesson = () => {
    if (!selectedCourse) return;
    
    const currentLesson = selectedCourse.lessons[currentLessonIndex];
    const sortedPages = currentLesson?.pages 
      ? [...currentLesson.pages].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    const hasMainContent = currentLesson?.contentBlocks && currentLesson.contentBlocks.length > 0;
    
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    } else if (currentPageIndex === 0 && hasMainContent) {
      setCurrentPageIndex(-1);
    } else if (currentLessonIndex > 0) {
      const prevLessonIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(prevLessonIndex);
      const prevLesson = selectedCourse.lessons[prevLessonIndex];
      const prevSortedPages = prevLesson?.pages 
        ? [...prevLesson.pages].sort((a, b) => a.sortOrder - b.sortOrder)
        : [];
      setCurrentPageIndex(prevSortedPages.length > 0 ? prevSortedPages.length - 1 : -1);
    }
  };

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.blockType) {
      case "text":
        return (
          <div key={block.id} className="prose prose-sm max-w-none dark:prose-invert my-4">
            <div dangerouslySetInnerHTML={{ __html: block.content || "" }} />
          </div>
        );
      case "image":
        const imageUrl = block.imageUrl || block.content;
        if (!imageUrl) return null;
        return (
          <div key={block.id} className="my-4">
            <div className={`${block.layout === "centered" ? "flex justify-center" : ""}`}>
              <img 
                src={imageUrl} 
                alt={block.caption || "Image"} 
                className={`rounded-lg ${block.imageSize === "small" ? "max-w-xs" : block.imageSize === "large" ? "max-w-4xl w-full" : "max-w-2xl"}`}
              />
            </div>
            {block.caption && (
              <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
            )}
          </div>
        );
      case "video":
        const rawVideoSource = block.videoUrl || block.content || '';
        // Extract src from iframe embed codes if present
        const iframeSrcMatch = rawVideoSource.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        const videoSource = iframeSrcMatch ? iframeSrcMatch[1] : rawVideoSource;
        const videoId = videoSource.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        const vimeoId = videoSource.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
        return (
          <div key={block.id} className="my-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {isUploadedVideoUrl(videoSource) ? (
                <video 
                  src={videoSource} 
                  controls
                  className="w-full h-full object-contain bg-black"
                >
                  Your browser does not support the video tag.
                </video>
              ) : videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : vimeoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}`}
                  className="w-full h-full"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Play className="h-12 w-12 mr-2" />
                  <span>Video: {videoSource}</span>
                </div>
              )}
            </div>
            {block.caption && (
              <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
            )}
          </div>
        );
      case "divider":
        return <Separator key={block.id} className="my-6" />;
      default:
        return null;
    }
  };

  const renderQuiz = (quiz: any, lessonId?: string) => {
    if (quizSubmitted && quizResult) {
      return (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {quizResult.passed ? (
                <Trophy className="h-6 w-6 text-yellow-500" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold">
                {quizResult.score}%
              </div>
              <p className={quizResult.passed ? "text-green-600" : "text-destructive"}>
                {quizResult.passed ? "Congratulations! You passed!" : `You need ${quizResult.passingScore}% to pass.`}
              </p>
              {!quizResult.passed && (
                <Button onClick={() => {
                  setQuizSubmitted(false);
                  setQuizResult(null);
                  setQuizAnswers({});
                }}>
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    const questions = quiz.questions || [];
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{quiz.title || "Quiz"}</CardTitle>
          <CardDescription>
            Answer all questions to complete this section. You need {quiz.passingScore || 70}% to pass.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question: any, qIndex: number) => (
            <div key={question.id || qIndex} className="space-y-3">
              <Label className="text-base font-medium">
                {qIndex + 1}. {question.question}
              </Label>
              <RadioGroup
                value={quizAnswers[question.id] || ""}
                onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: value }))}
              >
                {question.options?.map((option: string, oIndex: number) => (
                  <div key={oIndex} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`q${qIndex}-o${oIndex}`} />
                    <Label htmlFor={`q${qIndex}-o${oIndex}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
          <Button 
            onClick={() => submitQuizMutation.mutate({ lessonId, answers: quizAnswers })}
            disabled={submitQuizMutation.isPending || Object.keys(quizAnswers).length < questions.length}
            className="w-full"
            data-testid="button-submit-quiz"
          >
            {submitQuizMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Quiz"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Staff Training Portal</CardTitle>
            <CardDescription>
              Enter your last name and 4-digit access code to view your training courses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="text-lg"
                  data-testid="input-last-name"
                  disabled={lockoutRemaining > 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <div className="relative">
                  <Input
                    id="accessCode"
                    type={showCode ? "text" : "password"}
                    placeholder="Enter 4-digit code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="text-center text-2xl tracking-widest pr-10"
                    data-testid="input-access-code"
                    disabled={lockoutRemaining > 0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCode(!showCode)}
                    data-testid="button-toggle-code-visibility"
                  >
                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {lockoutRemaining > 0 && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Too many failed attempts. Please wait {lockoutRemaining} seconds.</span>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending || accessCode.length !== 4 || !lastName.trim() || lockoutRemaining > 0}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Access Training
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-center gap-2 text-muted-foreground" data-testid="button-help">
                    <HelpCircle className="h-4 w-4" />
                    Need Help?
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="text-sm space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        How to get your access code
                      </h4>
                      <p className="text-muted-foreground">
                        Your 4-digit access code is set by your facility administrator. If you don't have one or forgot it, please contact your supervisor or HR department.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        What last name should I use?
                      </h4>
                      <p className="text-muted-foreground">
                        Enter your last name exactly as it appears in your employee records. The login is not case-sensitive (Smith, SMITH, and smith all work).
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Locked out?
                      </h4>
                      <p className="text-muted-foreground">
                        For security, after 5 incorrect attempts, you'll need to wait 60 seconds before trying again. If you continue to have trouble, contact your administrator to reset your access code.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        What can I do here?
                      </h4>
                      <ul className="text-muted-foreground space-y-1">
                        <li>• View your assigned training courses</li>
                        <li>• Complete lessons with text, videos, and documents</li>
                        <li>• Take quizzes to demonstrate your knowledge</li>
                        <li>• Track your progress toward completion</li>
                      </ul>
                      <p className="text-muted-foreground text-xs mt-2">
                        Note: Only courses assigned to you by your administrator will appear after login.
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedCourse) {
    const currentLesson = selectedCourse.lessons[currentLessonIndex];
    const sortedPages = currentLesson?.pages 
      ? [...currentLesson.pages].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];
    const hasPages = sortedPages.length > 0;
    const hasMainContent = currentLesson?.contentBlocks && currentLesson.contentBlocks.length > 0;
    const isOnMainContent = currentPageIndex === -1;
    const currentPage = (hasPages && currentPageIndex >= 0) ? sortedPages[currentPageIndex] : null;
    const contentBlocks = isOnMainContent 
      ? (currentLesson?.contentBlocks || [])
      : (currentPage ? currentPage.contentBlocks : currentLesson?.contentBlocks || []);
    const isLastLesson = currentLessonIndex === selectedCourse.lessons.length - 1;
    const isLastPage = !hasPages ? true : currentPageIndex === sortedPages.length - 1;
    const totalSteps = (hasMainContent ? 1 : 0) + sortedPages.length;
    const currentStep = isOnMainContent ? 1 : (hasMainContent ? currentPageIndex + 2 : currentPageIndex + 1);
    const showCourseQuiz = isLastLesson && isLastPage && !isOnMainContent && selectedCourse.quiz;
    const showLessonQuiz = isLastPage && !isOnMainContent && currentLesson?.quiz && !showCourseQuiz;
    
    // Debug logging
    console.log('[Training Portal Render]', {
      lessonIndex: currentLessonIndex,
      lessonTitle: currentLesson?.title,
      pageIndex: currentPageIndex,
      hasMainContent,
      isOnMainContent,
      mainContentBlocks: currentLesson?.contentBlocks?.length,
      pagesCount: sortedPages.length,
      currentPageTitle: currentPage?.title,
      displayingBlocks: contentBlocks.length,
      totalSteps,
      currentStep
    });

    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedCourse(null)}
                data-testid="button-back-to-courses"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Courses
              </Button>
              <div className="text-center flex-1">
                <h1 className="font-semibold truncate">{selectedCourse.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Lesson {currentLessonIndex + 1} of {selectedCourse.lessons.length}
                  {totalSteps > 1 && ` • Step ${currentStep} of ${totalSteps}`}
                </p>
              </div>
              <div className="w-24" />
            </div>
            <Progress 
              value={((currentLessonIndex + (totalSteps > 0 ? currentStep / totalSteps : 1)) / selectedCourse.lessons.length) * 100} 
              className="mt-2" 
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>{isOnMainContent ? currentLesson?.title : (currentPage?.title || currentLesson?.title)}</CardTitle>
              {(isOnMainContent ? currentLesson?.description : (currentPage?.description || currentLesson?.description)) && (
                <CardDescription>{isOnMainContent ? currentLesson?.description : (currentPage?.description || currentLesson?.description)}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {contentBlocks
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(block => renderContentBlock(block))}
            </CardContent>
          </Card>

          {showLessonQuiz && renderQuiz(currentLesson.quiz, currentLesson.id)}
          {showCourseQuiz && renderQuiz(selectedCourse.quiz)}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevLesson}
              disabled={currentLessonIndex === 0 && (currentPageIndex === -1 || (currentPageIndex === 0 && !hasMainContent))}
              data-testid="button-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              onClick={handleNextLesson}
              disabled={(isLastLesson && isLastPage) || (showLessonQuiz && !quizSubmitted) || (showCourseQuiz && !quizSubmitted)}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {session.staffName}</h1>
              <p className="text-muted-foreground">{session.facilityName}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                setSession(null);
                setAccessCode("");
              }}
              data-testid="button-logout"
            >
              Log Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Your Training Courses</h2>
        
        {session.assignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All Caught Up!</h3>
              <p className="text-muted-foreground">You have no pending training courses at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {session.assignments.map((assignment) => (
              <Card key={assignment.id} className="hover-elevate cursor-pointer" onClick={() => handleStartCourse(assignment)}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {assignment.course.title}
                      </CardTitle>
                      {assignment.course.description && (
                        <CardDescription className="mt-1">{assignment.course.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={assignment.status === "completed" ? "default" : "secondary"}>
                      {assignment.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {assignment.course.lessons.length} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ~{assignment.course.estimatedMinutes} min
                    </span>
                    {assignment.dueDate && (
                      <span className="flex items-center gap-1">
                        Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <Button className="mt-4" data-testid={`button-start-course-${assignment.id}`}>
                    {assignment.status === "completed" ? "Review Course" : "Start Course"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
