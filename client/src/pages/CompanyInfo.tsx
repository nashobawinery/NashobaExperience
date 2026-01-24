import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Building2, Save, MapPin, Phone, Mail, Globe, 
  Facebook, Instagram, Twitter, Linkedin, ExternalLink, Clock
} from "lucide-react";

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface WeeklyHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const TIME_OPTIONS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  monday: { isOpen: true, openTime: '10:00 AM', closeTime: '5:00 PM' },
  tuesday: { isOpen: true, openTime: '10:00 AM', closeTime: '5:00 PM' },
  wednesday: { isOpen: true, openTime: '10:00 AM', closeTime: '5:00 PM' },
  thursday: { isOpen: true, openTime: '10:00 AM', closeTime: '5:00 PM' },
  friday: { isOpen: true, openTime: '10:00 AM', closeTime: '5:00 PM' },
  saturday: { isOpen: true, openTime: '11:00 AM', closeTime: '6:00 PM' },
  sunday: { isOpen: true, openTime: '11:00 AM', closeTime: '6:00 PM' },
};

function parseHoursFromString(hoursString: string | null): WeeklyHours {
  if (!hoursString) return DEFAULT_WEEKLY_HOURS;
  try {
    const parsed = JSON.parse(hoursString);
    if (parsed.monday) return parsed as WeeklyHours;
    return DEFAULT_WEEKLY_HOURS;
  } catch {
    return DEFAULT_WEEKLY_HOURS;
  }
}

function formatHoursToString(hours: WeeklyHours): string {
  return JSON.stringify(hours);
}

