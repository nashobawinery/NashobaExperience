import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Music,
  MapPin,
  Clock,
  Globe,
  ExternalLink,
  Send,
  CheckCircle,
  AlertTriangle,
  Search,
  Loader2,
  Calendar,
  Code,
  Copy,
  Check,
} from "lucide-react";

interface MusicCalendarEvent {
  id: number;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  musicianId: number | null;
  musicianName: string | null;
  musicianGenre: string | null;
  musicianBio: string | null;
  musicianImageUrl: string | null;
  musicianWebsiteUrl: string | null;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function groupByMonth(events: MusicCalendarEvent[]): Record<string, MusicCalendarEvent[]> {
  const groups: Record<string, MusicCalendarEvent[]> = {};
  for (const event of events) {
    const [year, month] = event.eventDate.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

export default function MusicCalendar() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const isEmbed = params.get("embed") === "1";

  const { data: events = [], isLoading } = useQuery<MusicCalendarEvent[]>({
    queryKey: ["/api/public/music-calendar"],
  });

  const [submitted, setSubmitted] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [formData, setFormData] = useState({
    musicianName: "",
    genre: "",
    bio: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    message: "",
    songList: "",
    proAcknowledged: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/public/musician-submit", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Submission Received",
        description: "Thank you! We will review your submission and get back to you.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proAcknowledged) {
      toast({
        title: "Policy Acknowledgment Required",
        description: "You must acknowledge the PRO licensing policy before submitting.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.songList.trim()) {
      toast({
        title: "Song List Required",
        description: "Please provide a list of songs/artists you intend to play.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.musicianName.trim() || !formData.contactEmail.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide your name and email address.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const grouped = groupByMonth(events);

  return (
    <div className={`min-h-screen bg-background ${isEmbed ? "" : "pb-12"}`}>
      {!isEmbed && (
        <header className="border-b bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Music className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-serif font-semibold" data-testid="text-page-title">
                  Live Music at Nashoba Valley Winery
                </h1>
                <p className="text-sm text-muted-foreground">
                  Upcoming performances and events
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-home">
              Back to Home
            </Button>
          </div>
        </header>
      )}

      {!isEmbed && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={showEmbed ? "default" : "outline"}
              onClick={() => setShowEmbed(!showEmbed)}
              data-testid="button-toggle-embed"
            >
              <Code className="h-4 w-4 mr-2" />
              Embed on Your Website
            </Button>
          </div>
          {showEmbed && (
            <Card className="mt-3">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Copy the code below and paste it into your website HTML to embed the Live Music calendar.
                </p>
                <div className="relative">
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all" data-testid="text-embed-code">
{`<iframe src="${window.location.origin}/music?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`}
                  </pre>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/music?embed=1" width="100%" height="800" frameborder="0" style="border:none;"></iframe>`);
                      setCopiedEmbed(true);
                      setTimeout(() => setCopiedEmbed(false), 2000);
                    }}
                    data-testid="button-copy-embed"
                  >
                    {copiedEmbed ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2" data-testid="text-no-events">No Upcoming Performances</h2>
            <p className="text-muted-foreground">
              Check back soon for upcoming live music events.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month} className="mb-10">
              <h2
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                data-testid={`text-month-${month.replace(/\s/g, "-")}`}
              >
                <Calendar className="h-5 w-5 text-muted-foreground" />
                {month}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthEvents.map((event) => (
                  <Card key={event.id} data-testid={`card-music-event-${event.id}`}>
                    {(event.imageUrl || event.musicianImageUrl) && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-md">
                        <img
                          src={event.imageUrl || event.musicianImageUrl || ""}
                          alt={event.musicianName || event.title}
                          className="w-full h-full object-cover"
                          data-testid={`img-event-${event.id}`}
                        />
                      </div>
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-semibold text-base" data-testid={`text-musician-name-${event.id}`}>
                          {event.musicianName || event.title}
                        </h3>
                        {event.musicianGenre && (
                          <Badge variant="secondary" data-testid={`badge-genre-${event.id}`}>
                            {event.musicianGenre}
                          </Badge>
                        )}
                      </div>

                      {event.title && event.musicianName && event.title !== event.musicianName && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-event-title-${event.id}`}>
                          {event.title}
                        </p>
                      )}

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span data-testid={`text-date-${event.id}`}>{formatDate(event.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span data-testid={`text-time-${event.id}`}>
                            {formatTime(event.startTime)}
                            {event.endTime ? ` – ${formatTime(event.endTime)}` : ""}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span data-testid={`text-location-${event.id}`}>{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${event.id}`}>
                          {event.description}
                        </p>
                      )}

                      {event.isFeatured && (
                        <Badge variant="default" data-testid={`badge-featured-${event.id}`}>
                          Featured
                        </Badge>
                      )}

                      {event.musicianWebsiteUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          asChild
                          data-testid={`button-website-${event.id}`}
                        >
                          <a
                            href={event.musicianWebsiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Globe className="h-4 w-4 mr-2" />
                            Visit Website
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        <div className="mt-16 border-t pt-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-serif font-semibold mb-2" data-testid="text-submission-heading">
              Play at Nashoba Valley Winery
            </h2>
            <p className="text-muted-foreground mb-6">
              Looking to play music at one of our events? Please read the following information and then fill out the form below.
            </p>

            <Card className="mb-8">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <h3 className="font-semibold text-base" data-testid="text-pro-notice-heading">
                    PRO Licensing Notice
                  </h3>
                </div>

                <div className="text-sm space-y-3 text-muted-foreground" data-testid="text-pro-notice-body">
                  <p>
                    Live music played at venues, like Nashoba Valley Winery, require the host location to pay a royalty to a PRO Organization for using copyrighted songs that the PRO represents. If you only play original music, then you do not have to worry about checking your music because you own the rights to your music.
                  </p>
                  <p>
                    PROs collect public performance royalties. When a song is played in public at our venue, the venue is required to be licensed to play that music. The PRO collects those payments, and distributes them to the rights holders.
                  </p>
                  <p>
                    Who are the PROs? The biggest names in PROs in the United States are ASCAP, BMI, and SESAC and each represent different artists. <strong>Nashoba Valley is currently licensed by ASCAP and BMI</strong> to play the music of artists that they represent. According to The New York Times, ASCAP and BMI licensing represents more than 95 percent of the songs available to businesses in the United States so we are confident that your performance should not be unduly inconvenienced by a slight modification to your play list.
                  </p>
                  <p className="font-medium text-foreground">
                    We are not registered with SESAC and so it is important for us to manage the music played at our venue. No one is allowed to play any music of a musician that is represented by SESAC.
                  </p>
                  <p>
                    To play at Nashoba, you must agree to do a search of the music you intend to play and restrict your songs to artists represented by ASCAP or BMI. You can search songs and artists allowed or not allowed by either of the search buttons below. You must provide us with a list of the songs and the PRO company representing the artist. It should take only a few minutes to search.
                  </p>
                  <p>
                    Thanks for working with us to preserve the rights of artists. Your cooperation is truly appreciated. <strong>We have found the safest approach to playing music that is licensed to be performed on our property is to only play music that is listed as ASCAP 100%</strong> — Works in the ASCAP Repertory that are 100% controlled by ASCAP and its members.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="outline" asChild data-testid="button-search-ascap">
                    <a href="https://www.ascap.com/repertory" target="_blank" rel="noopener noreferrer">
                      <Search className="h-4 w-4 mr-2" />
                      Search ASCAP
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" asChild data-testid="button-search-bmi">
                    <a href="https://repertoire.bmi.com/" target="_blank" rel="noopener noreferrer">
                      <Search className="h-4 w-4 mr-2" />
                      Search BMI
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                  <Button variant="outline" asChild data-testid="button-search-sesac">
                    <a href="https://www.sesac.com/repertory/" target="_blank" rel="noopener noreferrer">
                      <Search className="h-4 w-4 mr-2" />
                      Search SESAC
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {submitted ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-submission-success">
                    Submission Received!
                  </h3>
                  <p className="text-muted-foreground">
                    Thank you for your interest in performing at Nashoba Valley Winery. We will review your submission and get back to you soon.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        musicianName: "",
                        genre: "",
                        bio: "",
                        websiteUrl: "",
                        contactEmail: "",
                        contactPhone: "",
                        message: "",
                        songList: "",
                        proAcknowledged: false,
                      });
                    }}
                    data-testid="button-submit-another"
                  >
                    Submit Another Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-base mb-4" data-testid="text-form-heading">
                    Musician Submission Form
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="musicianName">Name *</Label>
                        <Input
                          id="musicianName"
                          value={formData.musicianName}
                          onChange={(e) => updateField("musicianName", e.target.value)}
                          required
                          data-testid="input-musician-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="genre">Genre</Label>
                        <Input
                          id="genre"
                          value={formData.genre}
                          onChange={(e) => updateField("genre", e.target.value)}
                          data-testid="input-genre"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => updateField("bio", e.target.value)}
                        rows={3}
                        data-testid="input-bio"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Website</Label>
                        <Input
                          id="websiteUrl"
                          type="url"
                          value={formData.websiteUrl}
                          onChange={(e) => updateField("websiteUrl", e.target.value)}
                          placeholder="https://"
                          data-testid="input-website"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Email *</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => updateField("contactEmail", e.target.value)}
                          required
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={(e) => updateField("contactPhone", e.target.value)}
                        data-testid="input-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => updateField("message", e.target.value)}
                        rows={2}
                        data-testid="input-message"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="songList">
                        Song List / Artists You Plan to Play *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Please list the songs and/or artists you intend to perform, along with which PRO (ASCAP or BMI) represents them.
                      </p>
                      <Textarea
                        id="songList"
                        value={formData.songList}
                        onChange={(e) => updateField("songList", e.target.value)}
                        rows={5}
                        required
                        placeholder={"Example:\nSweet Caroline - Neil Diamond (ASCAP)\nHotel California - Eagles (ASCAP)\nPurple Rain - Prince (ASCAP)"}
                        data-testid="input-song-list"
                      />
                    </div>

                    <div className="flex items-start gap-3 p-4 border rounded-md bg-muted/30">
                      <Checkbox
                        id="proAcknowledged"
                        checked={formData.proAcknowledged}
                        onCheckedChange={(checked) =>
                          updateField("proAcknowledged", checked === true)
                        }
                        data-testid="checkbox-pro-acknowledged"
                      />
                      <Label
                        htmlFor="proAcknowledged"
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        I acknowledge the PRO licensing policy and confirm that my song list only includes music represented by ASCAP or BMI
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitMutation.isPending}
                      data-testid="button-submit-musician"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
