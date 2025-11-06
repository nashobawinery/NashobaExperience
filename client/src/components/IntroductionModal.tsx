import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wine, BookOpen, Heart, Gift, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import justinPhoto from "@assets/jp_1762469142187.jfif";
import barrelsPhoto from "@assets/better barrels_1762469157470.jpg";
import pavilionPhoto from "@assets/Pavillion gather_1762469172841.jpg";
import jprpPhoto from "@assets/jprp_1762469663189.jfif";

interface IntroductionModalProps {
  open: boolean;
  onContinue: () => void;
  guestName: string;
}

const slides = [
  {
    id: 1,
    image: justinPhoto, // Justin Pelletier photo
    title: "Welcome to Nashoba Valley Winery!",
    content: (guestName: string) => (
      <div className="space-y-3">
        <p className="text-base">
          Hello <span className="font-serif text-primary font-semibold">{guestName}</span>!
        </p>
        <p className="text-base">
          I'm Justin Pelletier, owner of Nashoba Valley Winery. We're thrilled to have you here today.
        </p>
        <p className="text-base text-foreground/80">
          We've created something special to enhance your tasting experience, and I'm excited to show you how it works.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    image: barrelsPhoto, // Wine barrels
    title: "Your Interactive Tasting Companion",
    content: () => (
      <div className="space-y-3">
        <p className="text-base">
          This digital companion is designed to make your visit more engaging and memorable.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-base">Discover detailed flavor notes and vineyard stories</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-base">Save favorites and record tasting impressions</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-base">Get AI-powered recommendations</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Wine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-base">Test your knowledge with trivia and earn rewards!</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    image: pavilionPhoto, // People gathering at pavilion
    title: "Here to Enhance, Not Replace",
    content: () => (
      <div className="space-y-3">
        <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-lg">
          <p className="text-base font-medium mb-2">
            Our Promise to You
          </p>
          <p className="text-base">
            This app is <strong>not meant to replace</strong> our knowledgeable tasting staff. They're here to guide you, answer questions, and share their expertise.
          </p>
        </div>
        <p className="text-base text-foreground/80">
          Instead, think of this as an added layer of engagement — a way to explore at your own pace, dive deeper into the products you love, and take home detailed notes from your experience.
        </p>
        <p className="text-base text-foreground/80">
          Our team is always here to make your visit special. The app simply gives you more tools to enjoy and remember it.
        </p>
      </div>
    ),
  },
  {
    id: 4,
    image: jprpPhoto, // Justin Pelletier & RP photo
    title: "Thank You for Being Here",
    content: () => (
      <div className="space-y-3">
        <p className="text-base">
          We're honored to share our passion for winemaking with you today.
        </p>
        <div className="bg-accent/20 border border-accent/30 rounded-lg p-3">
          <p className="text-base mb-2">
            <strong className="font-semibold">Help Us Improve!</strong>
          </p>
          <p className="text-base">
            You're among the first to experience this new tool. Your feedback is invaluable in making it better for future guests.
          </p>
          <p className="text-base mt-2">
            At the end of your tasting, please share your thoughts through our quick survey by clicking <strong>"Tasting Complete"</strong>.
          </p>
        </div>
        <p className="text-base font-serif text-primary text-center mt-4">
          Enjoy your tasting experience!
        </p>
      </div>
    ),
  },
];

export default function IntroductionModal({ open, onContinue, guestName }: IntroductionModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onContinue();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const slide = slides[currentSlide];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-6xl p-0 gap-0 overflow-hidden border-0" 
        data-testid="dialog-introduction"
      >
        <DialogTitle className="sr-only">Welcome to Nashoba Valley Winery</DialogTitle>
        <div className="flex h-[85vh] max-h-[650px]">
          {/* Left Column - Photo with dark background */}
          <div className="relative w-2/5 overflow-hidden bg-black flex items-center justify-center p-6">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  style={{ maxWidth: '125%', maxHeight: '125%' }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column - Text Content */}
          <div className="w-3/5 flex flex-col bg-background">
            {/* Content Area with scrolling */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="min-h-full flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <h2 className="font-serif text-2xl text-primary leading-tight">
                      {slide.title}
                    </h2>
                    <div className="text-foreground/90">
                      {slide.content(guestName)}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="border-t bg-background p-4 space-y-3">
              {/* Navigation Buttons */}
              <div className="flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="gap-2"
                  data-testid="button-prev-slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <div className="text-sm text-muted-foreground">
                  {currentSlide + 1} / {slides.length}
                </div>

                <Button
                  onClick={nextSlide}
                  className="gap-2"
                  data-testid="button-next-slide"
                >
                  {currentSlide === slides.length - 1 ? "Let's Begin!" : "Next"}
                  {currentSlide < slides.length - 1 && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {/* Progress Dots - moved to bottom of right column */}
              <div className="flex justify-center gap-2 pt-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? "w-8 bg-primary"
                        : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/60"
                    }`}
                    data-testid={`dot-slide-${index}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
