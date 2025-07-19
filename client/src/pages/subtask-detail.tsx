import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Target, Briefcase, ListTodo, CheckSquare, Home } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DetailPageTemplate } from "@/components/DetailPageTemplate";

function SubtaskDetailContent() {
  const { goalId, projectId, taskId, subtaskId } = useParams();

  // Fetch subtask details
  const { data: subtask, isLoading } = useQuery({
    queryKey: [`/api/subtasks/${subtaskId}`],
    enabled: !!subtaskId,
  });

  // Fetch parent data for breadcrumbs
  const { data: goal } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  const { data: project } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}`],
    enabled: !!goalId && !!projectId,
  });

  const { data: task } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`],
    enabled: !!goalId && !!projectId && !!taskId,
  });

  const config = {
    type: 'subtasks' as const,
    icon: CheckSquare,
    displayName: 'Subtask',
    parentType: 'tasks' as const,
    parentIcon: ListTodo,
  };

  const breadcrumbPath = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home,
    },
    {
      label: goal?.title || 'Goal',
      path: `/goal/${goalId}`,
      icon: Target,
    },
    {
      label: project?.title || 'Project',
      path: `/goal/${goalId}/project/${projectId}`,
      icon: Briefcase,
    },
    {
      label: task?.title || 'Task',
      path: `/goal/${goalId}/project/${projectId}/task/${taskId}`,
      icon: ListTodo,
    }
  ];

  return (
    <DetailPageTemplate
      config={config}
      itemId={subtaskId!}
      parentIds={{ goalId, projectId, taskId }}
      data={subtask}
      children={[]}
      isLoading={isLoading}
      breadcrumbPath={breadcrumbPath}
    />
  );
}

export default function SubtaskDetailPage() {
  return (
    <AuthGuard>
      <SubtaskDetailContent />
    </AuthGuard>
  );
}