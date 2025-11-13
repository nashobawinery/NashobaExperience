import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getDiscountTiers, updateDiscountTiers, getCannedDiscountTiers, updateCannedDiscountTiers, type DiscountTiers } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Save, Wine, Beer } from "lucide-react";

export default function DiscountTiersManager() {
  const { toast } = useToast();
  const [editedBottleTiers, setEditedBottleTiers] = useState<DiscountTiers | null>(null);
  const [editedCannedTiers, setEditedCannedTiers] = useState<DiscountTiers | null>(null);

  const { data: bottleTiers, isLoading: bottleLoading } = useQuery({
    queryKey: ['/api/settings/discount_tiers'],
    queryFn: getDiscountTiers,
  });

  const { data: cannedTiers, isLoading: cannedLoading } = useQuery({
    queryKey: ['/api/settings/canned_discount_tiers'],
    queryFn: getCannedDiscountTiers,
  });

  const updateBottleMutation = useMutation({
    mutationFn: updateDiscountTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/discount_tiers'] });
      setEditedBottleTiers(null);
      toast({
        title: "Success",
        description: "Wine & spirits discount tiers updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wine & spirits discount tiers",
        variant: "destructive",
      });
    },
  });

  const updateCannedMutation = useMutation({
    mutationFn: updateCannedDiscountTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/canned_discount_tiers'] });
      setEditedCannedTiers(null);
      toast({
        title: "Success",
        description: "Canned products discount tiers updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update canned products discount tiers",
        variant: "destructive",
      });
    },
  });

  const currentBottleTiers = editedBottleTiers || bottleTiers;
  const currentCannedTiers = editedCannedTiers || cannedTiers;

  const handleBottleTierChange = (tierKey: keyof DiscountTiers, field: 'min' | 'max' | 'discount', value: string) => {
    if (!currentBottleTiers) return;
    
    const numValue = field === 'discount' ? parseFloat(value) / 100 : parseInt(value);
    
    setEditedBottleTiers({
      ...currentBottleTiers,
      [tierKey]: {
        ...currentBottleTiers[tierKey],
        [field]: isNaN(numValue) ? 0 : numValue,
      },
    });
  };

  const handleCannedTierChange = (tierKey: keyof DiscountTiers, field: 'min' | 'max' | 'discount', value: string) => {
    if (!currentCannedTiers) return;
    
    const numValue = field === 'discount' ? parseFloat(value) / 100 : parseInt(value);
    
    setEditedCannedTiers({
      ...currentCannedTiers,
      [tierKey]: {
        ...currentCannedTiers[tierKey],
        [field]: isNaN(numValue) ? 0 : numValue,
      },
    });
  };

  const handleBottleSave = () => {
    if (editedBottleTiers) {
      updateBottleMutation.mutate(editedBottleTiers);
    }
  };

  const handleCannedSave = () => {
    if (editedCannedTiers) {
      updateCannedMutation.mutate(editedCannedTiers);
    }
  };

  const handleBottleReset = () => {
    setEditedBottleTiers(null);
  };

  const handleCannedReset = () => {
    setEditedCannedTiers(null);
  };

  const isLoading = bottleLoading || cannedLoading;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!currentBottleTiers || !currentCannedTiers) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No discount tiers configured</p>
      </Card>
    );
  }

  const renderTierSection = (
    title: string,
    icon: React.ReactNode,
    tiers: DiscountTiers,
    onTierChange: (tierKey: keyof DiscountTiers, field: 'min' | 'max' | 'discount', value: string) => void,
    hasEdits: boolean,
    onSave: () => void,
    onReset: () => void,
    isSaving: boolean,
    testIdPrefix: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium text-lg">{title}</h3>
        </div>
        {hasEdits && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isSaving}
              data-testid={`button-reset-${testIdPrefix}`}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving}
              data-testid={`button-save-${testIdPrefix}`}
            >
              {isSaving ? (
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

      <div className="space-y-3">
        {(['tier1', 'tier2', 'tier3', 'tier4'] as const).map((tierKey, index) => (
          <div key={tierKey} className="p-4 bg-muted rounded-lg">
            <div className="mb-3">
              <h4 className="font-medium text-sm">Tier {index + 1}</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-${tierKey}-min`}>Min Items</Label>
                <Input
                  id={`${testIdPrefix}-${tierKey}-min`}
                  type="number"
                  min="0"
                  value={tiers[tierKey].min}
                  onChange={(e) => onTierChange(tierKey, 'min', e.target.value)}
                  data-testid={`input-${testIdPrefix}-${tierKey}-min`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-${tierKey}-max`}>Max Items</Label>
                <Input
                  id={`${testIdPrefix}-${tierKey}-max`}
                  type="number"
                  min="0"
                  value={tiers[tierKey].max}
                  onChange={(e) => onTierChange(tierKey, 'max', e.target.value)}
                  data-testid={`input-${testIdPrefix}-${tierKey}-max`}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-${tierKey}-discount`}>Discount %</Label>
                <Input
                  id={`${testIdPrefix}-${tierKey}-discount`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={(tiers[tierKey].discount * 100).toFixed(2)}
                  onChange={(e) => onTierChange(tierKey, 'discount', e.target.value)}
                  data-testid={`input-${testIdPrefix}-${tierKey}-discount`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="font-serif text-xl font-medium">Retail Discount Tiers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure volume-based discounts for bottles and canned products separately
        </p>
      </div>

      {renderTierSection(
        "Wine & Spirits (Bottles)",
        <Wine className="w-5 h-5 text-primary" />,
        currentBottleTiers,
        handleBottleTierChange,
        editedBottleTiers !== null,
        handleBottleSave,
        handleBottleReset,
        updateBottleMutation.isPending,
        "bottle"
      )}

      <Separator className="my-6" />

      {renderTierSection(
        "Beer & Canned Products",
        <Beer className="w-5 h-5 text-primary" />,
        currentCannedTiers,
        handleCannedTierChange,
        editedCannedTiers !== null,
        handleCannedSave,
        handleCannedReset,
        updateCannedMutation.isPending,
        "canned"
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Discounts apply separately to each category. 
          The system automatically selects the highest applicable discount based on the item count in each category.
        </p>
      </div>
    </Card>
  );
}
