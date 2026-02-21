import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wine, Calendar, Clock, Utensils, Star, Camera, Bell, Sun, Cloud, CloudRain, Grape, Beer, GlassWater, Sparkles, MapPin, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface DisplaySettings {
  id: number;
  slideType: string;
  isEnabled: boolean;
  duration: number;
  sortOrder: number;
  backgroundImageUrl: string | null;
}

interface Slide {
  id: number;
  slideType: string;
  title: string;
  subtitle: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  backgroundImageUrl: string | null;
  duration: number;
  sortOrder: number;
  isActive: boolean;
  location: string | null;
}

interface Event {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  category: string | null;
  imageUrl: string | null;
}

interface Announcement {
  id: number;
  title: string;
  body: string;
  priority: number;
}

interface Photo {
  id: number;
  imageUrl: string;
  caption: string | null;
  category: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: string | null;
  alcoholContent: string | null;
  imageUrl: string | null;
}

interface DailySpecial {
  id: number;
  title: string;
  description: string | null;
  happyHourStart: string | null;
  happyHourEnd: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  wine: "Wine",
  spirits: "Spirits",
  beer: "Beer",
  cider: "Cider",
  canned_cocktail: "Canned Cocktails",
  canned_wine: "Canned Wine",
};

function categoryLabel(cat: string | null): string {
  return CATEGORY_LABELS[cat || ""] || cat || "Other";
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const h = parseInt(parts[0]);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function WelcomeSlide() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16" data-testid="slide-welcome">
      <div className="mb-8">
        <Grape className="w-24 h-24 text-amber-400 mx-auto mb-6" />
      </div>
      <h1 className="text-7xl font-bold text-white mb-4 tracking-tight">
        Welcome to Nashoba Valley
      </h1>
      <p className="text-3xl text-white/80 mb-8 font-light">
        Winery &middot; Brewery &middot; Distillery &middot; Restaurant
      </p>
      <div className="flex items-center gap-6 text-2xl text-white/70">
        <Clock className="w-8 h-8" />
        <span>{timeStr}</span>
        <span className="text-white/30">|</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}

