import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wine } from "lucide-react";

interface WelcomeScreenProps {
  onStart: (name: string) => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const [guestName, setGuestName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      onStart(guestName.trim());
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary/50 z-10" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1920&q=80')] bg-cover bg-center" />
      
      <div className="relative z-20 w-full max-w-md px-6 text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-primary-foreground/10 backdrop-blur-sm p-6 border border-primary-foreground/20">
            <Wine className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="font-serif text-5xl md:text-6xl font-light text-primary-foreground mb-4 tracking-wide">
          Welcome to Nashoba
        </h1>
        <p className="text-xl text-primary-foreground/90 mb-12 font-light">
          Your personal tasting companion
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-background/95 backdrop-blur-md rounded-lg p-1 shadow-xl">
            <Input
              type="text"
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="text-center text-lg border-0 bg-transparent focus-visible:ring-0 py-6"
              data-testid="input-guest-name"
              autoFocus
            />
          </div>
          
          <Button
            type="submit"
            size="lg"
            className="w-full py-6 text-lg font-medium"
            disabled={!guestName.trim()}
            data-testid="button-start-tasting"
          >
            Begin Your Tasting Experience
          </Button>
        </form>

        <p className="mt-8 text-sm text-primary-foreground/70">
          Discover personalized recommendations • Earn rewards through trivia • Build your perfect selection
        </p>
      </div>
    </div>
  );
}
