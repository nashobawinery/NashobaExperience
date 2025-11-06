import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoUrl from "@assets/NVW logo no background_1762469370864.png";
import wineryAerialUrl from "@assets/Winery-areal_1762431445607.webp";

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
      <img src={wineryAerialUrl} alt="Nashoba Valley Winery Aerial View" className="absolute inset-0 w-full h-full object-cover" />
      
      <div className="relative z-20 w-full max-w-2xl px-6 text-center">
        <div className="mb-8 flex justify-center">
          <img 
            src={logoUrl} 
            alt="Nashoba Valley Winery Logo" 
            className="w-48 h-auto object-contain drop-shadow-2xl"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>
        
        <h1 className="font-serif text-4xl md:text-5xl font-light text-primary-foreground mb-4 tracking-wide leading-tight">
          Welcome to Nashoba Valley Winery, Distillery and Brewery<br />Tasting Room
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
