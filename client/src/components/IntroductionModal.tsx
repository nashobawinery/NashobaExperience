import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SlideshowImage } from "@shared/schema";

interface IntroductionModalProps {
  open: boolean;
  onContinue: () => void;
  guestName: string;
}

export default function IntroductionModal({ open, onContinue, guestName }: IntroductionModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const { data: allSlides = [], isLoading } = useQuery<SlideshowImage[]>({
    queryKey: ["/api/slideshow-images"],
  });

  const activeSlides = allSlides
    .filter((slide) => slide.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const nextSlide = () => {
    if (currentSlide < activeSlides.length - 1) {
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

  if (isLoading) {
    return null;
  }

  if (activeSlides.length === 0) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-md p-8" 
          data-testid="dialog-introduction"
        >
          <DialogTitle className="sr-only">Welcome</DialogTitle>
          <div className="text-center space-y-4">
            <h2 className="font-serif text-2xl text-primary">
              Welcome, {guestName}!
            </h2>
            <p className="text-base">
              Thank you for visiting. We're thrilled to have you here today.
            </p>
            <Button onClick={onContinue} className="w-full" data-testid="button-continue">
              Let's Begin!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const slide = activeSlides[currentSlide];

  const renderContent = (contentHtml: string, guestName: string) => {
    const processedHtml = contentHtml.replace(/\{guestName\}/g, `<span class="font-serif text-primary font-semibold">${guestName}</span>`);
    
    return (
      <div 
        className="text-foreground/90 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-6xl p-0 gap-0 overflow-hidden border-0" 
        data-testid="dialog-introduction"
      >
        <DialogTitle className="sr-only">Welcome Slideshow</DialogTitle>
        <div className="flex h-[85vh] max-h-[650px]">
          {/* Left Column - Photo with dark background */}
          <div className="relative w-2/5 bg-black flex items-center justify-center p-6">
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
                {slide?.imageUrl && (
                  <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg shadow-2xl">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title || "Slide image"}
                      className="absolute inset-0 h-full w-full object-cover max-w-none scale-125 origin-center"
                    />
                  </div>
                )}
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
                      {slide?.title}
                    </h2>
                    {slide?.contentHtml && renderContent(slide.contentHtml, guestName)}
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
                  {currentSlide + 1} / {activeSlides.length}
                </div>

                <Button
                  onClick={nextSlide}
                  className="gap-2"
                  data-testid="button-next-slide"
                >
                  {currentSlide === activeSlides.length - 1 ? "Let's Begin!" : "Next"}
                  {currentSlide < activeSlides.length - 1 && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>

              {/* Progress Dots - moved to bottom of right column */}
              <div className="flex justify-center gap-2 pt-2">
                {activeSlides.map((_, index) => (
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
