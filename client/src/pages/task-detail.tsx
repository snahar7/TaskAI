import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Target, Briefcase, ListTodo, CheckSquare, Home } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DetailPageTemplate } from "@/components/DetailPageTemplate";

function TaskDetailContent() {
  const { goalId, projectId, taskId } = useParams();

  // Fetch task details - use hierarchical endpoint if all IDs are available
  const { data: task, isLoading } = useQuery({
    queryKey: (goalId && projectId) ? [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`] : [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  // Fetch subtasks for this task
  const { data: subtasks = [] } = useQuery({
    queryKey: [`/api/tasks/${taskId}/subtasks`],
    enabled: !!taskId,
  });

  // Fetch parent data for breadcrumbs if IDs are available
  const { data: goal } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  const { data: project } = useQuery({
    queryKey: (goalId && projectId) ? [`/api/goals/${goalId}/projects/${projectId}`] : [`/api/projects/${projectId}`],
    enabled: !!projectId,
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
    ...(goal && goalId ? [{
      label: goal.title,
      path: `/goal/${goalId}`,
      icon: Target,
    }] : []),
    ...(project && goalId && projectId ? [{
      label: project.title,
      path: `/goal/${goalId}/project/${projectId}`,
      icon: Briefcase,
    }] : [])
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