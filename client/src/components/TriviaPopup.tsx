import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, CheckCircle2, XCircle, Sparkles } from "lucide-react";

interface TriviaQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
  image?: string;
}

interface TriviaPopupProps {
  question: TriviaQuestion;
  currentScore: number;
  totalAnswered: number;
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
}

export default function TriviaPopup({
  question,
  currentScore,
  totalAnswered,
  onAnswer,
  onClose,
}: TriviaPopupProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswerClick = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
  };

  const handleContinue = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === question.correctIndex;
    onAnswer(isCorrect);
  };

  const isCorrect = selectedAnswer === question.correctIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <Card className="w-full max-w-2xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary">
                Question {totalAnswered + 1}
              </Badge>
              <Badge className="bg-chart-2 text-background">
                Score: {currentScore}/{totalAnswered}
              </Badge>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground">
              Wine Trivia Challenge
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-trivia"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {question.image && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img 
              src={question.image} 
              alt="Trivia question" 
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        <p className="text-lg md:text-xl mb-6 text-foreground">
          {question.question}
        </p>

        <div className="grid gap-3 mb-6">
          {question.answers.map((answer, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === question.correctIndex;
            
            let variant: "default" | "outline" = "outline";
            let className = "";
            
            if (showResult) {
              if (isCorrectAnswer) {
                className = "border-2 border-green-500 bg-green-50 dark:bg-green-950";
              } else if (isSelected && !isCorrectAnswer) {
                className = "border-2 border-destructive bg-destructive/10";
              }
            } else if (isSelected) {
              variant = "default";
            }

            return (
              <Button
                key={index}
                variant={variant}
                size="lg"
                className={`justify-start text-left h-auto py-4 px-6 ${className}`}
                onClick={() => handleAnswerClick(index)}
                disabled={showResult}
                data-testid={`button-answer-${index}`}
              >
                <span className="flex-1">{answer}</span>
                {showResult && isCorrectAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {showResult && isSelected && !isCorrectAnswer && (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </Button>
            );
          })}
        </div>

        {showResult && (
          <>
            <div className={`rounded-lg p-4 mb-4 ${isCorrect ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-destructive/10 border border-destructive/20'}`}>
              <p className="font-medium mb-2 flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-green-900 dark:text-green-100">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="text-destructive">Not quite</span>
                  </>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {question.explanation}
              </p>
            </div>
            <Button 
              onClick={handleContinue}
              className="w-full"
              size="lg"
              data-testid="button-continue-trivia"
            >
              Continue
            </Button>
          </>
        )}
      </Card>
      
      {/* Fireworks Effect for First Question */}
      {showResult && isCorrect && totalAnswered === 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-primary animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
