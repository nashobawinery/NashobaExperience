import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, DollarSign, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getTriviaAchievements, createTriviaAchievement, updateTriviaAchievement, deleteTriviaAchievement } from "@/lib/api";
import type { TriviaAchievement } from "@shared/schema";

const achievementFormSchema = z.object({
  scoreThreshold: z.number().int().min(1, "Score threshold must be at least 1").max(10, "Score threshold cannot exceed 10"),
  rewardType: z.enum(["discount", "token"]),
  rewardValue: z.number().min(0.01, "Reward value must be greater than 0"),
  achievementMessage: z.string().min(10, "Achievement message must be at least 10 characters"),
  enabled: z.boolean(),
});

type AchievementFormValues = z.infer<typeof achievementFormSchema>;

export default function TriviaAchievementsManager() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<TriviaAchievement | null>(null);

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['/api/admin/trivia-achievements'],
    queryFn: getTriviaAchievements,
  });

  const sortedAchievements = useMemo(() => {
    return [...achievements].sort((a, b) => a.scoreThreshold - b.scoreThreshold);
  }, [achievements]);

  const form = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementFormSchema),
    defaultValues: {
      scoreThreshold: 5,
      rewardType: "discount",
      rewardValue: 5.0,
      achievementMessage: "",
      enabled: true,
    },
  });

  const rewardType = form.watch("rewardType");

  const createMutation = useMutation({
    mutationFn: createTriviaAchievement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trivia-achievements'] });
      toast({
        title: "Achievement Created",
        description: "The trivia achievement was successfully created",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create achievement",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTriviaAchievement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trivia-achievements'] });
      toast({
        title: "Achievement Updated",
        description: "The trivia achievement was successfully updated",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update achievement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTriviaAchievement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trivia-achievements'] });
      toast({
        title: "Achievement Deleted",
        description: "The trivia achievement was successfully removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete achievement",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (achievement?: TriviaAchievement) => {
    if (achievement) {
      setEditingAchievement(achievement);
      form.reset({
        scoreThreshold: achievement.scoreThreshold,
        rewardType: achievement.rewardType as "discount" | "token",
        rewardValue: parseFloat(achievement.rewardValue),
        achievementMessage: achievement.achievementMessage,
        enabled: achievement.enabled,
      });
    } else {
      setEditingAchievement(null);
      form.reset({
        scoreThreshold: 5,
        rewardType: "discount",
        rewardValue: 5.0,
        achievementMessage: "",
        enabled: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAchievement(null);
    form.reset();
  };

  const handleSubmit = (values: AchievementFormValues) => {
    const data = {
      scoreThreshold: values.scoreThreshold,
      rewardType: values.rewardType,
      rewardValue: values.rewardValue.toString(),
      achievementMessage: values.achievementMessage,
      enabled: values.enabled,
      displayOrder: values.scoreThreshold,
    };

    if (editingAchievement) {
      updateMutation.mutate({ id: editingAchievement.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this achievement? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const getRewardBadge = (achievement: TriviaAchievement) => {
    if (achievement.rewardType === "discount") {
      return (
        <Badge variant="default" className="gap-1" data-testid={`badge-reward-${achievement.id}`}>
          <DollarSign className="w-3 h-3" />
          ${parseFloat(achievement.rewardValue).toFixed(2)} Discount
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1" data-testid={`badge-reward-${achievement.id}`}>
          <Ticket className="w-3 h-3" />
          {parseFloat(achievement.rewardValue)} Token{parseFloat(achievement.rewardValue) !== 1 ? 's' : ''}
        </Badge>
      );
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-medium">Trivia Achievements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage rewards for trivia game performance based on correct answers
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="button-add-achievement">
          <Plus className="w-4 h-4 mr-2" />
          Add Achievement
        </Button>
      </div>

      {sortedAchievements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No achievements configured yet</p>
          <p className="text-sm mt-2">Click "Add Achievement" to create your first one</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score Threshold</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAchievements.map((achievement) => (
                <TableRow key={achievement.id} data-testid={`row-achievement-${achievement.id}`}>
                  <TableCell className="font-medium" data-testid={`text-threshold-${achievement.id}`}>
                    {achievement.scoreThreshold} / 10 correct
                  </TableCell>
                  <TableCell>
                    {getRewardBadge(achievement)}
                  </TableCell>
                  <TableCell className="max-w-md truncate" data-testid={`text-message-${achievement.id}`}>
                    {achievement.achievementMessage}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={achievement.enabled ? "default" : "secondary"}
                      data-testid={`badge-enabled-${achievement.id}`}
                    >
                      {achievement.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(achievement)}
                        data-testid={`button-edit-${achievement.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(achievement.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${achievement.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingAchievement ? "Edit Achievement" : "Create New Achievement"}
            </DialogTitle>
            <DialogDescription>
              Configure a reward for guests who achieve a specific trivia score
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="scoreThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score Threshold (out of 10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-score-threshold"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of correct answers needed to unlock this achievement (1-10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rewardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-reward-type">
                          <SelectValue placeholder="Select reward type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="discount" data-testid="option-discount">
                          Dollar Discount
                        </SelectItem>
                        <SelectItem value="token" data-testid="option-token">
                          Tasting Token
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose between a cart discount or tasting tokens
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rewardValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {rewardType === "discount" ? "Discount Amount ($)" : "Number of Tokens"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.01}
                        step={rewardType === "discount" ? "0.01" : "1"}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-reward-value"
                      />
                    </FormControl>
                    <FormDescription>
                      {rewardType === "discount" 
                        ? "Dollar amount to discount from cart total" 
                        : "Number of complimentary tasting tokens to award"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="achievementMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achievement Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Congratulations! You've earned..."
                        className="min-h-20"
                        {...field}
                        data-testid="textarea-achievement-message"
                      />
                    </FormControl>
                    <FormDescription>
                      Custom message shown to guests when they unlock this achievement
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enabled</FormLabel>
                      <FormDescription>
                        Make this achievement available to guests
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingAchievement ? "Update Achievement" : "Create Achievement"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
