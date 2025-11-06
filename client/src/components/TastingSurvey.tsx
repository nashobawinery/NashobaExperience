import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2 } from "lucide-react";

interface TastingSurveyProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SurveyData) => void;
  submitting?: boolean;
}

export interface SurveyData {
  easeOfUse: number | null;
  helpfulness: number | null;
  staffReplacement: number | null;
  recommendation: number | null;
  favoriteFeature: string;
  improvements: string;
  additionalComments: string;
}

const ratingLabels = {
  1: "Very Difficult",
  2: "Difficult",
  3: "Neutral",
  4: "Easy",
  5: "Very Easy",
};

const agreementLabels = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

const recommendLabels = {
  1: "Not at all",
  2: "Unlikely",
  3: "Neutral",
  4: "Likely",
  5: "Very Likely",
};

export default function TastingSurvey({ open, onClose, onSubmit, submitting = false }: TastingSurveyProps) {
  const [formData, setFormData] = useState<SurveyData>({
    easeOfUse: null,
    helpfulness: null,
    staffReplacement: null,
    recommendation: null,
    favoriteFeature: "",
    improvements: "",
    additionalComments: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const RatingScale = ({ 
    value, 
    onChange, 
    labels,
    name 
  }: { 
    value: number | null; 
    onChange: (val: number) => void; 
    labels: Record<number, string>;
    name: string;
  }) => (
    <RadioGroup 
      value={value?.toString() || ""} 
      onValueChange={(val) => onChange(parseInt(val))}
      className="flex gap-2"
    >
      {[1, 2, 3, 4, 5].map((rating) => (
        <div key={rating} className="flex flex-col items-center gap-1 flex-1">
          <RadioGroupItem 
            value={rating.toString()} 
            id={`${name}-${rating}`}
            className="h-5 w-5"
            data-testid={`radio-${name}-${rating}`}
          />
          <Label 
            htmlFor={`${name}-${rating}`} 
            className="text-xs text-center cursor-pointer"
          >
            {rating}
          </Label>
          <span className="text-[10px] text-muted-foreground text-center hidden sm:block">
            {labels[rating as keyof typeof labels]}
          </span>
        </div>
      ))}
    </RadioGroup>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-survey">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">
            Tasting Experience Survey
          </DialogTitle>
          <DialogDescription>
            Thank you for trying our Interactive Tasting Companion! Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                1. How easy was it to use the app during your tasting?
              </Label>
              <RatingScale
                name="ease-of-use"
                value={formData.easeOfUse}
                onChange={(val) => setFormData({ ...formData, easeOfUse: val })}
                labels={ratingLabels}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                2. How helpful was the app in enhancing your tasting experience?
              </Label>
              <RatingScale
                name="helpfulness"
                value={formData.helpfulness}
                onChange={(val) => setFormData({ ...formData, helpfulness: val })}
                labels={agreementLabels}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                3. The app complemented (not replaced) our tasting staff
              </Label>
              <RatingScale
                name="staff-replacement"
                value={formData.staffReplacement}
                onChange={(val) => setFormData({ ...formData, staffReplacement: val })}
                labels={agreementLabels}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">
                4. Would you recommend this app to other visitors?
              </Label>
              <RatingScale
                name="recommendation"
                value={formData.recommendation}
                onChange={(val) => setFormData({ ...formData, recommendation: val })}
                labels={recommendLabels}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="favorite-feature" className="text-base font-medium">
                5. What was your favorite feature?
              </Label>
              <Textarea
                id="favorite-feature"
                placeholder="e.g., AI recommendations, trivia, product details..."
                value={formData.favoriteFeature}
                onChange={(e) => setFormData({ ...formData, favoriteFeature: e.target.value })}
                className="min-h-[80px]"
                data-testid="textarea-favorite-feature"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements" className="text-base font-medium">
                6. What could we improve?
              </Label>
              <Textarea
                id="improvements"
                placeholder="Share any suggestions or issues you encountered..."
                value={formData.improvements}
                onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                className="min-h-[80px]"
                data-testid="textarea-improvements"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-comments" className="text-base font-medium">
                7. Additional comments (optional)
              </Label>
              <Textarea
                id="additional-comments"
                placeholder="Anything else you'd like to share..."
                value={formData.additionalComments}
                onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                className="min-h-[80px]"
                data-testid="textarea-additional-comments"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              data-testid="button-cancel-survey"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting}
              data-testid="button-submit-survey"
            >
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
