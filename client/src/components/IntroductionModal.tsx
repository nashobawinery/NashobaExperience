import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wine, BookOpen, Heart, Gift } from "lucide-react";

interface IntroductionModalProps {
  open: boolean;
  onContinue: () => void;
  guestName: string;
}

export default function IntroductionModal({ open, onContinue, guestName }: IntroductionModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-introduction">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-primary">
            Welcome to Nashoba Valley Winery, {guestName}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-foreground/90">
          <p className="text-lg leading-relaxed">
            We're excited to introduce our new <strong>Interactive Tasting Companion</strong> — a digital tool designed to enhance your tasting experience.
          </p>

          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Wine className="w-5 h-5 text-primary" />
              What This App Offers:
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Background on each product with detailed flavor notes and vineyard stories</span>
              </li>
              <li className="flex gap-3">
                <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Interactive features to record your impressions and favorites</span>
              </li>
              <li className="flex gap-3">
                <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>AI-powered recommendations based on your preferences</span>
              </li>
              <li className="flex gap-3">
                <Wine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Trivia challenges to learn more about winemaking (with rewards!)</span>
              </li>
            </ul>
          </div>

          <div className="border-l-4 border-primary/30 pl-4 py-2 bg-primary/5 rounded-r">
            <p className="text-sm italic">
              <strong>Our goal:</strong> This app is not meant to replace our knowledgeable tasting staff, but to add a layer of engagement — letting you explore at your own pace, discover what you enjoy most, and take home your tasting notes with ease.
            </p>
          </div>

          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <p className="text-sm">
              <strong className="text-accent">Thank you for helping us test!</strong> Your feedback is invaluable in making this better for future guests. At the end of your tasting, click the <strong>"Tasting Complete"</strong> button to share your thoughts through a quick survey.
            </p>
          </div>

          <Button
            onClick={onContinue}
            size="lg"
            className="w-full"
            data-testid="button-continue-to-tasting"
          >
            Let's Begin!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