function EventsTodaySlide({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-events-today">
      <div className="flex items-center gap-4 mb-10">
        <Calendar className="w-12 h-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Today's Events</h2>
      </div>
      <div className="flex-1 grid grid-cols-1 gap-6 overflow-hidden">
        {events.slice(0, 4).map((event) => (
          <div key={event.id} className="flex items-start gap-6 bg-white/5 rounded-lg p-6 border border-white/10">
            {event.imageUrl && (
              <img src={event.imageUrl} alt={event.title} className="w-28 h-28 object-cover rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="text-3xl font-semibold text-white mb-2">{event.title}</h3>
              {event.description && <p className="text-xl text-white/70 line-clamp-2">{event.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-lg text-amber-300/80">
                {(event.startTime || event.endTime) && (
                  <span className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {formatTime(event.startTime)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ""}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingEventsSlide({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-upcoming-events">
      <div className="flex items-center gap-4 mb-10">
        <Star className="w-12 h-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Upcoming Events</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {events.slice(0, 6).map((event) => (
          <div key={event.id} className="flex items-start gap-4 bg-white/5 rounded-lg p-5 border border-white/10">
            <div className="flex-shrink-0 bg-amber-400/20 rounded-lg p-3 text-center min-w-[80px]">
              <p className="text-sm text-amber-300 uppercase font-medium">
                {new Date(event.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
              </p>
              <p className="text-3xl font-bold text-white">
                {new Date(event.eventDate + "T12:00:00").getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-semibold text-white mb-1 truncate">{event.title}</h3>
              {event.description && <p className="text-lg text-white/60 line-clamp-2">{event.description}</p>}
              {event.startTime && (
                <p className="text-base text-amber-300/70 mt-2">
                  {formatTime(event.startTime)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WineListSlide({ wines }: { wines: ProductItem[] }) {
  const wineOnly = wines.filter((w) =>
    ["wine", "canned_wine"].includes(w.category || "")
  );
  if (wineOnly.length === 0) return null;

  const categories = Array.from(new Set(wineOnly.map((w) => w.category)));

  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-wine-list">
      <div className="flex items-center gap-4 mb-10">
        <Wine className="w-12 h-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Our Wines</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
        {categories.slice(0, 4).map((cat) => (
          <div key={cat}>
            <h3 className="text-2xl font-semibold text-amber-300 mb-4 border-b border-amber-400/30 pb-2">{categoryLabel(cat)}</h3>
            <div className="space-y-3">
              {wineOnly.filter((w) => w.category === cat).slice(0, 5).map((wine) => (
                <div key={wine.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl text-white truncate">{wine.name}</p>
                    {wine.alcoholContent && <p className="text-sm text-white/40">{wine.alcoholContent}% ABV</p>}
                  </div>
                  {wine.price && (
                    <p className="text-xl text-amber-300 font-medium ml-4">${parseFloat(wine.price).toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BeverageListSlide({ wines }: { wines: ProductItem[] }) {
  const beverages = wines.filter((w) =>
    ["cider", "spirits", "beer", "canned_cocktail"].includes(w.category || "")
  );
  if (beverages.length === 0) return null;

  const categories = Array.from(new Set(beverages.map((w) => w.category)));
  const icons: Record<string, typeof Wine> = {
    beer: Beer,
    spirits: GlassWater,
    cider: Grape,
    canned_cocktail: GlassWater,
  };

  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-beverage-list">
      <div className="flex items-center gap-4 mb-10">
        <Beer className="w-12 h-12 text-amber-400" />
        <h2 className="text-5xl font-bold text-white">Craft Beverages</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
        {categories.map((cat) => {
          const Icon = icons[cat || ""] || GlassWater;
          return (
            <div key={cat}>
              <h3 className="text-2xl font-semibold text-amber-300 mb-4 border-b border-amber-400/30 pb-2 flex items-center gap-2">
                <Icon className="w-6 h-6" />
                {categoryLabel(cat)}
              </h3>
              <div className="space-y-3">
                {beverages.filter((w) => w.category === cat).slice(0, 6).map((bev) => (
                  <div key={bev.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xl text-white truncate">{bev.name}</p>
                    </div>
                    {bev.price && (
                      <p className="text-xl text-amber-300 font-medium ml-4">${parseFloat(bev.price).toFixed(2)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementSlide({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 text-center" data-testid="slide-announcement">
      <Bell className="w-16 h-16 text-amber-400 mb-8" />
      {announcements.slice(0, 3).map((a) => (
        <div key={a.id} className="mb-8">
          <h2 className="text-5xl font-bold text-white mb-4">{a.title}</h2>
          <p className="text-2xl text-white/80 max-w-4xl leading-relaxed">{a.body}</p>
        </div>
      ))}
    </div>
  );
}

function PhotoGallerySlide({ photos }: { photos: Photo[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [photos.length]);

  if (photos.length === 0) return null;
  const photo = photos[currentIndex];

  return (
    <div className="relative h-full w-full" data-testid="slide-photo-gallery">
      <img
        src={photo.imageUrl}
        alt={photo.caption || "Gallery photo"}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-16 pb-12">
        <div className="flex items-center gap-4 mb-4">
          <Camera className="w-8 h-8 text-amber-400" />
          <span className="text-xl text-white/70 uppercase tracking-wider">Photo Gallery</span>
        </div>
        {photo.caption && <p className="text-3xl text-white font-light">{photo.caption}</p>}
        <div className="flex gap-2 mt-6">
          {photos.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-8 bg-amber-400" : "w-3 bg-white/30"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DailySpecialsSlide({ specials }: { specials: DailySpecial[] }) {
  if (specials.length === 0) return null;
  return (
    <div className="flex flex-col items-center justify-center h-full px-16" data-testid="slide-daily-specials">
      <Sparkles className="w-16 h-16 text-amber-400 mb-8" />
      <h2 className="text-5xl font-bold text-white mb-10">Today's Specials</h2>
      <div className="grid grid-cols-1 gap-6 w-full max-w-4xl">
        {specials.slice(0, 4).map((s) => (
          <div key={s.id} className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <h3 className="text-3xl font-semibold text-amber-300 mb-2">{s.title}</h3>
            {s.description && <p className="text-xl text-white/70">{s.description}</p>}
            {(s.happyHourStart || s.happyHourEnd) && (
              <p className="text-lg text-amber-300/70 mt-3">
                Happy Hour: {formatTime(s.happyHourStart)} - {formatTime(s.happyHourEnd)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-custom">
      {slide.backgroundImageUrl && (
        <>
          <img src={slide.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="relative z-10">
        <h2 className="text-6xl font-bold text-white mb-4">{slide.title}</h2>
        {slide.subtitle && <p className="text-3xl text-white/80 mb-6">{slide.subtitle}</p>}
        {slide.bodyText && <p className="text-2xl text-white/70 max-w-4xl leading-relaxed">{slide.bodyText}</p>}
        {slide.bodyHtml && (
          <div className="text-2xl text-white/70 max-w-4xl leading-relaxed" dangerouslySetInnerHTML={{ __html: slide.bodyHtml }} />
        )}
      </div>
    </div>
  );
}

function WineClubSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-wine-club">
      <Grape className="w-20 h-20 text-amber-400 mb-8" />
      <h2 className="text-6xl font-bold text-white mb-6">Join Our Wine Club</h2>
      <p className="text-2xl text-white/80 max-w-3xl mb-8 leading-relaxed">
        Exclusive access to limited releases, member discounts, and special events throughout the year
      </p>
      <div className="grid grid-cols-3 gap-8 mt-4">
        <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
          <Wine className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-xl text-white font-medium">Quarterly Shipments</p>
          <p className="text-white/50 mt-1">Curated selections</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
          <Star className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-xl text-white font-medium">Member Discounts</p>
          <p className="text-white/50 mt-1">Save on every visit</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6 border border-amber-400/20">
          <Calendar className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-xl text-white font-medium">Private Events</p>
          <p className="text-white/50 mt-1">Members-only tastings</p>
        </div>
      </div>
    </div>
  );
}

export default function NashobatvDisplay() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideOrder, setSlideOrder] = useState<{ type: string; duration: number; data?: any }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: settings } = useQuery<DisplaySettings[]>({
    queryKey: ["/api/public/display/settings"],
    refetchInterval: 60000,
  });

  const { data: slides } = useQuery<Slide[]>({
    queryKey: ["/api/public/display/slides"],
    refetchInterval: 60000,
  });

  const { data: todayEvents } = useQuery<Event[]>({
    queryKey: ["/api/public/display/events/today"],
    refetchInterval: 300000,
  });

  const { data: upcomingEvents } = useQuery<Event[]>({
    queryKey: ["/api/public/display/events/upcoming"],
    refetchInterval: 300000,
  });

  const { data: wines } = useQuery<ProductItem[]>({
    queryKey: ["/api/public/display/wines"],
    refetchInterval: 600000,
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/public/display/announcements"],
    refetchInterval: 120000,
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: ["/api/public/display/photos"],
    refetchInterval: 300000,
  });

  const { data: specials } = useQuery<DailySpecial[]>({
    queryKey: ["/api/public/display/specials"],
    refetchInterval: 300000,
  });

  const buildSlideOrder = useCallback(() => {
    if (!settings) return;
    const enabledSettings = settings.filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    const order: { type: string; duration: number; data?: any }[] = [];

    for (const setting of enabledSettings) {
      const t = setting.slideType;
      const dur = setting.duration;

      if (t === "welcome") {
        order.push({ type: "welcome", duration: dur });
      } else if (t === "events_today" && todayEvents && todayEvents.length > 0) {
        order.push({ type: "events_today", duration: dur });
      } else if (t === "wine_list" && wines && wines.filter((w) => ["wine", "canned_wine"].includes(w.category || "")).length > 0) {
        order.push({ type: "wine_list", duration: dur });
        const hasBeverages = wines.filter((w) => ["cider", "spirits", "beer", "canned_cocktail"].includes(w.category || "")).length > 0;
        if (hasBeverages) {
          order.push({ type: "beverage_list", duration: dur });
        }
      } else if (t === "upcoming_events" && upcomingEvents && upcomingEvents.length > 0) {
        order.push({ type: "upcoming_events", duration: dur });
      } else if (t === "photo_gallery" && photos && photos.length > 0) {
        order.push({ type: "photo_gallery", duration: dur });
      } else if (t === "announcement" && announcements && announcements.length > 0) {
        order.push({ type: "announcement", duration: dur });
      } else if (t === "wine_club") {
        order.push({ type: "wine_club", duration: dur });
      } else if (t === "daily_specials" && specials && specials.length > 0) {
        order.push({ type: "daily_specials", duration: dur });
      } else if (t === "custom" && slides) {
        for (const slide of slides.filter((s) => s.slideType === "custom")) {
          order.push({ type: "custom", duration: slide.duration || dur, data: slide });
        }
      }
    }

    if (order.length === 0) {
      order.push({ type: "welcome", duration: 15 });
    }

    setSlideOrder(order);
  }, [settings, todayEvents, upcomingEvents, wines, announcements, photos, specials, slides]);

  useEffect(() => {
    buildSlideOrder();
  }, [buildSlideOrder]);

  useEffect(() => {
    if (slideOrder.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const currentDuration = slideOrder[currentSlideIndex]?.duration || 12;
    timerRef.current = setTimeout(() => {
      setCurrentSlideIndex((i) => (i + 1) % slideOrder.length);
    }, currentDuration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlideIndex, slideOrder]);

  const current = slideOrder[currentSlideIndex];

  const renderSlide = () => {
    if (!current) return <WelcomeSlide />;
    switch (current.type) {
      case "welcome": return <WelcomeSlide />;
      case "events_today": return <EventsTodaySlide events={todayEvents || []} />;
      case "upcoming_events": return <UpcomingEventsSlide events={upcomingEvents || []} />;
      case "wine_list": return <WineListSlide wines={wines || []} />;
      case "beverage_list": return <BeverageListSlide wines={wines || []} />;
      case "announcement": return <AnnouncementSlide announcements={announcements || []} />;
      case "photo_gallery": return <PhotoGallerySlide photos={photos || []} />;
      case "daily_specials": return <DailySpecialsSlide specials={specials || []} />;
      case "wine_club": return <WineClubSlide />;
      case "custom": return <CustomSlide slide={current.data} />;
      default: return <WelcomeSlide />;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-[#1a0e2e] via-[#0d1117] to-[#1a0e2e] overflow-hidden"
      style={{ cursor: "none" }}
      data-testid="nashobatv-display"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9zdmc+')] opacity-50" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
        {slideOrder.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === currentSlideIndex ? "w-8 bg-amber-400" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="absolute top-6 right-8 text-white/30 text-sm font-mono" data-testid="text-display-time">
        {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </div>
    </div>
  );
}
