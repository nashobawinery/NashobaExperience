import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign, Plus, Edit, Loader2, Trash2, CheckCircle2, XCircle, MapPin
} from "lucide-react";

interface StateTaxClass {
  id: number;
  stateCode: string;
  stateName: string;
  classKey: string;
  displayName: string;
  taxRate: string;
  taxUnit: string;
  description: string | null;
  abvMin: string | null;
  abvMax: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function StateTaxClassifications() {
  const { toast } = useToast();
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; record: StateTaxClass | null }>({ isOpen: false, record: null });
  const [addDialog, setAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StateTaxClass | null>(null);

  const [formStateCode, setFormStateCode] = useState("MA");
  const [formStateName, setFormStateName] = useState("Massachusetts");
  const [formClassKey, setFormClassKey] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formTaxRate, setFormTaxRate] = useState("");
  const [formTaxUnit, setFormTaxUnit] = useState("per gallon");
  const [formDescription, setFormDescription] = useState("");
  const [formAbvMin, setFormAbvMin] = useState("");
  const [formAbvMax, setFormAbvMax] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data: taxClasses, isLoading } = useQuery<StateTaxClass[]>({
    queryKey: ['/api/cellartraks/state-tax-classes'],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        return apiRequest('PUT', `/api/cellartraks/state-tax-classes/${data.id}`, data);
      }
      return apiRequest('POST', '/api/cellartraks/state-tax-classes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/cellartraks/');
      }});
      toast({ title: "Tax Classification Saved" });
      setEditDialog({ isOpen: false, record: null });
      setAddDialog(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/cellartraks/state-tax-classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/cellartraks/');
      }});
      toast({ title: "Tax Classification Deleted" });
      setDeleteConfirm(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormStateCode("MA");
    setFormStateName("Massachusetts");
    setFormClassKey("");
    setFormDisplayName("");
    setFormTaxRate("");
    setFormTaxUnit("per gallon");
    setFormDescription("");
    setFormAbvMin("");
    setFormAbvMax("");
    setFormSortOrder("0");
    setFormIsActive(true);
  };

  const openEditDialog = (record: StateTaxClass) => {
    setFormStateCode(record.stateCode);
    setFormStateName(record.stateName);
    setFormClassKey(record.classKey);
    setFormDisplayName(record.displayName);
    setFormTaxRate(record.taxRate);
    setFormTaxUnit(record.taxUnit);
    setFormDescription(record.description || "");
    setFormAbvMin(record.abvMin || "");
    setFormAbvMax(record.abvMax || "");
    setFormSortOrder(record.sortOrder.toString());
    setFormIsActive(record.isActive);
    setEditDialog({ isOpen: true, record });
  };

  const handleSave = () => {
    if (!formDisplayName || !formTaxRate || !formTaxUnit) {
      toast({ title: "Error", description: "Name, tax rate, and tax unit are required", variant: "destructive" });
      return;
    }

    const data: any = {
      stateCode: formStateCode,
      stateName: formStateName,
      classKey: formClassKey || formDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      displayName: formDisplayName,
      taxRate: formTaxRate,
      taxUnit: formTaxUnit,
      description: formDescription || null,
      abvMin: formAbvMin || null,
      abvMax: formAbvMax || null,
      sortOrder: parseInt(formSortOrder) || 0,
      isActive: formIsActive,
    };

    if (editDialog.record) {
      data.id = editDialog.record.id;
    }

    saveMutation.mutate(data);
  };

  const formatRate = (rate: string, unit: string) => {
    const num = parseFloat(rate);
    return `$${num.toFixed(num < 1 ? 2 : 2)}/${unit.replace('per ', '')}`;
  };

  const groupedByState = (taxClasses || []).reduce<Record<string, StateTaxClass[]>>((acc, tc) => {
    const key = `${tc.stateCode} - ${tc.stateName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tc);
    return acc;
  }, {});

  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>State Code</Label>
          <Input
            value={formStateCode}
            onChange={e => setFormStateCode(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="MA"
            maxLength={2}
            disabled={isEdit}
            data-testid="input-state-code"
          />
        </div>
        <div className="space-y-2">
          <Label>State Name</Label>
          <Input
            value={formStateName}
            onChange={e => setFormStateName(e.target.value)}
            placeholder="Massachusetts"
            disabled={isEdit}
            data-testid="input-state-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Classification Name</Label>
        <Input
          value={formDisplayName}
          onChange={e => setFormDisplayName(e.target.value)}
          placeholder="e.g. Still Wine"
          data-testid="input-display-name"
        />
      </div>

      {!isEdit && (
        <div className="space-y-2">
          <Label>Classification Key</Label>
          <Input
            value={formClassKey}
            onChange={e => setFormClassKey(e.target.value)}
            placeholder="Auto-generated from name if empty"
            data-testid="input-class-key"
          />
          <p className="text-xs text-muted-foreground">Unique identifier used internally. Leave blank to auto-generate.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tax Rate</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              value={formTaxRate}
              onChange={e => setFormTaxRate(e.target.value)}
              placeholder="0.55"
              className="pl-9"
              data-testid="input-tax-rate"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tax Unit</Label>
          <Input
            value={formTaxUnit}
            onChange={e => setFormTaxUnit(e.target.value)}
            placeholder="per gallon"
            data-testid="input-tax-unit"
          />
          <p className="text-xs text-muted-foreground">e.g. per gallon, per proof gallon, per barrel</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ABV Min (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={formAbvMin}
            onChange={e => setFormAbvMin(e.target.value)}
            placeholder="Optional"
            data-testid="input-abv-min"
          />
        </div>
        <div className="space-y-2">
          <Label>ABV Max (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={formAbvMax}
            onChange={e => setFormAbvMax(e.target.value)}
            placeholder="Optional"
            data-testid="input-abv-max"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formDescription}
          onChange={e => setFormDescription(e.target.value)}
          placeholder="Describe this tax classification..."
          className="resize-none"
          rows={2}
          data-testid="input-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={formSortOrder}
            onChange={e => setFormSortOrder(e.target.value)}
            data-testid="input-sort-order"
          />
        </div>
        <div className="space-y-2">
          <Label>Active</Label>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={formIsActive}
              onCheckedChange={setFormIsActive}
              data-testid="switch-is-active"
            />
            <span className="text-sm text-muted-foreground">
              {formIsActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-state-tax-heading">
          State Tax Classifications
        </h2>
        <p className="text-muted-foreground text-sm">
          Manage state-level excise tax classifications and rates. Tax rates can be updated when state regulations change.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {Object.keys(groupedByState).length} state(s) configured
          </span>
        </div>
        <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="button-add-tax-class">
          <Plus className="h-4 w-4 mr-2" />
          Add Tax Classification
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedByState).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No state tax classifications configured</p>
            <p className="text-sm mt-1">Add state tax classifications to track excise tax rates.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByState).map(([stateLabel, classes]) => (
          <Card key={stateLabel} data-testid={`card-state-${classes[0]?.stateCode}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-base" data-testid={`text-state-title-${classes[0]?.stateCode}`}>
                  {stateLabel}
                </CardTitle>
                <Badge variant="outline" className="ml-auto text-xs">
                  {classes.length} classification{classes.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Classification</TableHead>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>ABV Range</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map(tc => (
                      <TableRow key={tc.id} data-testid={`row-tax-class-${tc.id}`}>
                        <TableCell>
                          <p className="font-medium text-sm">{tc.displayName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{tc.classKey}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-rate-${tc.id}`}>
                            {formatRate(tc.taxRate, tc.taxUnit)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {tc.abvMin || tc.abvMax ? (
                              <>
                                {tc.abvMin ? `${tc.abvMin}%` : '0%'} - {tc.abvMax ? `${tc.abvMax}%` : 'No limit'}
                              </>
                            ) : (
                              <span className="text-muted-foreground">All</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-2">{tc.description || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {tc.isActive ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="text-xs">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="text-xs">Inactive</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEditDialog(tc)} data-testid={`button-edit-tax-class-${tc.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(tc)} data-testid={`button-delete-tax-class-${tc.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={editDialog.isOpen} onOpenChange={(open) => { if (!open) setEditDialog({ isOpen: false, record: null }); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-tax-class">
          <DialogHeader>
            <DialogTitle>Edit Tax Classification</DialogTitle>
            <DialogDescription>
              Update the tax rate or details for {editDialog.record?.displayName}
            </DialogDescription>
          </DialogHeader>
          {renderForm(true)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditDialog({ isOpen: false, record: null })} data-testid="button-cancel-edit-tax">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-tax-class">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog} onOpenChange={(open) => { if (!open) { setAddDialog(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-add-tax-class">
          <DialogHeader>
            <DialogTitle>Add Tax Classification</DialogTitle>
            <DialogDescription>
              Add a new state excise tax classification with its current rate.
            </DialogDescription>
          </DialogHeader>
          {renderForm(false)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setAddDialog(false); resetForm(); }} data-testid="button-cancel-add-tax">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-new-tax-class">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add Classification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent data-testid="dialog-delete-tax-class">
          <DialogHeader>
            <DialogTitle>Delete Tax Classification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.displayName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete-tax">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-tax"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
