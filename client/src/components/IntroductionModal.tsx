import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wine, BookOpen, Heart, Gift, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import type { SlideshowImage } from "@shared/schema";
import justinPhoto from "@assets/image_1762437724457.png";

interface IntroductionModalProps {
  open: boolean;
  onContinue: () => void;
  guestName: string;
}

const slides = [
  {
    id: 1,
    image: justinPhoto,
    title: "Welcome to Nashoba Valley Winery!",
    content: (guestName: string) => (
      <div className="space-y-3">
        <p className="text-lg">
          Hello <span className="font-serif text-primary font-semibold">{guestName}</span>!
        </p>
        <p className="text-base">
          I'm Justin Pelletier, owner of Nashoba Valley Winery. We're thrilled to have you here today.
        </p>
        <p className="text-sm text-foreground/80">
          We've created something special to enhance your tasting experience, and I'm excited to show you how it works.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    image: justinPhoto,
    title: "Your Interactive Tasting Companion",
    content: () => (
      <div className="space-y-3">
        <p className="text-sm">
          This digital companion is designed to make your visit more engaging and memorable.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">Discover detailed flavor notes and vineyard stories</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">Save favorites and record tasting impressions</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Gift className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">Get AI-powered recommendations</span>
          </div>
          <div className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg">
            <Wine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">Test your knowledge with trivia and earn rewards!</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    image: justinPhoto,
    title: "Here to Enhance, Not Replace",
    content: () => (
      <div className="space-y-3">
        <div className="bg-primary/10 border-l-4 border-primary p-3 rounded-r-lg">
          <p className="text-base font-medium mb-2">
            Our Promise to You
          </p>
          <p className="text-sm">
            This app is <strong>not meant to replace</strong> our knowledgeable tasting staff. They're here to guide you, answer questions, and share their expertise.
          </p>
        </div>
        <p className="text-sm text-foreground/80">
          Instead, think of this as an added layer of engagement — a way to explore at your own pace, dive deeper into the products you love, and take home detailed notes from your experience.
        </p>
        <p className="text-sm text-foreground/80">
          Our team is always here to make your visit special. The app simply gives you more tools to enjoy and remember it.
        </p>
      </div>
    ),
  },
  {
    id: 4,
    image: justinPhoto,
    title: "Thank You for Being Here",
    content: () => (
      <div className="space-y-3">
        <p className="text-base">
          We're honored to share our passion for winemaking with you today.
        </p>
        <div className="bg-accent/20 border border-accent/30 rounded-lg p-3">
          <p className="text-sm mb-2">
            <strong className="font-semibold">Help Us Improve!</strong>
          </p>
          <p className="text-sm">
            You're among the first to experience this new tool. Your feedback is invaluable in making it better for future guests.
          </p>
          <p className="text-sm mt-2">
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

  // Fetch active slideshow images from database to use as backgrounds (optional enhancement)
  const { data: slideshowImages = [] } = useQuery<SlideshowImage[]>({
    queryKey: ["/api/slideshow-images", { activeOnly: true }],
    queryFn: async () => {
      const response = await fetch("/api/slideshow-images?activeOnly=true");
      if (!response.ok) throw new Error("Failed to fetch slideshow images");
      return response.json();
    },
    enabled: open,
  });

  // Use database images as backgrounds if available, otherwise use default
  const getBackgroundImage = (slideIndex: number) => {
    if (slideshowImages.length > 0) {
      const imageIndex = slideIndex % slideshowImages.length;
      return `/attached_assets/winery_photos/${slideshowImages[imageIndex].filename}`;
    }
    return slides[slideIndex].image;
  };

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
          {/* Left Column - Photo */}
          <div className="relative w-1/2 overflow-hidden">
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
                className="absolute inset-0"
              >
                <img
                  src={getBackgroundImage(currentSlide)}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', getBackgroundImage(currentSlide));
                    e.currentTarget.src = justinPhoto;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
              </motion.div>
            </AnimatePresence>

            {/* Progress Dots */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "w-8 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                  data-testid={`dot-slide-${index}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Text Content */}
          <div className="w-1/2 flex flex-col bg-background">
            {/* Content Area (no scrolling) */}
            <div className="flex-1 flex flex-col justify-center p-8">
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

            {/* Navigation Footer */}
            <div className="border-t bg-background p-4 flex justify-between items-center gap-4">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
