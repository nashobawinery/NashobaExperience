import { useEffect, useRef } from 'react';

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: any[] = [];
    const isDark = document.documentElement.classList.contains('dark');

    const colors = isDark 
      ? ['#fbbf24', '#f59e0b', '#ec4899', '#a78bfa', '#60a5fa']
      : ['#fbbf24', '#f59e0b', '#ec4899', '#a78bfa', '#60a5fa'];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.life = 1;
        this.maxLife = 60 + Math.random() * 40;
        this.size = Math.random() * 3 + 2;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravity
        this.life -= 1 / this.maxLife;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
      }
    }

    const createFirework = (x: number, y: number) => {
      for (let i = 0; i < 30; i++) {
        particles.push(new Particle(x, y));
      }
    };

    // Create initial fireworks
    const createInitialFireworks = () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const x = Math.random() * canvas.width;
          const y = canvas.height * 0.3;
          createFirework(x, y);
        }, i * 300);
      }
    };

    createInitialFireworks();

    // Create periodic fireworks
    const interval = setInterval(() => {
      const x = Math.random() * canvas.width;
      const y = canvas.height * 0.3;
      createFirework(x, y);
    }, 1500);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);

        if (particles[i].life <= 0) {
          particles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
