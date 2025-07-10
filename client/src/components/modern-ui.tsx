import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, AlertCircle, Target, TrendingUp, User } from "lucide-react";

// Modern Card Components
interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function ModernCard({ children, className, hover = true }: ModernCardProps) {
  return (
    <Card className={cn(
      "modern-card",
      hover && "hover:shadow-lg hover:shadow-primary/5",
      className
    )}>
      {children}
    </Card>
  );
}

export function ModernCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <CardHeader className={cn("modern-card-header", className)}>
      {children}
    </CardHeader>
  );
}

export function ModernCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <CardContent className={cn("modern-card-content", className)}>
      {children}
    </CardContent>
  );
}

// Modern Status Badge
interface StatusBadgeProps {
  status: "completed" | "in_progress" | "pending" | "overdue";
  children?: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants = {
    completed: "bg-success/10 text-success border-success/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20"
  };

  const icons = {
    completed: CheckCircle,
    in_progress: Clock,
    pending: AlertCircle,
    overdue: AlertCircle
  };

  const Icon = icons[status];

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", variants[status])}>
      <Icon className="w-3 h-3 mr-1" />
      {children || status.replace('_', ' ')}
    </Badge>
  );
}

// Modern Progress Ring
interface ProgressRingProps {
  progress: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({ progress, size = "md", showLabel = true, className }: ProgressRingProps) {
  const sizes = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-20 h-20"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn("relative", sizes[size], className)}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress}, 100`}
          className="text-primary transition-all duration-500"
        />
        <path
          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground/20"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold text-foreground", textSizes[size])}>
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Modern Metric Card
interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  description, 
  trend, 
  trendValue, 
  icon,
  className 
}: MetricCardProps) {
  const trendColors = {
    up: "text-success",
    down: "text-destructive", 
    neutral: "text-muted-foreground"
  };

  return (
    <ModernCard className={className}>
      <ModernCardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && trendValue && (
              <div className={cn("flex items-center mt-2 text-xs", trendColors[trend])}>
                <TrendingUp className={cn("w-3 h-3 mr-1", trend === "down" && "rotate-180")} />
                {trendValue}
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-primary/10 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}

// Modern Task Item
interface TaskItemProps {
  title: string;
  description?: string;
  progress?: number;
  status?: "completed" | "in_progress" | "pending" | "overdue";
  assignee?: string;
  dueDate?: string;
  priority?: "high" | "medium" | "low";
  onClick?: () => void;
  className?: string;
}

export function ModernTaskItem({ 
  title, 
  description, 
  progress, 
  status = "pending", 
  assignee, 
  dueDate, 
  priority,
  onClick,
  className 
}: TaskItemProps) {
  const priorityColors = {
    high: "border-l-destructive",
    medium: "border-l-warning",
    low: "border-l-success"
  };

  return (
    <ModernCard 
      className={cn(
        "cursor-pointer border-l-4",
        priority && priorityColors[priority],
        className
      )}
      onClick={onClick}
    >
      <ModernCardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground line-clamp-1">{title}</h4>
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            )}
            
            <div className="flex items-center gap-4 mt-3">
              <StatusBadge status={status} />
              {assignee && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <User className="w-3 h-3 mr-1" />
                  {assignee}
                </div>
              )}
              {dueDate && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {dueDate}
                </div>
              )}
            </div>
          </div>
          
          {progress !== undefined && (
            <ProgressRing progress={progress} size="sm" />
          )}
        </div>
        
        {progress !== undefined && progress > 0 && (
          <Progress value={progress} className="mt-3 h-1" />
        )}
      </ModernCardContent>
    </ModernCard>
  );
}

// Modern Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function ModernEmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      {icon && (
        <div className="p-4 bg-muted rounded-full mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}