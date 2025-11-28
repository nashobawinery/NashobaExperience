import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Store, MapPin, User, Phone, Mail, FileText, AlertCircle } from "lucide-react";
import logoUrl from "@assets/NVW logo no background_1762469370864.png";

const registrationSchema = z.object({
  // Business Information
  accountName: z.string().min(2, "Business name must be at least 2 characters"),
  customerType: z.enum(["retail_liquor", "restaurant", "private_club", "other"], {
    required_error: "Please select a business type",
  }),
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
  
  // Contact Information
  primaryContactName: z.string().min(2, "Contact name must be at least 2 characters"),
  primaryContactRole: z.string().optional(),
  emailAddress: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  altPhoneNumber: z.string().optional(),
  
  // Business Address
  billingAddress: z.string().min(5, "Street address is required"),
  billingCity: z.string().min(2, "City is required"),
  billingState: z.string().min(2, "State is required"),
  billingZipCode: z.string().min(5, "ZIP code is required"),
  
  // Location Questions
  storeLocationSameAsBusiness: z.enum(["yes", "no"], {
    required_error: "Please answer this question",
  }),
  hasMultipleLocations: z.enum(["yes", "no"]).optional(),
  
  // Single different store location (if applicable)
  storeName: z.string().optional(),
  storeAddress: z.string().optional(),
  storeCity: z.string().optional(),
  storeState: z.string().optional(),
  storeZipCode: z.string().optional(),
  storePhone: z.string().optional(),
  storeEmail: z.string().optional(),
  
  // Multiple locations note
  multipleLocationsNote: z.string().optional(),
  
  // Additional
  notes: z.string().optional(),
  acceptsMarketing: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // If store location is different and not multiple locations, require store details
  if (data.storeLocationSameAsBusiness === "no" && data.hasMultipleLocations === "no") {
    if (!data.storeName || data.storeName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store name is required",
        path: ["storeName"],
      });
    }
    if (!data.storeAddress || data.storeAddress.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store address is required",
        path: ["storeAddress"],
      });
    }
    if (!data.storeCity || data.storeCity.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store city is required",
        path: ["storeCity"],
      });
    }
    if (!data.storeState || data.storeState.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store state is required",
        path: ["storeState"],
      });
    }
    if (!data.storeZipCode || data.storeZipCode.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store ZIP code is required",
        path: ["storeZipCode"],
      });
    }
  }
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export default function RegistrationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      accountName: "",
      customerType: undefined,
      licenseNumber: "",
      taxId: "",
      primaryContactName: "",
      primaryContactRole: "",
      emailAddress: "",
      phoneNumber: "",
      altPhoneNumber: "",
      billingAddress: "",
      billingCity: "",
      billingState: "MA",
      billingZipCode: "",
      storeLocationSameAsBusiness: undefined,
      hasMultipleLocations: undefined,
      storeName: "",
      storeAddress: "",
      storeCity: "",
      storeState: "MA",
      storeZipCode: "",
      storePhone: "",
      storeEmail: "",
      multipleLocationsNote: "",
      notes: "",
      acceptsMarketing: false,
    },
  });

  const storeLocationSameAsBusiness = form.watch("storeLocationSameAsBusiness");
  const hasMultipleLocations = form.watch("hasMultipleLocations");
  const customerType = form.watch("customerType");

  const onSubmit = async (data: RegistrationForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/b2b/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      toast({
        title: "Application Submitted!",
        description: "Your wholesale account application is being reviewed. You'll receive an email once approved.",
      });

      // Redirect to pricing page
      setTimeout(() => {
        setLocation("/b2b");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 md:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/b2b")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pricing
        </Button>

        <Card>
          <CardHeader className="text-center pb-2">
            <img 
              src={logoUrl} 
              alt="Nashoba Valley Winery" 
              className="h-20 w-auto mx-auto mb-4"
            />
            <CardTitle className="font-serif text-2xl md:text-3xl">Wholesale Account Application</CardTitle>
            <CardDescription className="text-base">
              Complete the form below to apply for a wholesale account with Nashoba Valley Winery
            </CardDescription>
            
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                <span className="font-semibold text-primary">Thank you for considering joining the Nashoba Valley Winery family!</span>
                {" "}We're excited about the opportunity to partner with you. Our team is here to help you build our brand 
                and bring the authentic taste of New England to your customers.
              </p>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-3">
                As a partner, you'll be among the stores and restaurants truly committed to local flavors, proudly pouring and 
                serving beverages crafted by your neighbors. Your dedication to our farm helps keep our community thriving, 
                one sip at a time. <span className="font-semibold text-primary">Every dollar your customers spend stays in our local economy.</span>
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Section 1: Business Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Store className="h-5 w-5" />
                    <h3>Business Information</h3>
                  </div>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Your Store or Restaurant Name"
                              data-testid="input-account-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-customer-type">
                                <SelectValue placeholder="Select type..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="retail_liquor">Retail Liquor Store</SelectItem>
                              <SelectItem value="restaurant">Restaurant / Bar</SelectItem>
                              <SelectItem value="private_club">Private Club</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="licenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Liquor License Number
                            {(customerType === "retail_liquor" || customerType === "restaurant") && " *"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="License #"
                              data-testid="input-license-number"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Required for retail liquor stores and restaurants
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Federal Tax ID (EIN)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="XX-XXXXXXX"
                              data-testid="input-tax-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <User className="h-5 w-5" />
                    <h3>Contact Information</h3>
                  </div>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Contact Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Full Name"
                              data-testid="input-contact-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryContactRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role / Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Owner, Manager, Buyer"
                              data-testid="input-contact-role"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emailAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="email@business.com"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Login credentials will be sent to this address
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="(555) 123-4567"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="altPhoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="(555) 987-6543"
                              data-testid="input-alt-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 3: Business Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Mail className="h-5 w-5" />
                    <h3>Business / Billing Address</h3>
                  </div>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="billingAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="123 Main Street"
                              data-testid="input-billing-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billingCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="City"
                              data-testid="input-billing-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billingState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-billing-state">
                                  <SelectValue placeholder="State" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state.value} value={state.value}>
                                    {state.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billingZipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="01234"
                                data-testid="input-billing-zip"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Store Location */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <MapPin className="h-5 w-5" />
                    <h3>Store Location</h3>
                  </div>
                  <Separator />
                  
                  {/* Question 1 */}
                  <FormField
                    control={form.control}
                    name="storeLocationSameAsBusiness"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">
                          Is the location of your store or restaurant the same as the business address above? *
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="location-yes" data-testid="radio-location-same-yes" />
                              <Label htmlFor="location-yes" className="cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="location-no" data-testid="radio-location-same-no" />
                              <Label htmlFor="location-no" className="cursor-pointer">No</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Question 2 - Only shown if location is different */}
                  {storeLocationSameAsBusiness === "no" && (
                    <FormField
                      control={form.control}
                      name="hasMultipleLocations"
                      render={({ field }) => (
                        <FormItem className="space-y-3 pt-2">
                          <FormLabel className="text-base">
                            Do you have multiple locations that will be offering Nashoba Adult Beverages? *
                          </FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="multiple-yes" data-testid="radio-multiple-locations-yes" />
                                <Label htmlFor="multiple-yes" className="cursor-pointer">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="multiple-no" data-testid="radio-multiple-locations-no" />
                                <Label htmlFor="multiple-no" className="cursor-pointer">No, just one location</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Single Store Location Form - Only if different location and NOT multiple */}
                  {storeLocationSameAsBusiness === "no" && hasMultipleLocations === "no" && (
                    <div className="space-y-4 pt-4 p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Please provide your store location details:
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="storeName"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Store Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Store or Restaurant Name"
                                  data-testid="input-store-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="storeAddress"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Street Address *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="456 Store Street"
                                  data-testid="input-store-address"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="storeCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="City"
                                  data-testid="input-store-city"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="storeState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-store-state">
                                      <SelectValue placeholder="State" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {US_STATES.map((state) => (
                                      <SelectItem key={state.value} value={state.value}>
                                        {state.value}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="storeZipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="01234"
                                    data-testid="input-store-zip"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="storePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Store Phone</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="tel"
                                  placeholder="(555) 123-4567"
                                  data-testid="input-store-phone"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="storeEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Store Email</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="store@business.com"
                                  data-testid="input-store-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Multiple Locations Note */}
                  {storeLocationSameAsBusiness === "no" && hasMultipleLocations === "yes" && (
                    <div className="space-y-4 pt-4 p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p>
                          Great! After your account is approved, we'll work with you to add all your store locations. 
                          Please provide any details that would be helpful below:
                        </p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="multipleLocationsNote"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location Details (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="e.g., We have 3 locations in Boston, Cambridge, and Somerville..."
                                rows={3}
                                data-testid="input-multiple-locations-note"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Section 5: Additional Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <FileText className="h-5 w-5" />
                    <h3>Additional Information</h3>
                  </div>
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes or Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Any additional information you'd like us to know..."
                            rows={3}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="acceptsMarketing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-marketing"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Keep me updated on new products and promotions
                          </FormLabel>
                          <FormDescription>
                            We'll send occasional emails about new arrivals, seasonal offerings, and special promotions.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    * Required fields. Your application will be reviewed within 1-2 business days.
                    You'll receive an email with your login credentials once approved.
                  </p>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                    data-testid="button-submit-registration"
                  >
                    {isSubmitting ? "Submitting Application..." : "Submit Application"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
