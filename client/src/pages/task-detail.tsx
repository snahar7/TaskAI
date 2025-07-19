import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Target, Briefcase, ListTodo, CheckSquare, Home } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DetailPageTemplate } from "@/components/DetailPageTemplate";

function TaskDetailContent() {
  const { goalId, projectId, taskId } = useParams();

  // Fetch task details
  const { data: task, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`],
    enabled: !!goalId && !!projectId && !!taskId,
  });

  // Fetch subtasks for this task
  const { data: subtasks = [] } = useQuery({
    queryKey: [`/api/tasks/${taskId}/subtasks`],
    enabled: !!taskId,
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

  const config = {
    type: 'tasks' as const,
    icon: ListTodo,
    displayName: 'Task',
    parentType: 'projects' as const,
    parentIcon: Briefcase,
    childType: 'subtasks' as const,
    childIcon: CheckSquare,
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
    }
  ];

  return (
    <DetailPageTemplate
      config={config}
      itemId={taskId!}
      parentIds={{ goalId, projectId }}
      data={task}
      children={subtasks}
      isLoading={isLoading}
      breadcrumbPath={breadcrumbPath}
    />
  );
}

export default function TaskDetailPage() {
  return (
    <AuthGuard>
      <TaskDetailContent />
    </AuthGuard>
  );
}