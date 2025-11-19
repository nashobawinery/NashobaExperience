import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Mail, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TierCommitmentData {
  id: string;
  accountName: string;
  emailAddress: string;
  tierName: string | null;
  discountPercentage: string | null;
  commitmentCases: number | null;
  commitmentStartDate: string | null;
  commitmentEndDate: Date | null;
  casesPurchased: number;
  casesRemaining: number;
  monthsLeft: number | null;
  percentComplete: number;
}

export default function TierCommitmentPage() {
  const { toast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<TierCommitmentData | null>(null);
  const [newStartDate, setNewStartDate] = useState("");
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState<Set<string>>(new Set());

  const { data: commitmentData = [], isLoading, refetch } = useQuery<TierCommitmentData[]>({
    queryKey: ["/api/b2b/admin/tier-commitment-report"],
  });

  const updateStartDateMutation = useMutation({
    mutationFn: async ({ customerId, startDate }: { customerId: string; startDate: string }) => {
      const res = await apiRequest("PATCH", `/api/b2b/admin/customers/${customerId}/commitment-start`, {
        commitmentStartDate: startDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2b/admin/tier-commitment-report"] });
      toast({
        title: "Success",
        description: "Commitment start date updated successfully",
      });
      setShowDateDialog(false);
      setSelectedCustomer(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update commitment start date",
        variant: "destructive",
      });
    },
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const res = await apiRequest("POST", "/api/b2b/admin/send-renewal-reminders", { customerIds });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: `Sent ${data.totalSent} reminder emails. ${data.totalFailed > 0 ? `${data.totalFailed} failed.` : ""}`,
      });
      setSelectedForEmail(new Set());
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminder emails",
        variant: "destructive",
      });
    },
  });

  const handleSetStartDate = (customer: TierCommitmentData) => {
    setSelectedCustomer(customer);
    setNewStartDate(customer.commitmentStartDate || "");
    setShowDateDialog(true);
  };

  const handleUpdateStartDate = () => {
    if (selectedCustomer && newStartDate) {
      const isoDate = new Date(newStartDate).toISOString();
      updateStartDateMutation.mutate({
        customerId: selectedCustomer.id,
        startDate: isoDate,
      });
    }
  };

  const handleToggleEmailSelection = (customerId: string) => {
    const newSelection = new Set(selectedForEmail);
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId);
    } else {
      newSelection.add(customerId);
    }
    setSelectedForEmail(newSelection);
  };

  const handleSendReminders = () => {
    if (selectedForEmail.size === 0) {
      toast({
        title: "No customers selected",
        description: "Please select at least one customer to send reminders",
        variant: "destructive",
      });
      return;
    }
    sendRemindersMutation.mutate(Array.from(selectedForEmail));
  };

  const tiersWithCommitments = commitmentData.filter(
    (c) => c.commitmentCases && c.commitmentCases > 0
  );

  const needingAttention = tiersWithCommitments.filter(
    (c) => c.casesRemaining > 0 && c.monthsLeft !== null && c.monthsLeft <= 3
  );

  const onTrack = tiersWithCommitments.filter(
    (c) => c.percentComplete >= 75 || c.casesRemaining === 0
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin" data-testid="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tier-commitment-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">
            Tier Commitment Report
          </h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Track customer tier commitments and renewal status
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {selectedForEmail.size > 0 && (
            <Button
              onClick={handleSendReminders}
              disabled={sendRemindersMutation.isPending}
              data-testid="button-send-reminders"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Reminders ({selectedForEmail.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Customers with Commitments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-customers">
              {tiersWithCommitments.length}
            </div>
            <p className="text-xs text-muted-foreground">Active tier 3 & 4 customers</p>
          </CardContent>
        </Card>

        <Card data-testid="card-needing-attention">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needing Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-needing-attention">
              {needingAttention.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Behind schedule with &lt;3 months left
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-on-track">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-on-track">
              {onTrack.length}
            </div>
            <p className="text-xs text-muted-foreground">75%+ complete or finished</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-commitment-table">
        <CardHeader>
          <CardTitle>Customer Tier Commitments</CardTitle>
          <CardDescription>
            View and manage tier commitments for all customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={
                      tiersWithCommitments.length > 0 &&
                      selectedForEmail.size === tiersWithCommitments.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForEmail(
                          new Set(tiersWithCommitments.map((c) => c.id))
                        );
                      } else {
                        setSelectedForEmail(new Set());
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Commitment Period</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commitmentData.map((customer) => {
                const hasCommitment = customer.commitmentCases && customer.commitmentCases > 0;
                const isSelected = selectedForEmail.has(customer.id);

                return (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell>
                      {hasCommitment && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleEmailSelection(customer.id)}
                          data-testid={`checkbox-customer-${customer.id}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-name-${customer.id}`}>
                      {customer.accountName}
                    </TableCell>
                    <TableCell>
                      {customer.tierName ? (
                        <Badge variant="secondary" data-testid={`badge-tier-${customer.id}`}>
                          {customer.tierName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No tier</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.commitmentStartDate ? (
                        <div className="text-sm" data-testid={`text-period-${customer.id}`}>
                          <div>
                            {format(new Date(customer.commitmentStartDate), "MMM d, yyyy")}
                          </div>
                          {customer.commitmentEndDate && (
                            <div className="text-muted-foreground">
                              to {format(new Date(customer.commitmentEndDate), "MMM d, yyyy")}
                            </div>
                          )}
                          {customer.monthsLeft !== null && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {customer.monthsLeft} months left
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasCommitment ? (
                        <div className="space-y-1" data-testid={`progress-${customer.id}`}>
                          <Progress value={customer.percentComplete} className="w-24" />
                          <span className="text-xs text-muted-foreground">
                            {customer.percentComplete}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasCommitment ? (
                        <div className="text-sm" data-testid={`text-cases-${customer.id}`}>
                          <div className="font-medium">
                            {customer.casesPurchased} / {customer.commitmentCases}
                          </div>
                          <div className="text-muted-foreground">
                            {customer.casesRemaining} remaining
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No commitment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasCommitment ? (
                        customer.casesRemaining === 0 ? (
                          <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${customer.id}`}>
                            Complete
                          </Badge>
                        ) : customer.monthsLeft !== null && customer.monthsLeft <= 3 ? (
                          <Badge variant="default" className="bg-yellow-600" data-testid={`badge-status-${customer.id}`}>
                            Attention
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-status-${customer.id}`}>
                            Active
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetStartDate(customer)}
                        data-testid={`button-set-date-${customer.id}`}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {customer.commitmentStartDate ? "Update" : "Set"} Date
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {commitmentData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground" data-testid="text-no-data">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent data-testid="dialog-set-date">
          <DialogHeader>
            <DialogTitle>Set Commitment Start Date</DialogTitle>
            <DialogDescription>
              Set the anniversary date for {selectedCustomer?.accountName}. This date will be
              used to calculate the annual commitment period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Commitment Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateDialog(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStartDate}
              disabled={!newStartDate || updateStartDateMutation.isPending}
              data-testid="button-save-date"
            >
              {updateStartDateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
