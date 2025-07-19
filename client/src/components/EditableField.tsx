import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateForInput } from "@/lib/utils";

interface EditableFieldProps {
  type: string;
  id: number;
  field: string;
  value: any;
  displayValue?: string;
  fieldType?: "text" | "textarea" | "select" | "date" | "number";
  options?: string[];
  className?: string;
  placeholder?: string;
  onSuccess?: () => void;
}

export function EditableField({
  type,
  id,
  field,
  value,
  displayValue,
  fieldType = "text",
  options = [],
  className = "",
  placeholder = "",
  onSuccess
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editingValue, setEditingValue] = useState<any>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateItemMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      console.log(`🔄 Updating ${type} ${id} field ${field} with value:`, value);
      const response = await apiRequest("PATCH", `/api/${type}/${id}/edit`, { [field]: value });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          (query.queryKey[0].includes(`/api/${type}`) ||
            query.queryKey[0].includes("/api/goals") ||
            query.queryKey[0].includes("/api/projects") ||
            query.queryKey[0].includes("/api/tasks") ||
            query.queryKey[0].includes("/api/dashboard"))
      });

      setEditing(false);
      setEditingValue("");
      onSuccess?.();
      
      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const startEditing = () => {
    // For date fields, use timezone-safe conversion to prevent "one day ahead" issue
    let editValue = value;
    if (field === 'deadline' && value) {
      console.log(`🐛 DEBUG startEditing deadline:`, {
        value,
        type: typeof value,
        formatDateForInputResult: formatDateForInput(value)
      });
      editValue = formatDateForInput(value);
    }
    
    setEditingValue(editValue || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditingValue("");
  };

  const saveEdit = () => {
    updateItemMutation.mutate({ field, value: editingValue });
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {fieldType === "text" && (
          <Input
            value={editingValue || ""}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveEdit();
              } else if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            className={`h-8 ${className}`}
            placeholder={placeholder}
            autoFocus
          />
        )}
        {fieldType === "textarea" && (
          <Textarea
            value={editingValue || ""}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                saveEdit();
              } else if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            className={`min-h-[60px] ${className}`}
            placeholder={placeholder}
            autoFocus
          />
        )}
        {fieldType === "select" && (
          <Select
            value={editingValue || ""}
            onValueChange={(value) => setEditingValue(value)}
          >
            <SelectTrigger className={`h-8 ${className}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {fieldType === "date" && (
          <Input
            type="date"
            value={editingValue || ""}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveEdit();
              } else if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            className={`h-8 ${className}`}
            autoFocus
          />
        )}
        {fieldType === "number" && (
          <Input
            type="number"
            value={editingValue || ""}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveEdit();
              } else if (e.key === "Escape") {
                cancelEditing();
              }
            }}
            className={`h-8 ${className}`}
            placeholder={placeholder}
            autoFocus
          />
        )}
        <Button size="sm" variant="ghost" onClick={saveEdit} disabled={updateItemMutation.isPending}>
          <Save className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cancelEditing}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded border group"
      onClick={startEditing}
    >
      <span className="flex-1">{displayValue || value || placeholder}</span>
      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}