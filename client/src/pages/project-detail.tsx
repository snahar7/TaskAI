import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Target, Briefcase, ListTodo, Home } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DetailPageTemplate } from "@/components/DetailPageTemplate";

function ProjectDetailContent() {
  const { goalId, projectId } = useParams();

  // Fetch project details - use hierarchical endpoint if goalId is available
  const { data: project, isLoading } = useQuery({
    queryKey: goalId ? [`/api/goals/${goalId}/projects/${projectId}`] : [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch tasks for this project
  const { data: tasks = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
  });

  // Fetch goal details for breadcrumb if goalId is available
  const { data: goal } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  const config = {
    type: 'projects' as const,
    icon: Briefcase,
    displayName: 'Project',
    parentType: 'goals' as const,
    parentIcon: Target,
    childType: 'tasks' as const,
    childIcon: ListTodo,
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
    }] : [])
  ];

  return (
    <DetailPageTemplate
      config={config}
      itemId={projectId!}
      parentIds={{ goalId }}
      data={project}
      children={tasks}
      isLoading={isLoading}
      breadcrumbPath={breadcrumbPath}
    />
  );
}

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <ProjectDetailContent />
    </AuthGuard>
  );
}