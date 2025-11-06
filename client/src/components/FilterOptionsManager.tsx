import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, GripVertical, Check, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getFilterOptions, createFilterOption, updateFilterOption, deleteFilterOption } from "@/lib/api";
import type { FilterOption } from "@shared/schema";
import { useState } from "react";

interface NewFilterOption {
  fieldType: string;
  optionValue: string;
  displayLabel: string;
  sortOrder: number;
  isActive: boolean;
}

export default function FilterOptionsManager() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FilterOption>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newOption, setNewOption] = useState<NewFilterOption>({
    fieldType: "category",
    optionValue: "",
    displayLabel: "",
    sortOrder: 1,
    isActive: true,
  });

  const { data: filterOptions = [], isLoading } = useQuery({
    queryKey: ['/api/filter-options'],
    queryFn: () => getFilterOptions(),
  });

  const createMutation = useMutation({
    mutationFn: createFilterOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/filter-options'] });
      toast({
        title: "Filter Option Created",
        description: "The filter option was successfully created",
      });
      setIsAdding(false);
      setNewOption({
        fieldType: "category",
        optionValue: "",
        displayLabel: "",
        sortOrder: 1,
        isActive: true,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create filter option",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateFilterOption(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/filter-options'] });
      toast({
        title: "Filter Option Updated",
        description: "The filter option was successfully updated",
      });
      setEditingId(null);
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update filter option",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFilterOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/filter-options'] });
      toast({
        title: "Filter Option Deleted",
        description: "The filter option was successfully removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete filter option",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newOption.optionValue || !newOption.displayLabel) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newOption);
  };

  const handleEdit = (option: FilterOption) => {
    setEditingId(option.id);
    setEditForm(option);
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      // Only send mutable fields to avoid validation errors
      const mutableData = {
        optionValue: editForm.optionValue,
        displayLabel: editForm.displayLabel,
        sortOrder: editForm.sortOrder,
        isActive: editForm.isActive,
      };
      updateMutation.mutate({ id: editingId, data: mutableData });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this filter option?")) {
      deleteMutation.mutate(id);
    }
  };

  const groupedOptions = filterOptions.reduce((acc, option) => {
    if (!acc[option.fieldType]) {
      acc[option.fieldType] = [];
    }
    acc[option.fieldType].push(option);
    return acc;
  }, {} as Record<string, FilterOption[]>);

  const fieldTypeLabels: Record<string, string> = {
    category: "Categories",
    wine_color: "Wine Colors",
    sweetness: "Sweetness Levels",
    body: "Body Types",
    characteristics: "Characteristics",
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium">Filter Options Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage searchable filter options for products
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? "outline" : "default"}
          data-testid="button-add-filter-option"
        >
          {isAdding ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </>
          )}
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Filter Option</CardTitle>
            <CardDescription>Add a new searchable option for filtering products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fieldType">Field Type</Label>
                <Select
                  value={newOption.fieldType}
                  onValueChange={(value) => setNewOption({ ...newOption, fieldType: value })}
                >
                  <SelectTrigger data-testid="select-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="wine_color">Wine Color</SelectItem>
                    <SelectItem value="sweetness">Sweetness</SelectItem>
                    <SelectItem value="body">Body</SelectItem>
                    <SelectItem value="characteristics">Characteristics</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={newOption.sortOrder}
                  onChange={(e) => setNewOption({ ...newOption, sortOrder: parseInt(e.target.value) || 1 })}
                  data-testid="input-sort-order"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optionValue">Option Value (lowercase, no spaces)</Label>
              <Input
                id="optionValue"
                placeholder="e.g., red, white, spirits"
                value={newOption.optionValue}
                onChange={(e) => setNewOption({ ...newOption, optionValue: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                data-testid="input-option-value"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">Display Label</Label>
              <Input
                id="displayLabel"
                placeholder="e.g., 🍷 Red Wine, Spirits"
                value={newOption.displayLabel}
                onChange={(e) => setNewOption({ ...newOption, displayLabel: e.target.value })}
                data-testid="input-display-label"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-option">
                {createMutation.isPending ? "Creating..." : "Create Option"}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {Object.entries(fieldTypeLabels).map(([fieldType, label]) => {
          const options = groupedOptions[fieldType] || [];
          return (
            <Card key={fieldType}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{label}</CardTitle>
                    <CardDescription>{options.length} options</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {options.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No options added yet
                    </p>
                  ) : (
                    options
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover-elevate"
                          data-testid={`filter-option-${option.id}`}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          
                          {editingId === option.id ? (
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input
                                value={editForm.optionValue || ""}
                                onChange={(e) => setEditForm({ ...editForm, optionValue: e.target.value })}
                                placeholder="Value"
                                data-testid="input-edit-value"
                              />
                              <Input
                                value={editForm.displayLabel || ""}
                                onChange={(e) => setEditForm({ ...editForm, displayLabel: e.target.value })}
                                placeholder="Label"
                                data-testid="input-edit-label"
                              />
                              <Input
                                type="number"
                                value={editForm.sortOrder || 1}
                                onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 1 })}
                                placeholder="Order"
                                data-testid="input-edit-order"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 flex items-center gap-3">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {option.optionValue}
                                </Badge>
                                <span className="font-medium">{option.displayLabel}</span>
                                <span className="text-xs text-muted-foreground">
                                  Order: {option.sortOrder}
                                </span>
                              </div>
                              <Badge variant={option.isActive ? "default" : "secondary"}>
                                {option.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </>
                          )}

                          <div className="flex gap-1">
                            {editingId === option.id ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleSaveEdit}
                                  disabled={updateMutation.isPending}
                                  data-testid="button-save-edit"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={handleCancelEdit}
                                  data-testid="button-cancel-edit"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEdit(option)}
                                  data-testid={`button-edit-${option.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDelete(option.id)}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${option.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
