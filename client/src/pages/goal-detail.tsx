import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Target, Briefcase, Home } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DetailPageTemplate } from "@/components/DetailPageTemplate";

function GoalDetailContent() {
  const { goalId } = useParams();

  // Fetch goal details
  const { data: goal, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  // Fetch projects for this goal
  const { data: projects = [] } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects`],
    enabled: !!goalId,
  });

  const config = {
    type: 'goals' as const,
    icon: Target,
    displayName: 'Goal',
    childType: 'projects' as const,
    childIcon: Briefcase,
  };

  const breadcrumbPath = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: Home,
    }
  ];



  return (
    <DetailPageTemplate
      config={config}
      itemId={goalId!}
      data={goal}
      children={projects}
      isLoading={isLoading}
      breadcrumbPath={breadcrumbPath}
    />
  );
}

export default function GoalDetailPage() {
  return (
    <AuthGuard>
      <GoalDetailContent />
    </AuthGuard>
  );
}