interface CompanyInfo {
  id: string;
  companyName: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  email: string | null;
  supportEmail: string | null;
  website: string | null;
  mailingListUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  yelpUrl: string | null;
  tripAdvisorUrl: string | null;
  googleMapsUrl: string | null;
  hoursOfOperation: string | null;
  additionalInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

const defaultCompanyInfo: Partial<CompanyInfo> = {
  companyName: "Nashoba Valley Winery",
  tagline: "",
  description: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  supportEmail: "",
  website: "",
  mailingListUrl: "",
  facebookUrl: "",
  instagramUrl: "",
  twitterUrl: "",
  linkedinUrl: "",
  yelpUrl: "",
  tripAdvisorUrl: "",
  googleMapsUrl: "",
  hoursOfOperation: "",
  additionalInfo: "",
};

export default function CompanyInfo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<CompanyInfo>>(defaultCompanyInfo);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(DEFAULT_WEEKLY_HOURS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: companyInfo, isLoading } = useQuery<CompanyInfo | null>({
    queryKey: ["/api/platform/company-info"],
  });

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        ...defaultCompanyInfo,
        ...companyInfo,
      });
      setWeeklyHours(parseHoursFromString(companyInfo.hoursOfOperation));
    }
  }, [companyInfo]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<CompanyInfo>) => {
      const res = await apiRequest("PUT", "/api/platform/company-info", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/company-info"] });
      setHasChanges(false);
      toast({ title: "Saved", description: "Company information has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save company information.", variant: "destructive" });
    },
  });

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleDayChange = (day: keyof WeeklyHours, field: keyof DayHours, value: boolean | string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const dataWithHours = {
      ...formData,
      hoursOfOperation: formatHoursToString(weeklyHours)
    };
    updateMutation.mutate(dataWithHours);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/admin-hub")} data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Company Information
                </h1>
                <p className="text-sm text-muted-foreground">Manage your company details and social links</p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {isLoading ? (
          <Card className="animate-pulse">
            <CardContent className="py-8">
              <div className="h-8 bg-muted rounded w-1/3 mb-4" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Company name, tagline, and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName || ""}
                      onChange={(e) => handleChange("companyName", e.target.value)}
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={formData.tagline || ""}
                      onChange={(e) => handleChange("tagline", e.target.value)}
                      placeholder="Award-Winning Wines & Spirits Since 1978"
                      data-testid="input-tagline"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="A brief description of your company..."
                    className="min-h-[100px]"
                    data-testid="input-description"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Contact
                </CardTitle>
                <CardDescription>Address, phone, and email information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="100 Wattaquadock Hill Road"
                    data-testid="input-address"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="Bolton"
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state || ""}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="MA"
                      data-testid="input-state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode || ""}
                      onChange={(e) => handleChange("zipCode", e.target.value)}
                      placeholder="01740"
                      data-testid="input-zip"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="(978) 779-5521"
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> General Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="info@nashobawinery.com"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Support Email
                    </Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail || ""}
                      onChange={(e) => handleChange("supportEmail", e.target.value)}
                      placeholder="support@nashobawinery.com"
                      data-testid="input-support-email"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Web & Social Links
                </CardTitle>
                <CardDescription>Website, social media, and review site links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Website
                    </Label>
                    <Input
                      id="website"
                      value={formData.website || ""}
                      onChange={(e) => handleChange("website", e.target.value)}
                      placeholder="https://www.nashobawinery.com"
                      data-testid="input-website"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mailingListUrl" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Mailing List Signup URL
                    </Label>
                    <Input
                      id="mailingListUrl"
                      value={formData.mailingListUrl || ""}
                      onChange={(e) => handleChange("mailingListUrl", e.target.value)}
                      placeholder="Link to your newsletter signup"
                      data-testid="input-mailing-list"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" /> Facebook
                    </Label>
                    <Input
                      id="facebookUrl"
                      value={formData.facebookUrl || ""}
                      onChange={(e) => handleChange("facebookUrl", e.target.value)}
                      placeholder="https://facebook.com/..."
                      data-testid="input-facebook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Instagram
                    </Label>
                    <Input
                      id="instagramUrl"
                      value={formData.instagramUrl || ""}
                      onChange={(e) => handleChange("instagramUrl", e.target.value)}
                      placeholder="https://instagram.com/..."
                      data-testid="input-instagram"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitterUrl" className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" /> Twitter/X
                    </Label>
                    <Input
                      id="twitterUrl"
                      value={formData.twitterUrl || ""}
                      onChange={(e) => handleChange("twitterUrl", e.target.value)}
                      placeholder="https://twitter.com/..."
                      data-testid="input-twitter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </Label>
                    <Input
                      id="linkedinUrl"
                      value={formData.linkedinUrl || ""}
                      onChange={(e) => handleChange("linkedinUrl", e.target.value)}
                      placeholder="https://linkedin.com/..."
                      data-testid="input-linkedin"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="yelpUrl" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Yelp
                    </Label>
                    <Input
                      id="yelpUrl"
                      value={formData.yelpUrl || ""}
                      onChange={(e) => handleChange("yelpUrl", e.target.value)}
                      placeholder="https://yelp.com/..."
                      data-testid="input-yelp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tripAdvisorUrl" className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> TripAdvisor
                    </Label>
                    <Input
                      id="tripAdvisorUrl"
                      value={formData.tripAdvisorUrl || ""}
                      onChange={(e) => handleChange("tripAdvisorUrl", e.target.value)}
                      placeholder="https://tripadvisor.com/..."
                      data-testid="input-tripadvisor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Google Maps
                    </Label>
                    <Input
                      id="googleMapsUrl"
                      value={formData.googleMapsUrl || ""}
                      onChange={(e) => handleChange("googleMapsUrl", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      data-testid="input-google-maps"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hours of Operation
                </CardTitle>
                <CardDescription>Set your business hours for each day of the week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const dayHours = weeklyHours[key];
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-3 py-2 border-b last:border-b-0" data-testid={`hours-row-${key}`}>
                      <div className="w-28 font-medium">{label}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={dayHours.isOpen}
                          onCheckedChange={(checked) => handleDayChange(key, 'isOpen', checked)}
                          data-testid={`switch-${key}-open`}
                        />
                        <span className={`text-sm ${dayHours.isOpen ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                          {dayHours.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      {dayHours.isOpen && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={dayHours.openTime}
                            onValueChange={(value) => handleDayChange(key, 'openTime', value)}
                          >
                            <SelectTrigger className="w-[120px]" data-testid={`select-${key}-open-time`}>
                              <SelectValue placeholder="Open" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">to</span>
                          <Select
                            value={dayHours.closeTime}
                            onValueChange={(value) => handleDayChange(key, 'closeTime', value)}
                          >
                            <SelectTrigger className="w-[120px]" data-testid={`select-${key}-close-time`}>
                              <SelectValue placeholder="Close" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Other details about your company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Notes</Label>
                  <Textarea
                    id="additionalInfo"
                    value={formData.additionalInfo || ""}
                    onChange={(e) => handleChange("additionalInfo", e.target.value)}
                    placeholder="Any additional information about your company..."
                    className="min-h-[100px]"
                    data-testid="input-additional-info"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
