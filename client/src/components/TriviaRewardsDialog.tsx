import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Gift, Star, Sparkles } from "lucide-react";

interface TriviaRewardsDialogProps {
  open: boolean;
  onClose: () => void;
  score: number;
  total: number;
}

export default function TriviaRewardsDialog({
  open,
  onClose,
  score,
  total,
}: TriviaRewardsDialogProps) {
  const percentage = (score / total) * 100;
  const isPerfect = score === 10;
  const isAlmostPerfect = score >= 8 && score <= 9;
  const hasReward = isPerfect || isAlmostPerfect;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="trivia-rewards-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-3xl">
            {hasReward ? (
              <>
                <Trophy className="w-8 h-8 text-primary" />
                Congratulations!
              </>
            ) : (
              <>
                <Star className="w-8 h-8 text-chart-2" />
                Trivia Complete!
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Your trivia results and rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="text-6xl font-bold text-primary">
                {score}
              </div>
              <div className="text-2xl text-muted-foreground">
                / {total}
              </div>
            </div>
            <p className="text-lg text-muted-foreground">
              {percentage}% Correct
            </p>
          </div>

          {isPerfect && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {[...Array(8)].map((_, i) => (
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
              
              <div className="relative bg-primary/10 border-2 border-primary rounded-lg p-6 text-center space-y-3">
                <Trophy className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <p className="text-xl font-bold text-primary mb-1">
                    Perfect Score!
                  </p>
                  <p className="text-2xl font-bold text-foreground mb-2">
                    $5.00 Credit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Applied to your cart for products purchased on this platform
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAlmostPerfect && (
            <div className="bg-chart-2/10 border-2 border-chart-2 rounded-lg p-6 text-center space-y-3">
              <Gift className="w-12 h-12 text-chart-2 mx-auto" />
              <div>
                <p className="text-xl font-bold text-chart-2 mb-1">
                  Almost Perfect!
                </p>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Tasting Chip Earned
                </p>
                <p className="text-sm text-muted-foreground">
                  Enjoy a complimentary tasting on us! Ask staff for your reward.
                </p>
              </div>
            </div>
          )}

          {!hasReward && score >= 5 && (
            <div className="bg-muted/50 border rounded-lg p-6 text-center space-y-2">
              <Star className="w-10 h-10 text-chart-2 mx-auto" />
              <p className="text-lg font-semibold text-foreground">
                Great Effort!
              </p>
              <p className="text-sm text-muted-foreground">
                You scored {score} out of 10. Try again next time for rewards!
              </p>
            </div>
          )}

          {!hasReward && score < 5 && (
            <div className="bg-muted/50 border rounded-lg p-6 text-center space-y-2">
              <Star className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-lg font-semibold text-foreground">
                Thanks for Playing!
              </p>
              <p className="text-sm text-muted-foreground">
                You scored {score} out of 10. Keep exploring and learning about wine!
              </p>
            </div>
          )}

          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {hasReward ? (
                <>Thank you for participating in our wine trivia!</>
              ) : (
                <>Keep exploring our wines to learn more. Rewards are available for scores of 8/10 or higher!</>
              )}
            </p>
          </div>

          <Button 
            onClick={onClose} 
            className="w-full"
            size="lg"
            data-testid="button-close-rewards"
          >
            Continue Tasting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
