import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MessageSquare, Plus, Send, Eye, Trash2, TestTube,
  Users, CheckCircle, XCircle, Clock, Loader2, Phone
} from "lucide-react";

const SEGMENTS = [
  { value: "active", label: "Active", desc: "Visited within 30 days" },
  { value: "at_risk", label: "At Risk", desc: "31-60 days since visit" },
  { value: "lapsed", label: "Lapsed", desc: "61-120 days since visit" },
  { value: "dormant", label: "Dormant", desc: "121-365 days since visit" },
  { value: "lost", label: "Lost", desc: "Over 1 year since visit" },
];

const CHARACTER_LIMIT = 160;

function statusBadge(status: string) {
  switch (status) {
    case "draft": return <Badge variant="secondary" data-testid="badge-status-draft">Draft</Badge>;
    case "sending": return <Badge variant="default" data-testid="badge-status-sending">Sending</Badge>;
    case "partial": return <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid="badge-status-partial">Partial</Badge>;
    case "completed": return <Badge variant="outline" className="border-green-500 text-green-600" data-testid="badge-status-completed">Completed</Badge>;
    case "failed": return <Badge variant="destructive" data-testid="badge-status-failed">Failed</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

export function SmsCampaignsTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [showTestDialog, setShowTestDialog] = useState<number | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [showSendConfirm, setShowSendConfirm] = useState<number | null>(null);
  const [sendLimit, setSendLimit] = useState("50");

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
    segments: [] as string[],
  });

  const { data: smsStatus, isLoading: statusLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/sms/status"],
    retry: 3,
    retryDelay: 1000,
  });

  const { data: campaigns, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sms/campaigns"],
  });

  const { data: campaignDetail } = useQuery<{ campaign: any; messages: any[] }>({
    queryKey: ["/api/sms/campaigns", showDetail],
    enabled: !!showDetail,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await apiRequest("POST", "/api/sms/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      setShowCreate(false);
      setNewCampaign({ name: "", message: "", segments: [] });
      toast({ title: "Campaign created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const previewMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/sms/campaigns/${id}/preview`, {});
      return res.json();
    },
  });

  const testMutation = useMutation({
    mutationFn: async ({ id, phone }: { id: number; phone: string }) => {
      const res = await apiRequest("POST", `/api/sms/campaigns/${id}/test`, { phone });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Test sent", description: `Message delivered (${data.messageId})` });
        setShowTestDialog(null);
      } else {
        toast({ title: "Test failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async ({ id, limit }: { id: number; limit: number }) => {
      const res = await apiRequest("POST", `/api/sms/campaigns/${id}/send`, { limit });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Campaign sending", description: `Sending to ${data.totalRecipients} recipients...` });
      setShowSendConfirm(null);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] }), 3000);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sms/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/campaigns"] });
      setShowDetail(null);
      toast({ title: "Campaign deleted" });
    },
  });

  const toggleSegment = (seg: string) => {
    setNewCampaign(prev => ({
      ...prev,
      segments: prev.segments.includes(seg)
        ? prev.segments.filter(s => s !== seg)
        : [...prev.segments, seg],
    }));
  };

  const messageLength = newCampaign.message.length;
  const segmentCount = Math.ceil(messageLength / CHARACTER_LIMIT) || 1;

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Checking SMS configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (smsStatus && !smsStatus.configured) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Phone className="h-8 w-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold" data-testid="text-sms-not-configured">SMS Not Configured</h3>
              <p className="text-sm text-muted-foreground">Twilio credentials are needed to send SMS campaigns. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-sms-title">SMS Campaigns</h2>
          <p className="text-sm text-muted-foreground">Send targeted text messages to your customers</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="button-create-campaign">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1" data-testid="text-no-campaigns">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first SMS campaign to reach customers directly on their phones.</p>
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-first-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => (
            <Card key={c.id} className="hover-elevate cursor-pointer" onClick={() => {
              setShowDetail(c.id);
              previewMutation.mutate(c.id);
            }} data-testid={`card-campaign-${c.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate" data-testid={`text-campaign-name-${c.id}`}>{c.name}</h3>
                      {statusBadge(c.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2" data-testid={`text-campaign-preview-${c.id}`}>{c.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      {c.segments && c.segments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {c.segments.join(", ")}
                        </span>
                      )}
                      {c.total_sent > 0 && (
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {c.total_sent} sent
                        </span>
                      )}
                      {c.total_failed > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3 w-3" />
                          {c.total_failed} failed
                        </span>
                      )}
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create SMS Campaign</DialogTitle>
            <DialogDescription>Compose a message and choose which customer segments to target.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Valentine's Special"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-campaign-name"
              />
            </div>
            <div>
              <Label htmlFor="campaign-message">Message</Label>
              <Textarea
                id="campaign-message"
                placeholder="Hi {first_name}! Come visit us this weekend for..."
                value={newCampaign.message}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
                data-testid="input-campaign-message"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">Use {"{first_name}"} to personalize</p>
                <p className={`text-xs ${messageLength > CHARACTER_LIMIT ? "text-amber-500" : "text-muted-foreground"}`} data-testid="text-char-count">
                  {messageLength} chars ({segmentCount} SMS {segmentCount === 1 ? "segment" : "segments"})
                </p>
              </div>
            </div>
            <div>
              <Label>Target Segments</Label>
              <p className="text-xs text-muted-foreground mb-2">Leave empty to send to all customers with phone numbers</p>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(seg => (
                  <Badge
                    key={seg.value}
                    variant={newCampaign.segments.includes(seg.value) ? "default" : "outline"}
                    className="cursor-pointer toggle-elevate"
                    onClick={() => toggleSegment(seg.value)}
                    data-testid={`badge-segment-${seg.value}`}
                  >
                    {seg.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(newCampaign)}
              disabled={!newCampaign.name || !newCampaign.message || createMutation.isPending}
              data-testid="button-save-campaign"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={(open) => !open && setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {campaignDetail?.campaign ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {campaignDetail.campaign.name}
                  {statusBadge(campaignDetail.campaign.status)}
                </DialogTitle>
                <DialogDescription>Campaign details and delivery status</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs text-muted-foreground">Message</Label>
                    <p className="text-sm mt-1" data-testid="text-detail-message">{campaignDetail.campaign.message}</p>
                  </CardContent>
                </Card>

                {campaignDetail.campaign.segments && campaignDetail.campaign.segments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Segments:</span>
                    {campaignDetail.campaign.segments.map((s: string) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Users className="h-4 w-4 mx-auto text-muted-foreground" />
                      <p className="text-lg font-bold mt-1" data-testid="text-stat-recipients">{campaignDetail.campaign.total_recipients || previewMutation.data?.totalRecipients || 0}</p>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <CheckCircle className="h-4 w-4 mx-auto text-green-500" />
                      <p className="text-lg font-bold mt-1" data-testid="text-stat-sent">{campaignDetail.campaign.total_sent || 0}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <CheckCircle className="h-4 w-4 mx-auto text-blue-500" />
                      <p className="text-lg font-bold mt-1" data-testid="text-stat-delivered">{campaignDetail.campaign.total_delivered || 0}</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <XCircle className="h-4 w-4 mx-auto text-destructive" />
                      <p className="text-lg font-bold mt-1" data-testid="text-stat-failed">{campaignDetail.campaign.total_failed || 0}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </CardContent>
                  </Card>
                </div>

                {previewMutation.data?.sampleRecipients && (campaignDetail.campaign.status === "draft" || campaignDetail.campaign.status === "partial") && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Sample Recipients ({previewMutation.data.totalRecipients} total eligible)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2">
                        {previewMutation.data.sampleRecipients.map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between text-sm">
                            <span>{r.first_name} {r.last_name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{r.reactivation_segment}</Badge>
                              {r.lifetime_spend && <span className="text-xs text-muted-foreground">${parseFloat(r.lifetime_spend).toFixed(0)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {campaignDetail.messages.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Messages</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {campaignDetail.messages.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              {m.status === "sent" ? <CheckCircle className="h-3 w-3 text-green-500 shrink-0" /> : <XCircle className="h-3 w-3 text-destructive shrink-0" />}
                              <span className="truncate">{m.recipient_name || m.recipient_phone}</span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{m.recipient_phone}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => { if (confirm("Delete this campaign?")) deleteMutation.mutate(campaignDetail.campaign.id); }}
                    data-testid="button-delete-campaign"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(campaignDetail.campaign.status === "draft" || campaignDetail.campaign.status === "partial") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTestDialog(campaignDetail.campaign.id)}
                          data-testid="button-test-campaign"
                        >
                          <TestTube className="h-4 w-4 mr-1" />
                          Send Test
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setShowSendConfirm(campaignDetail.campaign.id)}
                          data-testid="button-send-campaign"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {campaignDetail.campaign.status === "partial" ? "Send More" : "Send Campaign"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 p-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showTestDialog} onOpenChange={(open) => !open && setShowTestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Message</DialogTitle>
            <DialogDescription>Send a preview of this campaign to your phone number.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="test-phone">Phone Number</Label>
            <Input
              id="test-phone"
              placeholder="(978) 580-1780"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              data-testid="input-test-phone"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showTestDialog && testMutation.mutate({ id: showTestDialog, phone: testPhone })}
              disabled={!testPhone || testMutation.isPending}
              data-testid="button-send-test"
            >
              {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showSendConfirm} onOpenChange={(open) => !open && setShowSendConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send</DialogTitle>
            <DialogDescription>This will send real SMS messages to customers. Twilio charges apply per message.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="send-limit">Number of recipients (max 500)</Label>
            <Select value={sendLimit} onValueChange={setSendLimit}>
              <SelectTrigger data-testid="select-send-limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 recipients</SelectItem>
                <SelectItem value="25">25 recipients</SelectItem>
                <SelectItem value="50">50 recipients</SelectItem>
                <SelectItem value="100">100 recipients</SelectItem>
                <SelectItem value="250">250 recipients</SelectItem>
                <SelectItem value="500">500 recipients</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Sorted by highest lifetime spend first</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendConfirm(null)}>Cancel</Button>
            <Button
              onClick={() => showSendConfirm && sendMutation.mutate({ id: showSendConfirm, limit: parseInt(sendLimit) })}
              disabled={sendMutation.isPending}
              data-testid="button-confirm-send"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send to {sendLimit} customers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
