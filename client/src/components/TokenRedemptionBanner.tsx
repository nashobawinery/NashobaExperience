import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift, Sparkles } from "lucide-react";
import * as api from "@/lib/api";

interface TokenRedemptionBannerProps {
  sessionId: string;
}

export default function TokenRedemptionBanner({ sessionId }: TokenRedemptionBannerProps) {
  const { toast } = useToast();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [staffName, setStaffName] = useState("");

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ["/api/trivia-attempt", sessionId],
    queryFn: () => api.getTokenRedemption(sessionId),
    enabled: !!sessionId,
    refetchInterval: 30000,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ attemptId, staffName }: { attemptId: string; staffName?: string }) =>
      api.verifyTokenRedemption(attemptId, staffName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia-attempt", sessionId] });
      setShowVerifyDialog(false);
      setStaffName("");
      toast({
        title: "Token Redeemed!",
        description: "Your tasting tokens have been verified and applied.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyClick = () => {
    setShowVerifyDialog(true);
  };

  const handleConfirmVerify = () => {
    if (!tokenData) return;
    verifyMutation.mutate({ attemptId: tokenData.id, staffName: staffName || undefined });
  };

  if (isLoading || !tokenData || !tokenData.achievement) {
    return null;
  }

  const { achievement } = tokenData;
  const tokenCount = parseFloat(achievement.rewardValue);

  return (
    <>
      <div
        className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-6 mb-6 rounded-lg shadow-lg relative overflow-hidden"
        data-testid="banner-trivia-token"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/10 rounded-full -ml-12 -mb-12" />
        
        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 animate-pulse" />
            <h2 className="text-2xl font-serif font-semibold">
              Congratulations! Trivia Reward Earned
            </h2>
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex items-center gap-3 bg-primary-foreground/20 px-6 py-3 rounded-full">
            <Gift className="w-8 h-8" />
            <div className="text-left">
              <div className="text-3xl font-serif font-bold">
                {tokenCount} Tasting Token{tokenCount !== 1 ? 's' : ''}
              </div>
              <Badge 
                variant="outline" 
                className="mt-1 bg-primary-foreground text-primary border-primary-foreground"
              >
                Earned Reward
              </Badge>
            </div>
          </div>

          <p className="text-lg font-medium max-w-lg">
            {achievement.achievementMessage}
          </p>

          <div className="bg-primary-foreground/10 px-6 py-4 rounded-lg max-w-md">
            <p className="text-sm font-medium mb-2">
              🎉 Show this screen to staff to redeem your tokens
            </p>
            <p className="text-xs opacity-90">
              Staff will verify this reward and provide you with tasting tokens to use today
            </p>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-2 border-primary-foreground font-semibold"
            onClick={handleVerifyClick}
            disabled={verifyMutation.isPending}
            data-testid="button-staff-verify"
          >
            {verifyMutation.isPending ? "Verifying..." : "Staff: I have verified this redemption"}
          </Button>
        </div>
      </div>

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent data-testid="dialog-verify-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Verify Token Redemption</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you are a staff member verifying this token redemption. 
              This action will mark the tokens as redeemed and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="staff-name" className="text-sm font-medium">
              Staff Name (Optional)
            </Label>
            <Input
              id="staff-name"
              type="text"
              placeholder="Enter your name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="mt-2"
              data-testid="input-staff-name"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-verify">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVerify}
              disabled={verifyMutation.isPending}
              data-testid="button-confirm-verify"
            >
              {verifyMutation.isPending ? "Verifying..." : "Confirm Verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
