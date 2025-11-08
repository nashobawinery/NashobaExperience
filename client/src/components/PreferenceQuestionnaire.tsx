import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Sparkles, Wine, Beer, Martini } from "lucide-react";
import { useState } from "react";

interface PreferenceQuestionnaireProps {
  onSubmit: (preferences: {
    beverageTypes: string[];
    flavorPreferences: string[];
    occasion?: string;
  }) => void;
  isLoading?: boolean;
}

const beverageOptions = [
  { value: "wine", label: "Wine", icon: Wine },
  { value: "beer", label: "Beer", icon: Beer },
  { value: "spirits", label: "Spirits", icon: Martini },
  { value: "canned_cocktail", label: "Canned Cocktails", icon: Martini },
  { value: "ciders", label: "Ciders", icon: Beer },
];

const flavorOptions = [
  { value: "sweet", label: "Sweet" },
  { value: "dry", label: "Dry" },
  { value: "fruity", label: "Fruity" },
  { value: "bold", label: "Bold & Full-bodied" },
  { value: "light", label: "Light & Crisp" },
  { value: "smooth", label: "Smooth & Mellow" },
  { value: "complex", label: "Complex & Layered" },
];

export default function PreferenceQuestionnaire({
  onSubmit,
  isLoading = false,
}: PreferenceQuestionnaireProps) {
  const [beverageTypes, setBeverageTypes] = useState<string[]>([]);
  const [flavorPreferences, setFlavorPreferences] = useState<string[]>([]);

  const toggleBeverageType = (type: string) => {
    setBeverageTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleFlavorPreference = (flavor: string) => {
    setFlavorPreferences(prev =>
      prev.includes(flavor)
        ? prev.filter(f => f !== flavor)
        : [...prev, flavor]
    );
  };

  const handleSubmit = () => {
    if (beverageTypes.length === 0) return;
    
    onSubmit({
      beverageTypes,
      flavorPreferences,
    });
  };

  const canSubmit = beverageTypes.length > 0 && !isLoading;

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-medium">
            Your AI Picks
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us your preferences to get personalized recommendations
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">
            What types of beverages do you usually enjoy?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select all that apply
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {beverageOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = beverageTypes.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  onClick={() => toggleBeverageType(option.value)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all hover-elevate active-elevate-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-card-border'
                  }`}
                  data-testid={`button-beverage-${option.value}`}
                >
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                    isSelected ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <span className={`font-medium ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">
            What flavor profiles do you prefer?
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Optional - helps us refine recommendations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {flavorOptions.map((option) => {
              const isSelected = flavorPreferences.includes(option.value);
              
              return (
                <button
                  key={option.value}
                  onClick={() => toggleFlavorPreference(option.value)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all hover-elevate active-elevate-2 ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-card-border'
                  }`}
                  data-testid={`button-flavor-${option.value}`}
                >
                  <span className={`text-sm font-medium ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
            data-testid="button-submit-preferences"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                Generating Recommendations...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get My Recommendations
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            You can also browse products to build recommendations based on your activity
          </p>
        </div>
      </div>
    </Card>
  );
}
