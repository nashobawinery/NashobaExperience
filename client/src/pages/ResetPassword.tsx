import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const { data: tokenData, isLoading: verifying } = useQuery({
    queryKey: ['/api/auth/verify-reset-token', token],
    queryFn: async () => {
      if (!token) return { valid: false };
      const res = await fetch(`/api/auth/verify-reset-token?token=${token}`);
      return res.json();
    },
    enabled: !!token,
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      return apiRequest('POST', '/api/auth/reset-password', data);
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully", description: "You can now log in with your new password." });
      setTimeout(() => setLocation("/login"), 2000);
    },
    onError: (error: any) => {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords are the same", variant: "destructive" });
      return;
    }
    
    resetMutation.mutate({ token, password: newPassword });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>No reset token was provided. Please request a new password reset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => setLocation("/login")}
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenData?.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => setLocation("/login")}
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
            <CardTitle>Password Reset Successfully</CardTitle>
            <CardDescription>
              Your password has been updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <KeyRound className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Hello {tokenData.firstName}, enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                data-testid="input-reset-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                data-testid="input-reset-confirm-password"
              />
            </div>
            
            {newPassword && newPassword.length < 8 && (
              <p className="text-sm text-destructive">Password must be at least 8 characters</p>
            )}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={resetMutation.isPending || newPassword.length < 8 || newPassword !== confirmPassword}
              data-testid="button-reset-password"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
