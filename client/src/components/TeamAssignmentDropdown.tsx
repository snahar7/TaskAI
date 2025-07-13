import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";

interface TeamAssignmentDropdownProps {
  type: "goals" | "projects" | "tasks" | "subtasks";
  id: number;
  assignedUserId?: number | null;
  onAssignmentChange?: (userId: number | null) => void;
}

export function TeamAssignmentDropdown({ 
  type, 
  id, 
  assignedUserId, 
  onAssignmentChange 
}: TeamAssignmentDropdownProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Get team members
  const { data: teamMembers = [], isLoading } = useQuery<User[]>({
    queryKey: [`/api/users/team/${user?.teamId}`],
    enabled: !!user?.teamId,
    staleTime: 1000 * 30, // 30 seconds for testing
  });

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async (newUserId: number | null) => {
      return apiRequest("PATCH", `/api/${type}/${id}/edit`, {
        assignedTo: newUserId
      });
    },
    onSuccess: (_, newUserId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/${type}/${id}`] });
      
      // Call parent callback
      if (onAssignmentChange) {
        onAssignmentChange(newUserId);
      }
    },
  });

  const handleAssignmentChange = (value: string) => {
    const newUserId = value === "unassigned" ? null : parseInt(value);
    updateAssignmentMutation.mutate(newUserId);
    setIsOpen(false);
  };

  if (isLoading) {
    return <div className="text-xs text-slate-500">Loading...</div>;
  }

  console.log('Team members for user', user?.id, 'team', user?.teamId, ':', teamMembers);

  // If clicking to show dropdown
  if (isOpen) {
    return (
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        value={assignedUserId ? assignedUserId.toString() : "unassigned"}
        onValueChange={handleAssignmentChange}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue>
            {assignedUserId ? (
              <div className="flex items-center gap-1">
                <UserAvatar userId={assignedUserId} size="xs" />
                <span className="truncate">
                  {teamMembers.find(m => m.id === assignedUserId)?.firstName || "User"}
                </span>
              </div>
            ) : (
              "Unassigned"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <span className="text-slate-500">Unassigned</span>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id.toString()}>
              <div className="flex items-center gap-2">
                <UserAvatar userId={member.id} size="xs" />
                <span>{member.firstName} {member.lastName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default display - just show avatar with click to edit
  return (
    <div 
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => setIsOpen(true)}
      title="Click to assign"
    >
      {assignedUserId ? (
        <UserAvatar userId={assignedUserId} size="sm" />
      ) : (
        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-500 border-2 border-dashed border-slate-300">
          ?
        </div>
      )}
    </div>
  );
}