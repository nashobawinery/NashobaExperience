import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getDiscountTiers, updateDiscountTiers, type DiscountTiers } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Save } from "lucide-react";

export default function DiscountTiersManager() {
  const { toast } = useToast();
  const [editedTiers, setEditedTiers] = useState<DiscountTiers | null>(null);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['/api/settings/discount_tiers'],
    queryFn: getDiscountTiers,
  });

  const updateMutation = useMutation({
    mutationFn: updateDiscountTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/discount_tiers'] });
      setEditedTiers(null);
      toast({
        title: "Success",
        description: "Retail discount tiers updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update discount tiers",
        variant: "destructive",
      });
    },
  });

  const currentTiers = editedTiers || tiers;

  const handleTierChange = (tierKey: keyof DiscountTiers, field: 'min' | 'max' | 'discount', value: string) => {
    if (!currentTiers) return;
    
    const numValue = field === 'discount' ? parseFloat(value) / 100 : parseInt(value);
    
    setEditedTiers({
      ...currentTiers,
      [tierKey]: {
        ...currentTiers[tierKey],
        [field]: isNaN(numValue) ? 0 : numValue,
      },
    });
  };

  const handleSave = () => {
    if (editedTiers) {
      updateMutation.mutate(editedTiers);
    }
  };

  const handleReset = () => {
    setEditedTiers(null);
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

  if (!currentTiers) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No discount tiers configured</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl font-medium">Retail Discount Tiers</h2>
        {editedTiers && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={updateMutation.isPending}
              data-testid="button-reset-tiers"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              data-testid="button-save-tiers"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {(['tier1', 'tier2', 'tier3', 'tier4'] as const).map((tierKey, index) => (
          <div key={tierKey} className="p-4 bg-muted rounded-lg">
            <div className="mb-3">
              <h3 className="font-medium">Tier {index + 1}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${tierKey}-min`}>Min Bottles</Label>
                <Input
                  id={`${tierKey}-min`}
                  type="number"
                  min="0"
                  value={currentTiers[tierKey].min}
                  onChange={(e) => handleTierChange(tierKey, 'min', e.target.value)}
                  data-testid={`input-${tierKey}-min`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${tierKey}-max`}>Max Bottles</Label>
                <Input
                  id={`${tierKey}-max`}
                  type="number"
                  min="0"
                  value={currentTiers[tierKey].max}
                  onChange={(e) => handleTierChange(tierKey, 'max', e.target.value)}
                  data-testid={`input-${tierKey}-max`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${tierKey}-discount`}>Discount %</Label>
                <Input
                  id={`${tierKey}-discount`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={(currentTiers[tierKey].discount * 100).toFixed(2)}
                  onChange={(e) => handleTierChange(tierKey, 'discount', e.target.value)}
                  data-testid={`input-${tierKey}-discount`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Discount tiers apply to Wine and Spirits categories only. 
          The system automatically selects the highest applicable discount based on total bottle count.
        </p>
      </div>
    </Card>
  );
}
