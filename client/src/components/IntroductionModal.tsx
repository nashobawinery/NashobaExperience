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

interface IntroductionModalProps {
  open: boolean;
  onContinue: () => void;
  guestName: string;
}

export default function IntroductionModal({ open, onContinue, guestName }: IntroductionModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  // Fetch active slideshow images from database
  const { data: slideshowImages = [], isLoading } = useQuery<SlideshowImage[]>({
    queryKey: ["/api/slideshow-images", { activeOnly: true }],
    queryFn: async () => {
      const response = await fetch("/api/slideshow-images?activeOnly=true");
      if (!response.ok) throw new Error("Failed to fetch slideshow images");
      return response.json();
    },
    enabled: open,
  });

  // Build slides from database images
  const slides = slideshowImages.map((image) => ({
    id: image.id,
    imageUrl: `/attached_assets/winery_photos/${image.filename}`,
    title: image.caption || "Welcome to Nashoba Valley Winery",
    description: image.description || "",
  }));

  // Don't render content if no slides available
  if (isLoading || slides.length === 0) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-4xl p-0 gap-0 overflow-hidden border-0" 
          data-testid="dialog-introduction"
        >
          <DialogTitle className="sr-only">Welcome to Nashoba Valley Winery</DialogTitle>
          <div className="relative h-[85vh] max-h-[700px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading slideshow...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
        className="max-w-4xl p-0 gap-0 overflow-hidden border-0" 
        data-testid="dialog-introduction"
      >
        <DialogTitle className="sr-only">Welcome to Nashoba Valley Winery</DialogTitle>
        <div className="relative h-[85vh] max-h-[700px] flex flex-col">
          {/* Image Section with Overlay */}
          <div className="relative h-[45%] overflow-hidden">
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
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
              </motion.div>
            </AnimatePresence>

            {/* Progress Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
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

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="font-serif text-3xl text-primary leading-tight">
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <div className="text-foreground/90">
                      <p className="text-lg leading-relaxed">{slide.description}</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="border-t bg-background p-4 flex justify-between items-center gap-4">
            <Button
              variant="outline"
              size="lg"
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
              size="lg"
              onClick={nextSlide}
              className="gap-2"
              data-testid="button-next-slide"
            >
              {currentSlide === slides.length - 1 ? "Let's Begin!" : "Next"}
              {currentSlide < slides.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
