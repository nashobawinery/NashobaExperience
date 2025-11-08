import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

async function getTriviaInterval(): Promise<number> {
  const response = await fetch("/api/settings/trivia_interval_seconds");
  if (!response.ok) {
    if (response.status === 404) {
      return 240;
    }
    throw new Error("Failed to fetch trivia interval");
  }
  const data = await response.json();
  return data.value;
}

async function updateTriviaInterval(intervalSeconds: number): Promise<void> {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: "trivia_interval_seconds",
      value: intervalSeconds,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to update trivia interval");
  }
}

export default function TriviaIntervalManager() {
  const { toast } = useToast();
  const [editedInterval, setEditedInterval] = useState<number | null>(null);

  const { data: currentInterval, isLoading } = useQuery({
    queryKey: ['/api/settings/trivia_interval_seconds'],
    queryFn: getTriviaInterval,
  });

  const updateMutation = useMutation({
    mutationFn: updateTriviaInterval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/trivia_interval_seconds'] });
      setEditedInterval(null);
      toast({
        title: "Success",
        description: "Trivia interval updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trivia interval",
        variant: "destructive",
      });
    },
  });

  const displayInterval = editedInterval !== null ? editedInterval : currentInterval;

  const handleChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(30, Math.min(600, numValue));
      setEditedInterval(clampedValue);
    } else if (value === "") {
      setEditedInterval(null);
    }
  };

  const handleSave = () => {
    if (editedInterval !== null) {
      updateMutation.mutate(editedInterval);
    }
  };

  const handleReset = () => {
    setEditedInterval(null);
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

  const hasChanges = editedInterval !== null && editedInterval !== currentInterval;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-medium">Trivia Question Interval</h2>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={updateMutation.isPending}
                data-testid="button-reset-interval"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                data-testid="button-save-interval"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="max-w-md">
            <Label htmlFor="trivia-interval" className="text-base">
              Interval (seconds)
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              How often should new trivia questions appear for guests (30-600 seconds)
            </p>
            <Input
              id="trivia-interval"
              type="number"
              min={30}
              max={600}
              value={displayInterval ?? 240}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full"
              data-testid="input-trivia-interval"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Current: {displayInterval ? `${displayInterval} seconds (${(displayInterval / 60).toFixed(1)} minutes)` : "240 seconds (4 minutes)"}
            </p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">How It Works</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>The first trivia question appears 1 minute after guests dismiss the trivia info popup</li>
              <li>Subsequent questions appear at the interval you set here</li>
              <li>Questions automatically stop after guests answer 10 questions</li>
              <li>Minimum: 30 seconds (0.5 minutes)</li>
              <li>Maximum: 600 seconds (10 minutes)</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
