import { useState } from "react";
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
import { Loader2, Upload, X, Building2, Image, Link2, Plus, Pencil, Trash2, GripVertical, ExternalLink } from "lucide-react";
import type { SiteSettings, InsertSiteSettings, FooterLink, InsertFooterLink } from "@shared/schema";
import { insertSiteSettingsSchema, insertFooterLinkSchema } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { z } from "zod";

export default function AdminSettings() {
  const { toast } = useToast();
  const [headerImageURL, setHeaderImageURL] = useState<string | null>(null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [isFooterLinkDialogOpen, setIsFooterLinkDialogOpen] = useState(false);
  const [editingFooterLink, setEditingFooterLink] = useState<FooterLink | null>(null);
  const [deletingFooterLink, setDeletingFooterLink] = useState<FooterLink | null>(null);

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: footerLinks = [], isLoading: isLoadingFooterLinks } = useQuery<FooterLink[]>({
    queryKey: ["/api/resy/footer-links"],
  });

  const form = useForm<InsertSiteSettings>({
    resolver: zodResolver(insertSiteSettingsSchema),
    values: settings ? {
      headerTitle: settings.headerTitle,
      headerSubtitle: settings.headerSubtitle,
      headerImageUrl: settings.headerImageUrl || "",
      companyName: settings.companyName || "",
      companyAddress: settings.companyAddress || "",
      companyCity: settings.companyCity || "",
      companyState: settings.companyState || "",
      companyZipCode: settings.companyZipCode || "",
      companyPhone: settings.companyPhone || "",
      companyEmail: settings.companyEmail || "",
      companyWebsite: settings.companyWebsite || "",
    } : {
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

  const footerLinkFormSchema = insertFooterLinkSchema.extend({
    name: z.string().min(1, "Link name is required"),
    url: z.string().url("Please enter a valid URL"),
  });

  const footerLinkForm = useForm<InsertFooterLink>({
    resolver: zodResolver(footerLinkFormSchema),
    defaultValues: {
      name: "",
      iconUrl: "",
      url: "",
      displayOrder: 0,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertSiteSettings) => {
      if (headerImageURL !== null) {
        await apiRequest("PUT", "/api/settings/image", { headerImageURL: headerImageURL || "" });
      }
      
      const settingsData = { ...data };
      if (headerImageURL !== null) {
        delete settingsData.headerImageUrl;
      }
      await apiRequest("PUT", "/api/settings", settingsData);
      
      setHeaderImageURL(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Site settings have been updated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createFooterLinkMutation = useMutation({
    mutationFn: async (data: InsertFooterLink) => {
      await apiRequest("POST", "/api/resy/footer-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setIsFooterLinkDialogOpen(false);
      footerLinkForm.reset();
      toast({
        title: "Link Created",
        description: "Footer link has been created successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFooterLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFooterLink> }) => {
      await apiRequest("PUT", `/api/footer-links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setIsFooterLinkDialogOpen(false);
      setEditingFooterLink(null);
      footerLinkForm.reset();
      toast({
        title: "Link Updated",
        description: "Footer link has been updated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFooterLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/footer-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resy/footer-links"] });
      setDeletingFooterLink(null);
      toast({
        title: "Link Deleted",
        description: "Footer link has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertSiteSettings) => {
    updateMutation.mutate(data);
  };

  const handleOpenFooterLinkDialog = (link?: FooterLink) => {
    if (link) {
      setEditingFooterLink(link);
      footerLinkForm.reset({
        name: link.name,
        iconUrl: link.iconUrl || "",
        url: link.url,
        displayOrder: link.displayOrder,
      });
    } else {
      setEditingFooterLink(null);
      footerLinkForm.reset({
        name: "",
        iconUrl: "",
        url: "",
        displayOrder: footerLinks.length,
      });
    }
    setIsFooterLinkDialogOpen(true);
  };

  const handleFooterLinkSubmit = (data: InsertFooterLink) => {
    if (editingFooterLink) {
      updateFooterLinkMutation.mutate({ id: editingFooterLink.id, data });
    } else {
      createFooterLinkMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold mb-2">Site Settings</h1>
        <p className="text-muted-foreground">
          Manage your website's branding, company information, and footer links
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2" data-testid="tab-branding">
            <Image className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2" data-testid="tab-company">
            <Building2 className="w-4 h-4" />
            Company Info
          </TabsTrigger>
          <TabsTrigger value="footer" className="gap-2" data-testid="tab-footer">
            <Link2 className="w-4 h-4" />
            Footer
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Header Settings</CardTitle>
                  <CardDescription>
                    Customize the main header that appears on your landing page
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="headerTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nashoba Valley Winery" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-header-title"
                          />
                        </FormControl>
                        <FormDescription>
                          The main title displayed in the header
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headerSubtitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Subtitle *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Experience the finest wines and dining" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-header-subtitle"
                            rows={2}
                          />
                        </FormControl>
                        <FormDescription>
                          A brief subtitle or tagline for your winery
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 rounded-md border p-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Header Background Image</h3>
                      <p className="text-sm text-muted-foreground mb-4">Upload header background image (max 10MB)</p>
                    </div>

                    <div className="space-y-3">
                      {settings?.headerImageUrl && !headerImageURL ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={settings.headerImageUrl} 
                            alt="Header" 
                            className="w-32 h-20 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setHeaderImageURL("");
                              toast({
                                title: "Image will be removed",
                                description: "Save the form to confirm deletion",
                              });
                            }}
                            data-testid="button-delete-header-image"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : uploadingHeader ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </div>
                      ) : headerImageURL ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={headerImageURL} 
                            alt="Header" 
                            className="w-32 h-20 object-cover rounded-md border"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setHeaderImageURL(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={10485760}
                          onGetUploadParameters={async () => {
                            setUploadingHeader(true);
                            const response = await apiRequest("POST", "/api/objects/upload", {});
                            const data = await response.json();
                            return { method: "PUT" as const, url: data.uploadURL };
                          }}
                          onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                            setUploadingHeader(false);
                            if (result.successful && result.successful.length > 0) {
                              const uploadedFile = result.successful[0];
                              if (uploadedFile.uploadURL) {
                                setHeaderImageURL(uploadedFile.uploadURL);
                                toast({
                                  title: "Image Uploaded",
                                  description: "Header image uploaded successfully",
                                });
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Upload className="w-3 h-3 mr-2" />
                          Upload Header Image
                        </ObjectUploader>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Your business contact details and address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nashoba Valley Winery" 
                            {...field} 
                            value={field.value || ""}
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
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="100 Winery Lane" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-company-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="companyCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Bolton" 
                              {...field} 
                              value={field.value || ""}
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
                              placeholder="MA" 
                              {...field} 
                              value={field.value || ""}
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
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="01740" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-company-zip"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(978) 779-5521" 
                              {...field} 
                              value={field.value || ""}
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="info@nashobavalleywinery.com" 
                              {...field} 
                              value={field.value || ""}
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
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input 
                            type="url"
                            placeholder="https://www.nashobavalleywinery.com" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-company-website"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-save-company-settings"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </TabsContent>
          </form>
        </Form>

        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Footer Links</CardTitle>
                  <CardDescription>
                    Manage links that appear in the footer across all pages
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => handleOpenFooterLinkDialog()}
                  data-testid="button-add-footer-link"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFooterLinks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : footerLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No footer links configured yet.</p>
                  <p className="text-sm">Click "Add Link" to create your first footer link.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {footerLinks.sort((a, b) => a.displayOrder - b.displayOrder).map((link) => (
                    <div 
                      key={link.id} 
                      className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate"
                      data-testid={`footer-link-${link.id}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      
                      {link.iconUrl ? (
                        <img 
                          src={link.iconUrl} 
                          alt={link.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Link2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{link.name}</p>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                        >
                          {link.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenFooterLinkDialog(link)}
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
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      <Dialog open={isFooterLinkDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsFooterLinkDialogOpen(false);
          setEditingFooterLink(null);
          footerLinkForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFooterLink ? "Edit Footer Link" : "Add Footer Link"}</DialogTitle>
            <DialogDescription>
              {editingFooterLink 
                ? "Update the details for this footer link" 
                : "Create a new link that will appear in the site footer"}
            </DialogDescription>
          </DialogHeader>
          <Form {...footerLinkForm}>
            <form onSubmit={footerLinkForm.handleSubmit(handleFooterLinkSubmit)} className="space-y-4">
              <FormField
                control={footerLinkForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Facebook" 
                        {...field}
                        data-testid="input-footer-link-name"
                      />
                    </FormControl>
                    <FormDescription>
                      The text displayed for this link
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={footerLinkForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link URL *</FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        placeholder="https://facebook.com/yourpage" 
                        {...field}
                        data-testid="input-footer-link-url"
                      />
                    </FormControl>
                    <FormDescription>
                      The destination URL when clicked
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={footerLinkForm.control}
                name="iconUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon/Thumbnail URL</FormLabel>
                    <FormControl>
                      <Input 
                        type="url"
                        placeholder="https://example.com/icon.png" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-footer-link-icon"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional icon or thumbnail image URL
                    </FormDescription>
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
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-footer-link-order"
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first in the footer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFooterLinkDialogOpen(false);
                    setEditingFooterLink(null);
                    footerLinkForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createFooterLinkMutation.isPending || updateFooterLinkMutation.isPending}
                  data-testid="button-save-footer-link"
                >
                  {(createFooterLinkMutation.isPending || updateFooterLinkMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingFooterLink ? (
                    "Update Link"
                  ) : (
                    "Add Link"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingFooterLink} onOpenChange={(open) => !open && setDeletingFooterLink(null)}>
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
              data-testid="button-confirm-delete-footer-link"
            >
              {deleteFooterLinkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
