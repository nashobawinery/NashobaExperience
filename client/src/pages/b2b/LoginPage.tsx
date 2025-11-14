import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useB2bAuth } from "@/contexts/B2bAuthContext";
import { LogIn, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const params = useParams<{ role: string }>();
  const role = params.role || "customer";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetch } = useB2bAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const getRoleTitle = () => {
    switch (role) {
      case "admin":
        return "Admin Login";
      case "sales-rep":
        return "Sales Representative Login";
      default:
        return "Customer Login";
    }
  };

  const getRoleEndpoint = () => {
    switch (role) {
      case "admin":
        return "/api/b2b/login/admin";
      case "sales-rep":
        return "/api/b2b/login/sales-rep";
      default:
        return "/api/b2b/login/customer";
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(getRoleEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      toast({
        title: "Login Successful",
        description: `Welcome back!`,
      });

      // Refetch user data
      await refetch();

      // Redirect based on role
      if (role === "admin") {
        setLocation("/b2b/admin");
      } else if (role === "sales-rep") {
        setLocation("/b2b/sales-rep");
      } else {
        setLocation("/b2b/catalog");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12">
      <div className="w-full max-w-md px-4">
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
          <CardHeader className="text-center">
            <LogIn className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle className="font-serif text-2xl">{getRoleTitle()}</CardTitle>
            <CardDescription>
              Enter your credentials to access the wholesale portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@business.com"
                          data-testid="input-email"
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter your password"
                          data-testid="input-password"
                          autoComplete="current-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                  data-testid="button-login"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>

                {role === "customer" && (
                  <div className="pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Don't have an account yet?
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/b2b")}
                      data-testid="button-register"
                    >
                      Register for Wholesale Access
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
