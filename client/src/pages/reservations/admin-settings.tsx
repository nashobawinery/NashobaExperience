import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Building2, Image, Link2, Plus, Pencil, Trash2, ExternalLink, Settings } from "lucide-react";
import type { ResyFooterLink, InsertResyFooterLink } from "@shared/schema";
import { insertResyFooterLinkSchema } from "@shared/schema";
import { ObjectUploader } from "@/components/ResyObjectUploader";
import { z } from "zod";

type SiteSettings = Record<string, string | null>;

const siteSettingsSchema = z.object({
  headerTitle: z.string().optional(),
  headerSubtitle: z.string().optional(),
  headerImageUrl: z.string().optional(),
  companyName: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyState: z.string().optional(),
  companyZipCode: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email().optional().or(z.literal("")),
  companyWebsite: z.string().url().optional().or(z.literal("")),
});

type SiteSettingsForm = z.infer<typeof siteSettingsSchema>;

export default function AdminSettings() {
  const { toast } = useToast();
  const [headerImageURL, setHeaderImageURL] = useState<string | null>(null);
  const [isFooterLinkDialogOpen, setIsFooterLinkDialogOpen] = useState(false);
  const [editingFooterLink, setEditingFooterLink] = useState<ResyFooterLink | null>(null);
  const [deletingFooterLink, setDeletingFooterLink] = useState<ResyFooterLink | null>(null);

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/resy/site-settings"],
  });

  const { data: footerLinks = [], isLoading: isLoadingFooterLinks } = useQuery<ResyFooterLink[]>({
    queryKey: ["/api/resy/footer-links"],
  });

  const form = useForm<SiteSettingsForm>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      headerTitle: "",
      headerSubtitle: "",
      headerImageUrl: "",
      companyName: "",
      companyAddress: "",
      companyCity: "",
      companyState: "",
      companyZipCode: "",
      companyPhone: "",
      companyEmail: "",
      companyWebsite: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        headerTitle: settings.headerTitle || "",
        headerSubtitle: settings.headerSubtitle || "",
        headerImageUrl: settings.headerImageUrl || "",
        companyName: settings.companyName || "",
        companyAddress: settings.companyAddress || "",
        companyCity: settings.companyCity || "",
        companyState: settings.companyState || "",
        companyZipCode: settings.companyZipCode || "",
        companyPhone: settings.companyPhone || "",
        companyEmail: settings.companyEmail || "",
        companyWebsite: settings.companyWebsite || "",
      });
    }
  }, [settings, form]);

  const footerLinkFormSchema = insertResyFooterLinkSchema.extend({
    name: z.string().min(1, "Link name is required"),
    url: z.string().url("Please enter a valid URL"),
  });

  const footerLinkForm = useForm<InsertResyFooterLink>({
    resolver: zodResolver(footerLinkFormSchema),
    defaultValues: {
      name: "",
      iconUrl: "",
      url: "",
      displayOrder: 0,
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("PUT", `/api/resy/site-settings/${key}`, { value });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to update settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update setting.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: SiteSettingsForm) => {
    try {
      const updates = Object.entries(data).map(([key, value]) => 
        updateSettingMutation.mutateAsync({ key, value: value || "" })
      );
      
      if (headerImageURL !== null) {
        updates.push(
          updateSettingMutation.mutateAsync({ key: "headerImageUrl", value: headerImageURL })
        );
      }
      
      await Promise.all(updates);
      
      queryClient.invalidateQueries({ queryKey: ["/api/resy/site-settings"] });
      setHeaderImageURL(null);
      
      toast({
        title: "Settings saved",
        description: "Your site settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const createFooterLinkMutation = useMutation({
    mutationFn: async (data: InsertResyFooterLink) => {
      await apiRequest("POST", "/api/resy/footer-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setIsFooterLinkDialogOpen(false);
      footerLinkForm.reset();
      toast({
        title: "Link created",
        description: "Footer link has been created successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to create footer links.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create footer link.",
          variant: "destructive",
        });
      }
    },
  });

  const updateFooterLinkMutation = useMutation({
    mutationFn: async (data: InsertResyFooterLink & { id: string }) => {
      const { id, ...rest } = data;
      await apiRequest("PATCH", `/api/resy/footer-links/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setIsFooterLinkDialogOpen(false);
      setEditingFooterLink(null);
      footerLinkForm.reset();
      toast({
        title: "Link updated",
        description: "Footer link has been updated successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to update footer links.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to update footer link.",
          variant: "destructive",
        });
      }
    },
  });

  const deleteFooterLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/resy/footer-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setDeletingFooterLink(null);
      toast({
        title: "Link deleted",
        description: "Footer link has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to delete footer links.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to delete footer link.",
          variant: "destructive",
        });
      }
    },
  });

  const handleEditFooterLink = (link: ResyFooterLink) => {
    setEditingFooterLink(link);
    footerLinkForm.reset({
      name: link.name,
      iconUrl: link.iconUrl || "",
      url: link.url,
      displayOrder: link.displayOrder,
    });
    setIsFooterLinkDialogOpen(true);
  };

  const handleAddFooterLink = () => {
    setEditingFooterLink(null);
    footerLinkForm.reset({
      name: "",
      iconUrl: "",
      url: "",
      displayOrder: footerLinks.length,
    });
    setIsFooterLinkDialogOpen(true);
  };

  const onSubmitFooterLink = (data: InsertResyFooterLink) => {
    if (editingFooterLink) {
      updateFooterLinkMutation.mutate({ ...data, id: editingFooterLink.id });
    } else {
      createFooterLinkMutation.mutate(data);
    }
  };

  const isPending = updateSettingMutation.isPending;
  const isFooterLinkPending = createFooterLinkMutation.isPending || updateFooterLinkMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-10 bg-muted rounded animate-pulse w-1/3 mb-2" />
          <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
        </div>
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your reservation site settings and footer links.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList data-testid="tabs-settings">
          <TabsTrigger value="general" data-testid="tab-general">
            <Settings className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="company" data-testid="tab-company">
            <Building2 className="w-4 h-4 mr-2" />
            Company Info
          </TabsTrigger>
          <TabsTrigger value="header" data-testid="tab-header">
            <Image className="w-4 h-4 mr-2" />
            Header
          </TabsTrigger>
          <TabsTrigger value="footer" data-testid="tab-footer">
            <Link2 className="w-4 h-4 mr-2" />
            Footer Links
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Basic configuration for your reservation site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Your Winery Name"
                            disabled={isPending}
                            data-testid="input-header-title"
                          />
                        </FormControl>
                        <FormDescription>The main title shown on your reservation page.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headerSubtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Subtitle</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Welcome to our tasting room..."
                            rows={3}
                            disabled={isPending}
                            data-testid="input-header-subtitle"
                          />
                        </FormControl>
                        <FormDescription>A brief description shown below the title.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending} data-testid="button-save-general">
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Your business contact details shown on the reservation site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Your Business Name"
                            disabled={isPending}
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="123 Main Street"
                            disabled={isPending}
                            data-testid="input-company-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="companyCity"
                      render={({ field }) => (
                        <FormItem className="col-span-2 md:col-span-1">
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="City"
                              disabled={isPending}
                              data-testid="input-company-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="MA"
                              disabled={isPending}
                              data-testid="input-company-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyZipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="01234"
                              disabled={isPending}
                              data-testid="input-company-zip"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="(555) 123-4567"
                              disabled={isPending}
                              data-testid="input-company-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="info@example.com"
                              disabled={isPending}
                              data-testid="input-company-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="companyWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            placeholder="https://www.example.com"
                            disabled={isPending}
                            data-testid="input-company-website"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending} data-testid="button-save-company">
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="header">
              <Card>
                <CardHeader>
                  <CardTitle>Header Image</CardTitle>
                  <CardDescription>The hero image displayed at the top of your reservation page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <FormLabel>Current Header Image</FormLabel>
                      {headerImageURL !== null ? (
                        <div className="mt-2">
                          {headerImageURL ? (
                            <div className="relative inline-block">
                              <img
                                src={headerImageURL}
                                alt="New header"
                                className="max-w-md rounded-lg border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => setHeaderImageURL(null)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Image will be removed when you save.</p>
                          )}
                        </div>
                      ) : settings?.headerImageUrl ? (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={settings.headerImageUrl}
                            alt="Current header"
                            className="max-w-md rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => setHeaderImageURL("")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">No header image set.</p>
                      )}
                    </div>

                    <div>
                      <FormLabel>Upload New Image</FormLabel>
                      <div className="mt-2">
                        <ObjectUploader
                          onComplete={(imageUrl) => {
                            setHeaderImageURL(imageUrl);
                            toast({
                              title: "Image selected",
                              description: "Save settings to apply the new header image.",
                            });
                          }}
                          variant="outline"
                        >
                          <Image className="w-4 h-4 mr-2" />
                          Select from Media Library
                        </ObjectUploader>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending} data-testid="button-save-header">
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Form>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Footer Links</CardTitle>
                  <CardDescription>Links displayed in the footer of your reservation page.</CardDescription>
                </div>
                <Button onClick={handleAddFooterLink} data-testid="button-add-footer-link">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFooterLinks ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : footerLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No footer links yet</p>
                  <p className="text-sm mt-1">Add links to display in your site footer.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {footerLinks
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {link.iconUrl && (
                            <img
                              src={link.iconUrl}
                              alt=""
                              className="w-6 h-6 object-contain"
                            />
                          )}
                          <div>
                            <p className="font-medium">{link.name}</p>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              {link.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditFooterLink(link)}
                            data-testid={`button-edit-footer-link-${link.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingFooterLink(link)}
                            data-testid={`button-delete-footer-link-${link.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isFooterLinkDialogOpen} onOpenChange={setIsFooterLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFooterLink ? "Edit Footer Link" : "Add Footer Link"}</DialogTitle>
            <DialogDescription>
              {editingFooterLink ? "Update the footer link details." : "Add a new link to your site footer."}
            </DialogDescription>
          </DialogHeader>
          <Form {...footerLinkForm}>
            <form onSubmit={footerLinkForm.handleSubmit(onSubmitFooterLink)} className="space-y-4">
              <FormField
                control={footerLinkForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Facebook"
                        disabled={isFooterLinkPending}
                        data-testid="input-footer-link-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={footerLinkForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://facebook.com/yourpage"
                        disabled={isFooterLinkPending}
                        data-testid="input-footer-link-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={footerLinkForm.control}
                name="iconUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="https://example.com/icon.png"
                        disabled={isFooterLinkPending}
                        data-testid="input-footer-link-icon"
                      />
                    </FormControl>
                    <FormDescription>URL to an icon image for this link.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={footerLinkForm.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min={0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isFooterLinkPending}
                        data-testid="input-footer-link-order"
                      />
                    </FormControl>
                    <FormDescription>Lower numbers appear first.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFooterLinkDialogOpen(false)}
                  disabled={isFooterLinkPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isFooterLinkPending} data-testid="button-save-footer-link">
                  {isFooterLinkPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingFooterLink ? "Update Link" : "Add Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingFooterLink} onOpenChange={() => setDeletingFooterLink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Footer Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingFooterLink?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFooterLink && deleteFooterLinkMutation.mutate(deletingFooterLink.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFooterLinkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
