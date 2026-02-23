import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Wine, Calendar, Clock, Star, Camera, Bell, Grape, Beer, GlassWater, Sparkles, MapPin, ChevronRight, ChevronLeft, UtensilsCrossed, Cloud, Sun, CloudRain, Snowflake, Leaf, HelpCircle, CheckCircle2, XCircle, Landmark } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface DisplaySettings {
  id: number;
  slideType: string;
  isEnabled: boolean;
  duration: number;
  sortOrder: number;
  backgroundImageUrl: string | null;
  configData: any;
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

const GOLD = "#C9A050";
const GOLD_LIGHT = "#D4AF61";
const WINE_DARK = "#2C1810";
const WINE_MID = "#4A1E2A";

function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD}40, transparent)` }} />
      <Grape className="w-4 h-4" style={{ color: GOLD }} />
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD}40, transparent)` }} />
    </div>
  );
}

function WelcomeSlide({ customMessage }: { customMessage?: string }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const tagline = customMessage || "Award-winning farm committed to producing premium, handcrafted wines and spirits";

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-16" data-testid="slide-welcome">
      <div className="mb-6">
        <img
          src="https://nashobawinery.com/wp-content/uploads/2023/04/nashoba-winery-logo-rev1-1.png"
          alt="Nashoba Valley Winery"
          className="h-28 object-contain mx-auto"
        />
      </div>
      <Divider className="w-96 mb-8" />
      <h1 className="text-6xl font-light tracking-wide mb-3" style={{ color: "#F5F0E8", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        Welcome to <span className="font-semibold">Nashoba Valley</span>
      </h1>
      <p className="text-2xl tracking-widest uppercase mb-10 font-light" style={{ color: GOLD_LIGHT, letterSpacing: "0.25em" }}>
        Winery &middot; Distillery &middot; Brewery &middot; Restaurant
      </p>
      <p className="text-xl max-w-3xl leading-relaxed mb-10 italic" style={{ color: "#F5F0E8AA", fontFamily: "Georgia, serif" }}>
        {tagline}
      </p>
      <Divider className="w-64 mb-8" />
      <div className="flex items-center gap-6 text-xl" style={{ color: "#F5F0E8" }}>
        <Clock className="w-6 h-6" style={{ color: GOLD }} />
        <span>{timeStr}</span>
        <span style={{ color: `${GOLD}40` }}>|</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}

function EventsTodaySlide({ events }: { events: Event[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-events-today">
      <div className="flex items-center gap-4 mb-3">
        <Calendar className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Today's Events
        </h2>
      </div>
      <Divider className="mb-8" />
      <div className="flex-1 grid grid-cols-1 gap-5 overflow-hidden">
        {events.slice(0, 4).map((event) => (
          <div key={event.id} className="flex items-start gap-6 rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}18` }}>
            {event.imageUrl && (
              <img src={event.imageUrl} alt={event.title} className="w-28 h-28 object-cover rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1">
              <h3 className="text-3xl font-semibold mb-2" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>{event.title}</h3>
              {event.description && <p className="text-xl" style={{ color: "#F5F0E8AA" }}>{event.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-lg" style={{ color: GOLD_LIGHT }}>
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
      <div className="flex items-center gap-4 mb-3">
        <Star className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Upcoming Events
        </h2>
      </div>
      <Divider className="mb-8" />
      <div className="flex-1 grid grid-cols-2 gap-5 overflow-hidden">
        {events.slice(0, 6).map((event) => (
          <div key={event.id} className="flex items-start gap-4 rounded-lg p-5" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}18` }}>
            <div className="flex-shrink-0 rounded-lg p-3 text-center min-w-[80px]" style={{ background: `${GOLD}12` }}>
              <p className="text-sm uppercase font-medium" style={{ color: GOLD_LIGHT }}>
                {new Date(event.eventDate + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
              </p>
              <p className="text-3xl font-bold" style={{ color: "#F5F0E8" }}>
                {new Date(event.eventDate + "T12:00:00").getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-semibold mb-1 truncate" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>{event.title}</h3>
              {event.description && <p className="text-lg line-clamp-2" style={{ color: "#F5F0E880" }}>{event.description}</p>}
              {event.startTime && (
                <p className="text-base mt-2" style={{ color: `${GOLD_LIGHT}AA` }}>
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
      <div className="flex items-center gap-4 mb-3">
        <Wine className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Our Wines
        </h2>
      </div>
      <Divider className="mb-8" />
      <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
        {categories.slice(0, 4).map((cat) => (
          <div key={cat}>
            <h3 className="text-2xl font-semibold mb-4 pb-2 flex items-center gap-2" style={{ color: GOLD_LIGHT, borderBottom: `1px solid ${GOLD}30`, fontFamily: "Georgia, serif" }}>
              {categoryLabel(cat)}
            </h3>
            <div className="space-y-3">
              {wineOnly.filter((w) => w.category === cat).slice(0, 5).map((wine) => (
                <div key={wine.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl truncate" style={{ color: "#F5F0E8" }}>{wine.name}</p>
                    {wine.alcoholContent && <p className="text-sm" style={{ color: "#F5F0E850" }}>{wine.alcoholContent}% ABV</p>}
                  </div>
                  {wine.price && (
                    <p className="text-xl font-medium ml-4" style={{ color: GOLD }}>${parseFloat(wine.price).toFixed(2)}</p>
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
      <div className="flex items-center gap-4 mb-3">
        <Beer className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Craft Beverages
        </h2>
      </div>
      <Divider className="mb-8" />
      <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
        {categories.map((cat) => {
          const Icon = icons[cat || ""] || GlassWater;
          return (
            <div key={cat}>
              <h3 className="text-2xl font-semibold mb-4 pb-2 flex items-center gap-2" style={{ color: GOLD_LIGHT, borderBottom: `1px solid ${GOLD}30`, fontFamily: "Georgia, serif" }}>
                <Icon className="w-6 h-6" />
                {categoryLabel(cat)}
              </h3>
              <div className="space-y-3">
                {beverages.filter((w) => w.category === cat).slice(0, 6).map((bev) => (
                  <div key={bev.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xl truncate" style={{ color: "#F5F0E8" }}>{bev.name}</p>
                    </div>
                    {bev.price && (
                      <p className="text-xl font-medium ml-4" style={{ color: GOLD }}>${parseFloat(bev.price).toFixed(2)}</p>
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
      <Bell className="w-14 h-14 mb-6" style={{ color: GOLD }} />
      <Divider className="w-64 mb-8" />
      {announcements.slice(0, 3).map((a) => (
        <div key={a.id} className="mb-8">
          <h2 className="text-5xl font-light mb-4" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>{a.title}</h2>
          <p className="text-2xl max-w-4xl leading-relaxed" style={{ color: "#F5F0E8AA" }}>{a.body}</p>
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
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(44, 24, 16, 0.85) 0%, rgba(44, 24, 16, 0.3) 30%, transparent 60%)" }} />
      <div className="absolute bottom-0 left-0 right-0 px-16 pb-12">
        <div className="flex items-center gap-4 mb-4">
          <Camera className="w-7 h-7" style={{ color: GOLD }} />
          <span className="text-lg uppercase tracking-widest" style={{ color: "#F5F0E8AA", letterSpacing: "0.2em" }}>Photo Gallery</span>
        </div>
        {photo.caption && <p className="text-3xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>{photo.caption}</p>}
        <div className="flex gap-2 mt-6">
          {photos.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentIndex ? "2rem" : "0.5rem",
                background: i === currentIndex ? GOLD : "rgba(245, 240, 232, 0.25)",
              }}
            />
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
      <Sparkles className="w-14 h-14 mb-6" style={{ color: GOLD }} />
      <h2 className="text-5xl font-light mb-3" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>Today's Specials</h2>
      <Divider className="w-64 mb-10" />
      <div className="grid grid-cols-1 gap-5 w-full max-w-4xl">
        {specials.slice(0, 4).map((s) => (
          <div key={s.id} className="rounded-lg p-6 text-center" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}18` }}>
            <h3 className="text-3xl font-semibold mb-2" style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif" }}>{s.title}</h3>
            {s.description && <p className="text-xl" style={{ color: "#F5F0E8AA" }}>{s.description}</p>}
            {(s.happyHourStart || s.happyHourEnd) && (
              <p className="text-lg mt-3" style={{ color: `${GOLD}AA` }}>
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
          <div className="absolute inset-0" style={{ background: "rgba(44, 24, 16, 0.65)" }} />
        </>
      )}
      <div className="relative z-10">
        <h2 className="text-6xl font-light mb-4" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>{slide.title}</h2>
        {slide.subtitle && <p className="text-3xl mb-6" style={{ color: GOLD_LIGHT }}>{slide.subtitle}</p>}
        {slide.bodyText && <p className="text-2xl max-w-4xl leading-relaxed" style={{ color: "#F5F0E8AA" }}>{slide.bodyText}</p>}
        {slide.bodyHtml && (
          <div className="text-2xl max-w-4xl leading-relaxed" style={{ color: "#F5F0E8AA" }} dangerouslySetInnerHTML={{ __html: slide.bodyHtml }} />
        )}
      </div>
    </div>
  );
}

function FoodMenuSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-food-menu">
      <UtensilsCrossed className="w-14 h-14 mb-6" style={{ color: GOLD }} />
      <h2 className="text-6xl font-light mb-3" style={{ color: "#F5F0E8", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        Farm-to-Table <span className="font-semibold">Dining</span>
      </h2>
      <Divider className="w-64 mb-6" />
      <p className="text-2xl max-w-3xl mb-10 leading-relaxed" style={{ color: "#F5F0E8AA", fontFamily: "Georgia, serif" }}>
        Enjoy seasonal dishes crafted from locally sourced ingredients, perfectly paired with our award-winning wines and craft beverages.
      </p>
      <div className="grid grid-cols-3 gap-8 mt-2">
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Leaf className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Seasonal Menu</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>Fresh, local ingredients</p>
        </div>
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Wine className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Wine Pairings</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>Expert recommendations</p>
        </div>
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Star className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Private Events</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>Book your celebration</p>
        </div>
      </div>
    </div>
  );
}

interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    condition: string;
    windSpeed: number;
  } | null;
  forecast: {
    date: string;
    high: number;
    low: number;
    condition: string;
    precipitation: number;
    sunrise: string;
    sunset: string;
  }[];
  location: string;
}

function getWeatherIcon(condition: string) {
  switch (condition) {
    case "Clear": return Sun;
    case "Partly Cloudy": return Cloud;
    case "Rain":
    case "Drizzle": return CloudRain;
    case "Snow": return Snowflake;
    case "Thunderstorm": return CloudRain;
    case "Foggy": return Cloud;
    default: return Sun;
  }
}

function formatForecastDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === today.toISOString().split("T")[0]) return "Today";
  if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatTimeAmPm(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function WeatherSlide({ weather }: { weather: WeatherData | undefined }) {
  const now = new Date();
  const month = now.getMonth();
  const seasonName = (month === 11 || month <= 1) ? "Winter" : month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Autumn";

  if (!weather?.current) {
    const SeasonIcon = (month === 11 || month <= 1) ? Snowflake : month <= 4 ? Sun : month <= 7 ? Sun : Leaf;
    return (
      <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-weather">
        <SeasonIcon className="w-14 h-14 mb-6" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light mb-3" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          {seasonName} at <span className="font-semibold">Nashoba Valley</span>
        </h2>
        <Divider className="w-64 mb-6" />
        <p className="text-2xl" style={{ color: "#F5F0E8AA" }}>Bolton, Massachusetts</p>
      </div>
    );
  }

  const CurrentIcon = getWeatherIcon(weather.current.condition);
  const today = weather.forecast[0];

  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-weather">
      <div className="flex items-center gap-4 mb-3">
        <CurrentIcon className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Today's Weather
        </h2>
        <span className="ml-auto text-xl" style={{ color: "#F5F0E880" }}>
          {weather.location}
        </span>
      </div>
      <Divider className="mb-8" />

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-10">
          <CurrentIcon className="w-28 h-28" style={{ color: GOLD }} />
          <div className="text-left">
            <p className="text-9xl font-light leading-none" style={{ color: "#F5F0E8" }}>
              {weather.current.temp}<span className="text-5xl align-top" style={{ color: GOLD }}>°F</span>
            </p>
            <p className="text-3xl mt-2" style={{ color: GOLD_LIGHT }}>{weather.current.condition}</p>
          </div>
        </div>

        <div className="flex items-center gap-10 mt-2">
          {today && (
            <>
              <div className="flex items-center gap-3 text-xl" style={{ color: "#F5F0E8AA" }}>
                <span style={{ color: "#EF4444AA" }}>H: {today.high}°</span>
                <span style={{ color: `${GOLD}40` }}>|</span>
                <span style={{ color: "#60A5FAAA" }}>L: {today.low}°</span>
              </div>
              <div className="flex items-center gap-3 text-xl" style={{ color: "#F5F0E8AA" }}>
                <span>Humidity: {weather.current.humidity}%</span>
                <span style={{ color: `${GOLD}40` }}>|</span>
                <span>Wind: {weather.current.windSpeed} mph</span>
              </div>
            </>
          )}
        </div>

        {today && (today.sunrise || today.sunset) && (
          <div className="flex items-center gap-6 text-lg" style={{ color: "#F5F0E870" }}>
            {today.sunrise && <span>Sunrise: {formatTimeAmPm(today.sunrise)}</span>}
            {today.sunrise && today.sunset && <span style={{ color: `${GOLD}30` }}>|</span>}
            {today.sunset && <span>Sunset: {formatTimeAmPm(today.sunset)}</span>}
          </div>
        )}

        {weather.forecast.length > 1 && (
          <div className="grid grid-cols-3 gap-6 mt-4 w-full max-w-3xl">
            {weather.forecast.map((day) => {
              const DayIcon = getWeatherIcon(day.condition);
              return (
                <div key={day.date} className="rounded-lg p-5 text-center" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}18` }}>
                  <p className="text-lg font-medium mb-2" style={{ color: GOLD_LIGHT }}>{formatForecastDay(day.date)}</p>
                  <DayIcon className="w-10 h-10 mx-auto mb-2" style={{ color: GOLD }} />
                  <p className="text-sm mb-1" style={{ color: "#F5F0E8AA" }}>{day.condition}</p>
                  <div className="flex items-center justify-center gap-3 text-lg">
                    <span style={{ color: "#EF4444AA" }}>{day.high}°</span>
                    <span style={{ color: "#60A5FAAA" }}>{day.low}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function WineClubSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-wine-club">
      <Grape className="w-16 h-16 mb-6" style={{ color: GOLD }} />
      <h2 className="text-6xl font-light mb-3" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
        Join Our <span className="font-semibold">Loyalty Program</span>
      </h2>
      <Divider className="w-64 mb-6" />
      <p className="text-2xl max-w-3xl mb-10 leading-relaxed" style={{ color: "#F5F0E8AA", fontFamily: "Georgia, serif" }}>
        Start earning delicious rewards with every visit. Unlock exclusive discounts, early event access, and members-only tastings.
      </p>
      <div className="grid grid-cols-3 gap-8 mt-2">
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Wine className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Earn Points</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>On every purchase</p>
        </div>
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Star className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Member Discounts</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>Save on every visit</p>
        </div>
        <div className="rounded-lg p-6" style={{ background: "rgba(201, 160, 80, 0.06)", border: `1px solid ${GOLD}20` }}>
          <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: GOLD }} />
          <p className="text-xl font-medium" style={{ color: "#F5F0E8" }}>Exclusive Events</p>
          <p className="mt-1" style={{ color: "#F5F0E860" }}>Members-only tastings</p>
        </div>
      </div>
    </div>
  );
}

interface TriviaQuestionData {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  explanation: string;
}

interface HistoricalFactData {
  id: number;
  fact: string;
  year: number | null;
  month: number | null;
  day: number | null;
  category: string;
}

const CATEGORY_ICONS: Record<string, { icon: typeof Wine; label: string }> = {
  winery: { icon: Wine, label: "Winery" },
  restaurant: { icon: UtensilsCrossed, label: "J's Restaurant" },
  distillery: { icon: GlassWater, label: "Distillery" },
  brewery: { icon: Beer, label: "Brewery" },
  farm: { icon: Leaf, label: "The Farm" },
};

function HistorySlide({ facts }: { facts: HistoricalFactData[] | undefined }) {
  const [currentFact, setCurrentFact] = useState<HistoricalFactData | null>(null);

  useEffect(() => {
    if (!facts || facts.length === 0) return;
    setCurrentFact(facts[Math.floor(Math.random() * facts.length)]);
  }, [facts]);

  if (!currentFact || !facts || facts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-history">
        <Landmark className="w-14 h-14 mb-6" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Our History
        </h2>
        <Divider className="w-64 mt-6" />
      </div>
    );
  }

  const catInfo = CATEGORY_ICONS[currentFact.category] || CATEGORY_ICONS.winery;
  const CatIcon = catInfo.icon;
  const now = new Date();
  const currentYear = now.getFullYear();

  const yearLabel = currentFact.year
    ? currentYear - currentFact.year === 0
      ? "This Year"
      : `${currentYear - currentFact.year} Years Ago`
    : null;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateLabel = currentFact.month && currentFact.day
    ? `${monthNames[currentFact.month - 1]} ${currentFact.day}`
    : currentFact.month
      ? monthNames[currentFact.month - 1]
      : null;

  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-history">
      <div className="flex items-center gap-4 mb-3">
        <Landmark className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-4xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Did You Know?
        </h2>
      </div>
      <Divider className="mb-8" />

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl text-center"
        >
          {(yearLabel || dateLabel) && (
            <div className="flex items-center justify-center gap-3 mb-8">
              {currentFact.year && (
                <span
                  className="text-6xl font-bold"
                  style={{ color: GOLD, fontFamily: "Georgia, serif" }}
                >
                  {currentFact.year}
                </span>
              )}
              {yearLabel && (
                <span
                  className="text-2xl font-light px-4 py-1 rounded-full"
                  style={{ color: GOLD_LIGHT, background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}
                >
                  {yearLabel}
                </span>
              )}
            </div>
          )}

          <p
            className="text-4xl font-light leading-relaxed mb-10"
            style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}
          >
            {currentFact.fact}
          </p>

          <div className="flex items-center justify-center gap-3">
            <CatIcon className="w-6 h-6" style={{ color: `${GOLD}80` }} />
            <span className="text-lg" style={{ color: `${GOLD}80` }}>{catInfo.label}</span>
            {dateLabel && (
              <>
                <span style={{ color: `${GOLD}40` }}>|</span>
                <Calendar className="w-5 h-5" style={{ color: `${GOLD}60` }} />
                <span className="text-lg" style={{ color: `${GOLD}80` }}>{dateLabel}</span>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function TriviaSlide({ questions, selectedQuestionId }: { questions: TriviaQuestionData[] | undefined; selectedQuestionId?: string }) {
  const [revealed, setRevealed] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<TriviaQuestionData | null>(null);

  useEffect(() => {
    if (!questions || questions.length === 0) return;
    setRevealed(false);

    if (selectedQuestionId && selectedQuestionId !== "auto") {
      const found = questions.find((q) => q.id === selectedQuestionId);
      setSelectedQuestion(found || questions[Math.floor(Math.random() * questions.length)]);
    } else {
      setSelectedQuestion(questions[Math.floor(Math.random() * questions.length)]);
    }

    revealTimerRef.current = setTimeout(() => {
      setRevealed(true);
    }, 8000);

    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [questions, selectedQuestionId]);

  const currentQuestion = selectedQuestion;

  if (!currentQuestion || !questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-16 text-center" data-testid="slide-trivia">
        <HelpCircle className="w-14 h-14 mb-6" style={{ color: GOLD }} />
        <h2 className="text-5xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Wine &amp; Spirits Trivia
        </h2>
        <Divider className="w-64 mt-6" />
      </div>
    );
  }

  const letters = ["A", "B", "C", "D"];

  return (
    <div className="flex flex-col h-full px-16 py-12" data-testid="slide-trivia">
      <div className="flex items-center gap-4 mb-3">
        <HelpCircle className="w-10 h-10" style={{ color: GOLD }} />
        <h2 className="text-4xl font-light" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          Nashoba Valley Trivia
        </h2>
        <span className="ml-auto text-lg" style={{ color: "#F5F0E860" }}>
          {questions.length} questions
        </span>
      </div>
      <Divider className="mb-8" />

      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-4xl font-light text-center max-w-5xl mb-12 leading-relaxed" style={{ color: "#F5F0E8", fontFamily: "Georgia, serif" }}>
          {currentQuestion.question}
        </p>

        <div className="grid grid-cols-2 gap-5 w-full max-w-5xl">
          {currentQuestion.answers.map((answer, i) => {
            const isCorrect = i === currentQuestion.correctIndex;
            const borderColor = revealed
              ? isCorrect ? "#22C55E" : "#EF444480"
              : `${GOLD}25`;
            const bgColor = revealed
              ? isCorrect ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.06)"
              : "rgba(201, 160, 80, 0.06)";

            return (
              <div
                key={i}
                className="rounded-lg p-5 flex items-center gap-4 transition-all duration-700"
                style={{ background: bgColor, border: `2px solid ${borderColor}` }}
              >
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold"
                  style={{
                    background: revealed && isCorrect ? "rgba(34, 197, 94, 0.2)" : `${GOLD}15`,
                    color: revealed && isCorrect ? "#22C55E" : GOLD_LIGHT,
                  }}
                >
                  {letters[i]}
                </span>
                <p className="text-2xl flex-1" style={{ color: "#F5F0E8" }}>{answer}</p>
                {revealed && isCorrect && <CheckCircle2 className="w-8 h-8 flex-shrink-0" style={{ color: "#22C55E" }} />}
                {revealed && !isCorrect && <XCircle className="w-7 h-7 flex-shrink-0" style={{ color: "#EF444480" }} />}
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {revealed && currentQuestion.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 rounded-lg p-6 max-w-4xl text-center"
              style={{ background: "rgba(34, 197, 94, 0.06)", border: `1px solid rgba(34, 197, 94, 0.2)` }}
            >
              <p className="text-xl leading-relaxed" style={{ color: "#F5F0E8CC" }}>
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function NashobatvDisplay() {
  const [, routeParams] = useRoute("/display/:slug");
  const slug = routeParams?.slug || "";
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const embedMode = searchParams.get("embed") === "1";

  const apiBase = slug ? `/api/public/display/${slug}` : "/api/public/display";

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideOrder, setSlideOrder] = useState<{ type: string; duration: number; data?: any }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const { data: settings } = useQuery<DisplaySettings[]>({
    queryKey: [apiBase, "settings"],
    queryFn: async () => { const r = await fetch(`${apiBase}/settings`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 60000,
  });

  const { data: slides } = useQuery<Slide[]>({
    queryKey: [apiBase, "slides"],
    queryFn: async () => { const r = await fetch(`${apiBase}/slides`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 60000,
  });

  const { data: todayEvents } = useQuery<Event[]>({
    queryKey: [apiBase, "events/today"],
    queryFn: async () => { const r = await fetch(`${apiBase}/events/today`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 300000,
  });

  const { data: upcomingEvents } = useQuery<Event[]>({
    queryKey: [apiBase, "events/upcoming"],
    queryFn: async () => { const r = await fetch(`${apiBase}/events/upcoming`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 300000,
  });

  const { data: wines } = useQuery<ProductItem[]>({
    queryKey: [apiBase, "wines"],
    queryFn: async () => { const r = await fetch(`${apiBase}/wines`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 600000,
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: [apiBase, "announcements"],
    queryFn: async () => { const r = await fetch(`${apiBase}/announcements`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 120000,
  });

  const { data: photos } = useQuery<Photo[]>({
    queryKey: [apiBase, "photos"],
    queryFn: async () => { const r = await fetch(`${apiBase}/photos`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 300000,
  });

  const { data: specials } = useQuery<DailySpecial[]>({
    queryKey: [apiBase, "specials"],
    queryFn: async () => { const r = await fetch(`${apiBase}/specials`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 300000,
  });

  const { data: weather } = useQuery<WeatherData>({
    queryKey: [apiBase, "weather"],
    queryFn: async () => { const r = await fetch(`${apiBase}/weather`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 1800000,
  });

  const { data: triviaQuestions } = useQuery<TriviaQuestionData[]>({
    queryKey: [apiBase, "trivia"],
    queryFn: async () => { const r = await fetch(`${apiBase}/trivia`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 600000,
  });

  const { data: historicalFacts } = useQuery<HistoricalFactData[]>({
    queryKey: [apiBase, "history"],
    queryFn: async () => { const r = await fetch(`${apiBase}/history`); if (!r.ok) throw new Error("Failed"); return r.json(); },
    refetchInterval: 3600000,
  });

  const buildSlideOrder = useCallback(() => {
    if (!settings) return;
    const enabledSettings = settings.filter((s) => s.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    const order: { type: string; duration: number; data?: any }[] = [];

    for (const setting of enabledSettings) {
      const t = setting.slideType;
      const dur = setting.duration;

      if (t === "welcome") {
        const welcomeConfig = setting.configData as { customMessage?: string } | null;
        order.push({ type: "welcome", duration: dur, data: welcomeConfig });
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
      } else if (t === "food_menu") {
        order.push({ type: "food_menu", duration: dur });
      } else if (t === "weather") {
        order.push({ type: "weather", duration: dur });
      } else if (t === "wine_club") {
        order.push({ type: "wine_club", duration: dur });
      } else if (t === "trivia" && triviaQuestions && triviaQuestions.length > 0) {
        const triviaConfig = setting.configData as { selectedQuestionId?: string } | null;
        order.push({ type: "trivia", duration: dur, data: triviaConfig });
      } else if (t === "history" && historicalFacts && historicalFacts.length > 0) {
        order.push({ type: "history", duration: dur });
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
  }, [settings, todayEvents, upcomingEvents, wines, announcements, photos, specials, slides, triviaQuestions, historicalFacts]);

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

  const goToSlide = useCallback((direction: "next" | "prev") => {
    if (slideOrder.length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentSlideIndex((i) => {
      if (direction === "next") return (i + 1) % slideOrder.length;
      return (i - 1 + slideOrder.length) % slideOrder.length;
    });
  }, [slideOrder.length]);

  const [showControls, setShowControls] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  const current = slideOrder[currentSlideIndex];

  const renderSlide = () => {
    if (!current) return <WelcomeSlide />;
    switch (current.type) {
      case "welcome": return <WelcomeSlide customMessage={(current.data as any)?.customMessage} />;
      case "events_today": return <EventsTodaySlide events={todayEvents || []} />;
      case "upcoming_events": return <UpcomingEventsSlide events={upcomingEvents || []} />;
      case "wine_list": return <WineListSlide wines={wines || []} />;
      case "beverage_list": return <BeverageListSlide wines={wines || []} />;
      case "announcement": return <AnnouncementSlide announcements={announcements || []} />;
      case "photo_gallery": return <PhotoGallerySlide photos={photos || []} />;
      case "daily_specials": return <DailySpecialsSlide specials={specials || []} />;
      case "food_menu": return <FoodMenuSlide />;
      case "weather": return <WeatherSlide weather={weather} />;
      case "trivia": {
        const cfg = current.data as { selectedQuestionId?: string } | null;
        return <TriviaSlide key={`trivia-${currentSlideIndex}-${Date.now()}`} questions={triviaQuestions} selectedQuestionId={cfg?.selectedQuestionId} />;
      }
      case "history": return <HistorySlide key={`history-${currentSlideIndex}-${Date.now()}`} facts={historicalFacts} />;
      case "wine_club": return <WineClubSlide />;
      case "custom": return <CustomSlide slide={current.data} />;
      default: return <WelcomeSlide />;
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${WINE_DARK} 0%, #1A0F0A 25%, #0F0A07 50%, #1A100C 75%, ${WINE_MID}40 100%)`,
        cursor: showControls ? "default" : "none",
      }}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      data-testid="nashobatv-display"
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 15 L30 25 L25 15 Z' fill='none' stroke='%23C9A050' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% 0%, ${GOLD}06 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 0% 100%, ${WINE_MID}20 0%, transparent 50%),
            radial-gradient(ellipse 80% 40% at 100% 100%, ${WINE_MID}15 0%, transparent 50%)
          `,
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlideIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ bottom: "3.5rem" }}
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      <button
        onClick={() => goToSlide("prev")}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: `${WINE_DARK}CC`,
          border: `1px solid ${GOLD}30`,
          color: "#F5F0E8AA",
        }}
        data-testid="button-slide-prev"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button
        onClick={() => goToSlide("next")}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: `${WINE_DARK}CC`,
          border: `1px solid ${GOLD}30`,
          color: "#F5F0E8AA",
        }}
        data-testid="button-slide-next"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-2 z-20">
        {slideOrder.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all duration-500"
            style={{
              width: i === currentSlideIndex ? "2rem" : "0.5rem",
              background: i === currentSlideIndex ? GOLD : "rgba(245, 240, 232, 0.15)",
            }}
          />
        ))}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-8"
        style={{
          height: "3rem",
          background: `linear-gradient(to right, ${WINE_DARK}, #1A0F0A, ${WINE_DARK})`,
          borderTop: `1px solid ${GOLD}15`,
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src="https://nashobawinery.com/wp-content/uploads/2023/04/nashoba-winery-logo-rev1-1.png"
            alt="Nashoba Valley"
            className="h-5 object-contain opacity-60"
          />
        </div>
        <p className="text-xs tracking-widest uppercase" style={{ color: "#F5F0E840", letterSpacing: "0.15em" }}>
          100 Wattaquadock Hill Road, Bolton, MA 01740
        </p>
        <p className="text-xs font-mono" style={{ color: "#F5F0E830" }}>
          {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
