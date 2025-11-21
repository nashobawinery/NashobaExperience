import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface B2bAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  receiveOrderEmails: boolean;
}

async function getB2bAdmins(): Promise<B2bAdmin[]> {
  const response = await fetch("/api/b2b/admin/admins");
  if (!response.ok) {
    throw new Error("Failed to fetch admins");
  }
  return response.json();
}

async function updateAdminEmailPreference(adminId: string, receiveEmails: boolean): Promise<void> {
  const response = await fetch(`/api/b2b/admin/admins/${adminId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiveOrderEmails: receiveEmails }),
  });
  if (!response.ok) {
    throw new Error("Failed to update email preference");
  }
}

export default function B2bEmailNotificationSettings() {
  const { toast } = useToast();

  const { data: admins, isLoading } = useQuery({
    queryKey: ['/api/b2b/admin/admins'],
    queryFn: getB2bAdmins,
  });

  const updateMutation = useMutation({
    mutationFn: ({ adminId, receiveEmails }: { adminId: string; receiveEmails: boolean }) =>
      updateAdminEmailPreference(adminId, receiveEmails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/b2b/admin/admins'] });
      toast({
        title: "Success",
        description: "Email notification preferences updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email preferences",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (adminId: string, currentValue: boolean) => {
    updateMutation.mutate({ adminId, receiveEmails: !currentValue });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Email Notifications</CardTitle>
          <CardDescription>
            Configure which administrators receive order notification emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeAdmins = admins?.filter(admin => admin.active) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Email Notifications</CardTitle>
        <CardDescription>
          Select which administrators will receive email notifications when orders are placed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active administrators found</p>
          ) : (
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Administrator</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Receive Order Emails</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b last:border-0" data-testid={`row-admin-${admin.id}`}>
                      <td className="px-4 py-3 text-sm" data-testid={`text-admin-name-${admin.id}`}>
                        {admin.firstName} {admin.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground" data-testid={`text-admin-email-${admin.id}`}>
                        {admin.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={admin.receiveOrderEmails}
                            onCheckedChange={() => handleToggle(admin.id, admin.receiveOrderEmails)}
                            disabled={updateMutation.isPending}
                            data-testid={`checkbox-email-${admin.id}`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 rounded-md bg-muted/50 p-4">
            <h4 className="text-sm font-medium mb-2">Email Flow</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• When an order is placed, the customer receives an order confirmation email</li>
              <li>• The assigned sales representative (if any) receives an order notification</li>
              <li>• All administrators with "Receive Order Emails" enabled will receive a notification</li>
              <li>• Emails include order details, items, totals, and shipping information</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
