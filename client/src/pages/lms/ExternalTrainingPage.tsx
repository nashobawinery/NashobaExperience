import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "wouter";
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
  Trophy,
  XCircle,
  FileText,
  Play,
  Pause,
  Square,
  Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

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
  sortOrder: number;
  contentBlocks: ContentBlock[];
  pages?: LessonPage[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
}

interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  lessonId?: string | null;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

interface LessonQuiz {
  quiz: Quiz;
  questions: QuizQuestion[];
}

interface LessonQuizResult {
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  passingScore: number;
  attemptsRemaining: number;
  message: string;
}

interface ExternalTrainingToken {
  id: string;
  staffId: string;
  courseId: string;
  quizId?: string | null;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  attemptsRemaining: number;
  status: string;
}

interface ExternalTrainingData {
  token: ExternalTrainingToken;
  course: Course;
  lessons: Lesson[];
  quiz: Quiz | null;
  quizQuestions: QuizQuestion[] | null;
  lessonQuizzes?: Record<string, LessonQuiz>;
  lessonQuizProgress?: Record<string, { passed: boolean; score: number }>;
}

interface QuizResult {
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  passingScore: number;
  attemptsRemaining: number;
  message: string;
}

export default function ExternalTrainingPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [startTime] = useState(Date.now());
  
  const [showLessonQuiz, setShowLessonQuiz] = useState(false);
  const [lessonQuizAnswers, setLessonQuizAnswers] = useState<Record<string, string>>({});
  const [lessonQuizResult, setLessonQuizResult] = useState<LessonQuizResult | null>(null);
  const [lessonQuizPassedMap, setLessonQuizPassedMap] = useState<Record<string, boolean>>({});
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const { data, isLoading, error, refetch } = useQuery<ExternalTrainingData>({
    queryKey: ["/api/external-training", token],
    queryFn: async () => {
      const response = await fetch(`/api/external-training/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load training");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setSpeechSupported(supported);
  }, []);

  useEffect(() => {
    return () => {
      if (speechSupported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechSupported]);

  const stopSpeech = useCallback(() => {
    if (speechSupported && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }, [speechSupported]);

  useEffect(() => {
    stopSpeech();
    setCurrentPageIndex(-1);
  }, [currentLessonIndex, stopSpeech]);

  useEffect(() => {
    stopSpeech();
  }, [currentPageIndex, stopSpeech]);

  const extractTextFromHtml = useCallback((html: string | null | undefined): string => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }, []);

  const getLessonText = useCallback((lesson: Lesson | undefined): string => {
    if (!lesson) return '';
    
    if (currentPageIndex >= 0 && lesson.pages && lesson.pages[currentPageIndex]) {
      const page = lesson.pages[currentPageIndex];
      const textBlocks = page.contentBlocks
        .filter(block => block.blockType === 'text' || block.blockType === 'text_image')
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(block => extractTextFromHtml(block.content || undefined))
        .join('\n\n');
      
      return `${page.title}. ${textBlocks}`;
    }
    
    if (!lesson.contentBlocks) return lesson.title;
    
    const textBlocks = lesson.contentBlocks
      .filter(block => block.blockType === 'text' || block.blockType === 'text_image')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(block => extractTextFromHtml(block.content || undefined))
      .join('\n\n');
    
    return `${lesson.title}. ${textBlocks}`;
  }, [extractTextFromHtml, currentPageIndex]);

  const startSpeech = useCallback(() => {
    if (!speechSupported) return;

    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    const lessons = data?.lessons || [];
    const currentLesson = lessons[currentLessonIndex];
    const text = getLessonText(currentLesson);
    
    if (!text.trim()) {
      toast({ title: "No text content", description: "This lesson has no text to read aloud." });
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  }, [speechSupported, isPaused, data, currentLessonIndex, getLessonText, speechRate, toast]);

  const pauseSpeech = useCallback(() => {
    if (speechSupported && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [speechSupported]);

  useEffect(() => {
    if (isSpeaking && utteranceRef.current) {
      const wasPlaying = window.speechSynthesis.speaking;
      if (wasPlaying) {
        stopSpeech();
        setTimeout(() => startSpeech(), 100);
      }
    }
  }, [speechRate]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      const response = await fetch(`/api/external-training/${token}/submit-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: quizAnswers, timeSpentMinutes }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit quiz");
      }
      return response.json();
    },
    onSuccess: (result: QuizResult) => {
      setQuizResult(result);
      if (result.passed) {
        toast({ title: "Congratulations!", description: "You passed the quiz!" });
      } else {
        toast({ 
          title: "Quiz not passed", 
          description: `You scored ${result.score}%. You need ${result.passingScore}% to pass.`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit quiz", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const completeTrainingMutation = useMutation({
    mutationFn: async () => {
      const timeSpentMinutes = Math.round((Date.now() - startTime) / 60000);
      const response = await fetch(`/api/external-training/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeSpentMinutes }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete training");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Training completed!", description: "Your training has been marked as complete." });
      refetch();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to complete training", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizResult(null);
    refetch();
  };

  const submitLessonQuizMutation = useMutation({
    mutationFn: async ({ lessonId, answers }: { lessonId: string; answers: Record<string, string> }) => {
      const response = await fetch(`/api/external-training/${token}/lessons/${lessonId}/submit-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit lesson quiz");
      }
      return response.json();
    },
    onSuccess: (result: LessonQuizResult & { lessonId: string }) => {
      setLessonQuizResult(result);
      if (result.passed) {
        setLessonQuizPassedMap(prev => ({ ...prev, [result.lessonId]: true }));
        toast({ title: "Quiz Passed!", description: `You scored ${result.score}%. You can proceed to the next lesson.` });
      } else {
        toast({ 
          title: "Quiz not passed", 
          description: `You scored ${result.score}%. You need ${result.passingScore}% to pass and proceed.`,
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to submit lesson quiz", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleRetryLessonQuiz = () => {
    setLessonQuizAnswers({});
    setLessonQuizResult(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading training materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Training</h2>
            <p className="text-muted-foreground">{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { course, lessons, quiz, quizQuestions } = data;
  const currentLesson = lessons[currentLessonIndex];
  
  const lessonPages = [...(currentLesson?.pages || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentPage = currentPageIndex >= 0 && lessonPages[currentPageIndex] ? lessonPages[currentPageIndex] : null;
  
  const contentBlocks = currentPage 
    ? [...(currentPage.contentBlocks || [])].sort((a, b) => a.sortOrder - b.sortOrder)
    : [...(currentLesson?.contentBlocks || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  
  const isLastLesson = currentLessonIndex === lessons.length - 1;
  const isLastPage = lessonPages.length === 0 || currentPageIndex >= lessonPages.length - 1;
  const hasPages = lessonPages.length > 0;
  const hasQuiz = !!quiz && quizQuestions && quizQuestions.length > 0;
  
  const lessonQuizzes = data.lessonQuizzes || {};
  const currentLessonQuiz = currentLesson ? lessonQuizzes[currentLesson.id] : null;
  const hasLessonQuiz = !!currentLessonQuiz && currentLessonQuiz.questions?.length > 0;
  
  const lessonQuizProgress = data.lessonQuizProgress || {};
  const isLessonQuizPassed = currentLesson 
    ? lessonQuizPassedMap[currentLesson.id] || lessonQuizProgress[currentLesson.id]?.passed 
    : false;
  
  const canProceedToNextLesson = !hasLessonQuiz || isLessonQuizPassed;
  
  const allLessonQuizzesPassed = lessons.every((lesson) => {
    const lessonHasQuiz = !!lessonQuizzes[lesson.id];
    if (!lessonHasQuiz) return true;
    return lessonQuizPassedMap[lesson.id] || lessonQuizProgress[lesson.id]?.passed;
  });

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.blockType) {
      case "text":
        return (
          <div 
            key={block.id} 
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: block.content || '' }}
          />
        );
      case "image":
        return (
          <div key={block.id} className="my-4">
            <img 
              src={block.imageUrl || block.content || ''} 
              alt={block.caption || "Training image"} 
              className="max-w-full rounded-lg mx-auto"
            />
            {block.caption && (
              <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
            )}
          </div>
        );
      case "text_image":
        const isHorizontal = block.layout === 'text_left_image_right' || block.layout === 'image_left_text_right';
        const isImageFirst = block.layout === 'image_left_text_right' || block.layout === 'image_top_text_bottom';
        
        const getTextWidth = () => {
          switch (block.imageSize) {
            case 'small': return 'md:w-3/4';
            case 'medium': return 'md:w-3/5';
            case 'large': return 'md:w-1/2';
            default: return 'w-full';
          }
        };
        
        const getImageWidth = () => {
          switch (block.imageSize) {
            case 'small': return 'md:w-1/4';
            case 'medium': return 'md:w-2/5';
            case 'large': return 'md:w-1/2';
            default: return 'w-full';
          }
        };

        const textElement = (
          <div 
            className={`prose prose-sm dark:prose-invert max-w-none ${isHorizontal ? getTextWidth() : ''}`}
            dangerouslySetInnerHTML={{ __html: block.content || '' }}
          />
        );

        const imageElement = block.imageUrl ? (
          <div className={isHorizontal ? getImageWidth() : ''}>
            <img 
              src={block.imageUrl} 
              alt={block.caption || "Training image"} 
              className="w-full h-auto rounded-lg object-contain"
            />
          </div>
        ) : null;

        return (
          <div key={block.id} className="my-4">
            <div className={`
              ${isHorizontal ? 'flex flex-col md:flex-row gap-4' : 'flex flex-col gap-4'}
              ${block.layout === 'image_left_text_right' ? 'md:flex-row-reverse' : ''}
            `}>
              {isImageFirst ? (
                <>{imageElement}{textElement}</>
              ) : (
                <>{textElement}{imageElement}</>
              )}
            </div>
            {block.caption && (
              <p className="text-sm text-muted-foreground text-center mt-2">{block.caption}</p>
            )}
          </div>
        );
      case "video":
        const videoSource = block.videoUrl || block.content || '';
        const videoId = videoSource.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        const vimeoId = videoSource.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
        return (
          <div key={block.id} className="my-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {videoId ? (
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

  if (quizResult?.passed || data.token.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Training Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Congratulations, {data.token.recipientName}! You have successfully completed the training.
            </p>
            {quizResult && (
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-lg font-semibold">Quiz Score: {quizResult.score}%</p>
                <p className="text-sm text-muted-foreground">
                  {quizResult.correctAnswers} of {quizResult.totalQuestions} correct
                </p>
              </div>
            )}
            <Badge variant="default" className="text-lg px-4 py-2">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Certified
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showLessonQuiz && hasLessonQuiz && currentLessonQuiz) {
    const lessonQuizQuestions = currentLessonQuiz.questions || [];
    const allLessonQuestionsAnswered = lessonQuizQuestions.every((q: QuizQuestion) => lessonQuizAnswers[q.id]);
    
    if (lessonQuizResult && !lessonQuizResult.passed) {
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Lesson Quiz Not Passed</h2>
                <p className="text-muted-foreground mb-6">
                  You scored {lessonQuizResult.score}%. A score of {currentLessonQuiz.quiz.passingScore || 70}% is required to proceed to the next lesson.
                </p>
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-lg">
                    {lessonQuizResult.correctAnswers} of {lessonQuizResult.totalQuestions} answers correct
                  </p>
                  {lessonQuizResult.attemptsRemaining > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      You have {lessonQuizResult.attemptsRemaining} attempt(s) remaining
                    </p>
                  )}
                </div>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => { setShowLessonQuiz(false); setLessonQuizResult(null); }}>
                    Review Lesson
                  </Button>
                  {lessonQuizResult.attemptsRemaining > 0 && (
                    <Button onClick={handleRetryLessonQuiz}>
                      Retry Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    if (lessonQuizResult?.passed) {
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Lesson Quiz Passed!</h2>
                <p className="text-muted-foreground mb-6">
                  You scored {lessonQuizResult.score}%. You can now proceed to the next lesson.
                </p>
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-lg">
                    {lessonQuizResult.correctAnswers} of {lessonQuizResult.totalQuestions} answers correct
                  </p>
                </div>
                <Button onClick={() => {
                  setShowLessonQuiz(false);
                  setLessonQuizResult(null);
                  setLessonQuizAnswers({});
                  if (!isLastLesson) {
                    setCurrentLessonIndex(prev => prev + 1);
                    setCurrentPageIndex(-1);
                  }
                }}>
                  {isLastLesson ? 'Back to Course' : 'Continue to Next Lesson'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle data-testid="text-lesson-quiz-title">Lesson Quiz: {currentLesson?.title}</CardTitle>
              </div>
              <CardDescription>
                Answer all questions below. You need {currentLessonQuiz.quiz.passingScore || 70}% to pass and proceed to the next lesson.
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {lessonQuizQuestions.map((question: QuizQuestion, index: number) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Question {index + 1} of {lessonQuizQuestions.length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 font-medium" data-testid={`text-lesson-question-${index}`}>{question.text}</p>
                  <RadioGroup
                    value={lessonQuizAnswers[question.id] || ""}
                    onValueChange={(value) => setLessonQuizAnswers(prev => ({ ...prev, [question.id]: value }))}
                  >
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2 p-3 rounded-lg hover-elevate">
                        <RadioGroupItem 
                          value={option} 
                          id={`lq${question.id}-opt${optIndex}`}
                          data-testid={`radio-lesson-question-${index}-option-${optIndex}`}
                        />
                        <Label 
                          htmlFor={`lq${question.id}-opt${optIndex}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setShowLessonQuiz(false)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Lesson
            </Button>
            <Button 
              onClick={() => submitLessonQuizMutation.mutate({ 
                lessonId: currentLesson.id, 
                answers: lessonQuizAnswers 
              })}
              disabled={!allLessonQuestionsAnswered || submitLessonQuizMutation.isPending}
              data-testid="button-submit-lesson-quiz"
            >
              {submitLessonQuizMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Quiz"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showQuiz && hasQuiz) {
    if (quizResult && !quizResult.passed) {
      const canRetry = data.token.attemptsRemaining > 1;
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Quiz Not Passed</h2>
                <p className="text-muted-foreground mb-6">
                  You scored {quizResult.score}%. A score of {quizResult.passingScore}% is required to pass.
                </p>
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-lg">
                    {quizResult.correctAnswers} of {quizResult.totalQuestions} answers correct
                  </p>
                  {canRetry && (
                    <p className="text-sm text-muted-foreground mt-2">
                      You have {quizResult.attemptsRemaining} attempt(s) remaining
                    </p>
                  )}
                </div>
                {canRetry ? (
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" onClick={() => { setShowQuiz(false); setQuizResult(null); }}>
                      Review Lessons
                    </Button>
                    <Button onClick={handleRetryQuiz}>
                      Retry Quiz
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-destructive mb-4">No attempts remaining. Please contact your administrator.</p>
                    <Button variant="outline" onClick={() => { setShowQuiz(false); setQuizResult(null); }}>
                      Review Lessons
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    const allQuestionsAnswered = quizQuestions?.every(q => quizAnswers[q.id]);
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <CardTitle data-testid="text-quiz-title">{quiz.title}</CardTitle>
              </div>
              <CardDescription>
                Answer all questions below. You need {quiz.passingScore}% to pass.
              </CardDescription>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Attempts remaining: {data.token.attemptsRemaining}
                </span>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {quizQuestions?.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Question {index + 1} of {quizQuestions.length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 font-medium" data-testid={`text-question-${index}`}>{question.text}</p>
                  <RadioGroup
                    value={quizAnswers[question.id] || ""}
                    onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [question.id]: value }))}
                  >
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center space-x-2 p-3 rounded-lg hover-elevate">
                        <RadioGroupItem 
                          value={option} 
                          id={`q${question.id}-opt${optIndex}`}
                          data-testid={`radio-question-${index}-option-${optIndex}`}
                        />
                        <Label 
                          htmlFor={`q${question.id}-opt${optIndex}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setShowQuiz(false)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Lessons
            </Button>
            <Button 
              onClick={() => submitQuizMutation.mutate()}
              disabled={!allQuestionsAnswered || submitQuizMutation.isPending}
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold" data-testid="text-course-title">{course.title}</h1>
            </div>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              Expires: {format(new Date(data.token.expiresAt), "MMM d, yyyy")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Welcome, {data.token.recipientName}</p>
          <div className="flex items-center gap-4">
            <Progress value={((currentLessonIndex + 1) / lessons.length) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Lesson {currentLessonIndex + 1} of {lessons.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 shrink-0">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Lessons</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1 p-2">
                  {lessons.map((lesson, index) => {
                    const lessonHasQuiz = !!lessonQuizzes[lesson.id];
                    const lessonQuizIsPassed = lessonQuizPassedMap[lesson.id] || lessonQuizProgress[lesson.id]?.passed;
                    const lessonIsComplete = lessonHasQuiz ? lessonQuizIsPassed : index < currentLessonIndex;
                    
                    const canNavigateToLesson = (() => {
                      if (index <= currentLessonIndex) return true;
                      for (let i = 0; i < index; i++) {
                        const prevLesson = lessons[i];
                        const prevHasQuiz = !!lessonQuizzes[prevLesson.id];
                        const prevQuizPassed = lessonQuizPassedMap[prevLesson.id] || lessonQuizProgress[prevLesson.id]?.passed;
                        if (prevHasQuiz && !prevQuizPassed) return false;
                      }
                      return true;
                    })();
                    
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          if (canNavigateToLesson) {
                            setCurrentLessonIndex(index);
                            setCurrentPageIndex(-1);
                            setLessonQuizAnswers({});
                            setLessonQuizResult(null);
                          }
                        }}
                        disabled={!canNavigateToLesson}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                          index === currentLessonIndex 
                            ? "bg-primary text-primary-foreground" 
                            : canNavigateToLesson ? "hover-elevate" : "opacity-50 cursor-not-allowed"
                        }`}
                        data-testid={`button-lesson-nav-${index}`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          lessonIsComplete 
                            ? "bg-green-500 text-white" 
                            : index === currentLessonIndex
                              ? "bg-primary-foreground text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {lessonIsComplete ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                        </span>
                        <span className="flex-1 truncate">{lesson.title}</span>
                        {lessonHasQuiz && (
                          <span className="ml-1">
                            {lessonQuizIsPassed ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <FileText className="h-3 w-3 opacity-60" />
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {hasQuiz && (
                    <>
                      <Separator className="my-2" />
                      <button
                        onClick={() => setShowQuiz(true)}
                        disabled={currentLessonIndex < lessons.length - 1}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                          currentLessonIndex === lessons.length - 1 ? "hover-elevate" : "opacity-50 cursor-not-allowed"
                        }`}
                        data-testid="button-take-quiz-nav"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Take Quiz</span>
                      </button>
                    </>
                  )}
                </nav>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle data-testid="text-lesson-title">
                        {currentLesson?.title}
                        {currentPage && (
                          <span className="text-muted-foreground font-normal ml-2">
                            / Page {currentPage.pageNumber}: {currentPage.title}
                          </span>
                        )}
                      </CardTitle>
                      {currentPage?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{currentPage.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {speechSupported && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        {!isSpeaking && !isPaused ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={startSpeech}
                            data-testid="button-tts-play"
                          >
                            <Volume2 className="h-4 w-4 mr-1" />
                            Listen
                          </Button>
                        ) : (
                          <>
                            {isSpeaking ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={pauseSpeech}
                                aria-label="Pause reading"
                                title="Pause reading"
                                data-testid="button-tts-pause"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={startSpeech}
                                aria-label="Resume reading"
                                title="Resume reading"
                                data-testid="button-tts-resume"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={stopSpeech}
                              aria-label="Stop reading"
                              title="Stop reading"
                              data-testid="button-tts-stop"
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {(isSpeaking || isPaused) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="whitespace-nowrap">Speed:</span>
                          <Slider
                            value={[speechRate]}
                            onValueChange={([value]) => setSpeechRate(value)}
                            min={0.5}
                            max={2}
                            step={0.25}
                            className="w-20"
                            data-testid="slider-tts-speed"
                          />
                          <span className="w-8">{speechRate}x</span>
                        </div>
                      )}
                      
                      {isSpeaking && (
                        <Badge variant="secondary" className="animate-pulse">
                          <Volume2 className="h-3 w-3 mr-1" />
                          Reading...
                        </Badge>
                      )}
                      {isPaused && (
                        <Badge variant="outline">
                          Paused
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {hasPages && (
                <div className="px-6 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Lesson Pages:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={currentPageIndex === -1 ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setCurrentPageIndex(-1)}
                      data-testid="button-page-main"
                    >
                      Main
                    </Button>
                    {lessonPages.map((page: LessonPage, index: number) => (
                      <Button 
                        key={page.id}
                        variant={currentPageIndex === index ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setCurrentPageIndex(index)}
                        data-testid={`button-page-${page.id}`}
                      >
                        {page.pageNumber}. {page.title}
                        {page.estimatedMinutes > 0 && (
                          <span className="ml-1 text-xs opacity-70">
                            ({page.estimatedMinutes}m)
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Progress 
                      value={((currentPageIndex + 2) / (lessonPages.length + 1)) * 100} 
                      className="flex-1 h-1" 
                    />
                    <span className="text-xs text-muted-foreground">
                      {currentPageIndex === -1 ? 'Main' : `Page ${currentPageIndex + 1}`} of {lessonPages.length + 1}
                    </span>
                  </div>
                </div>
              )}
              
              <CardContent className="pt-6">
                {contentBlocks && contentBlocks.length > 0 ? (
                  <div className="space-y-4">
                    {contentBlocks.map(block => renderContentBlock(block))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>This lesson doesn't have any content yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  if (hasPages && currentPageIndex >= 0) {
                    setCurrentPageIndex(prev => prev - 1);
                  } else if (hasPages && currentPageIndex === -1 && currentLessonIndex > 0) {
                    const prevLesson = lessons[currentLessonIndex - 1];
                    const prevPages = prevLesson?.pages || [];
                    setCurrentLessonIndex(prev => prev - 1);
                    setCurrentPageIndex(prevPages.length > 0 ? prevPages.length - 1 : -1);
                  } else {
                    setCurrentLessonIndex(prev => prev - 1);
                  }
                }}
                disabled={currentLessonIndex === 0 && currentPageIndex === -1}
                data-testid="button-previous-lesson"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous {hasPages && currentPageIndex >= 0 ? 'Page' : 'Lesson'}
              </Button>
              
              {isLastLesson && isLastPage ? (
                hasLessonQuiz && !isLessonQuizPassed ? (
                  <Button onClick={() => setShowLessonQuiz(true)} data-testid="button-take-lesson-quiz">
                    <FileText className="h-4 w-4 mr-2" />
                    Take Lesson Quiz
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : !allLessonQuizzesPassed ? (
                  <Button disabled variant="outline" data-testid="button-incomplete-quizzes">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Complete All Lesson Quizzes
                  </Button>
                ) : hasQuiz ? (
                  <Button onClick={() => setShowQuiz(true)} data-testid="button-take-quiz">
                    Take Course Quiz
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => completeTrainingMutation.mutate()}
                    disabled={completeTrainingMutation.isPending}
                    data-testid="button-complete-training"
                  >
                    {completeTrainingMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete Training
                      </>
                    )}
                  </Button>
                )
              ) : isLastPage && hasLessonQuiz && !isLessonQuizPassed ? (
                <Button onClick={() => setShowLessonQuiz(true)} data-testid="button-take-lesson-quiz">
                  <FileText className="h-4 w-4 mr-2" />
                  Take Lesson Quiz
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : hasPages && currentPageIndex === -1 ? (
                <Button 
                  onClick={() => setCurrentPageIndex(0)}
                  data-testid="button-next-page"
                >
                  Next Page
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : hasPages && currentPageIndex < lessonPages.length - 1 ? (
                <Button 
                  onClick={() => setCurrentPageIndex(prev => prev + 1)}
                  data-testid="button-next-page"
                >
                  Next Page
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={() => {
                    setCurrentLessonIndex(prev => prev + 1);
                    setCurrentPageIndex(-1);
                    setLessonQuizAnswers({});
                    setLessonQuizResult(null);
                  }}
                  data-testid="button-next-lesson"
                >
                  Next Lesson
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
