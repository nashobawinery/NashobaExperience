import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Building2, Save, MapPin, Phone, Mail, Globe, 
  Facebook, Instagram, Twitter, Linkedin, ExternalLink
} from "lucide-react";

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

  const handleSave = () => {
    updateMutation.mutate(formData);
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
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Hours of operation and other details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hoursOfOperation">Hours of Operation</Label>
                  <Textarea
                    id="hoursOfOperation"
                    value={formData.hoursOfOperation || ""}
                    onChange={(e) => handleChange("hoursOfOperation", e.target.value)}
                    placeholder="Monday - Friday: 10am - 5pm&#10;Saturday - Sunday: 11am - 6pm"
                    className="min-h-[100px]"
                    data-testid="input-hours"
                  />
                </div>
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
