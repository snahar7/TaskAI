import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mobile-optimized form input with 44px minimum touch target
export const MobileInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input 
    className={cn("h-12 text-base sm:text-sm", className)} 
    {...props} 
  />
);

// Mobile-optimized select with larger touch target
export const MobileSelect = ({ children, ...props }: React.ComponentProps<typeof Select>) => (
  <Select {...props}>
    <SelectTrigger className="h-12 text-base sm:text-sm">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {children}
    </SelectContent>
  </Select>
);

// Mobile-optimized textarea with larger touch target
export const MobileTextarea = ({ className, ...props }: React.ComponentProps<typeof Textarea>) => (
  <Textarea 
    className={cn("min-h-[100px] text-base sm:text-sm", className)} 
    {...props} 
  />
);

// Mobile-optimized button with 44px minimum touch target
export const MobileButton = ({ className, children, ...props }: React.ComponentProps<typeof Button>) => (
  <Button 
    className={cn("h-12 text-base sm:text-sm", className)} 
    {...props}
  >
    {children}
  </Button>
);

// Mobile-optimized card with better spacing
export const MobileCard = ({ className, children, ...props }: React.ComponentProps<typeof Card>) => (
  <Card 
    className={cn("mx-2 sm:mx-0", className)} 
    {...props}
  >
    {children}
  </Card>
);

// Mobile-optimized badge with better sizing
export const MobileBadge = ({ className, children, ...props }: React.ComponentProps<typeof Badge>) => (
  <Badge 
    className={cn("text-xs sm:text-sm px-2 py-1", className)} 
    {...props}
  >
    {children}
  </Badge>
);

// Mobile-optimized form field with proper spacing
export const MobileFormField = ({ 
  label, 
  children, 
  className 
}: { 
  label: string; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    <Label className="text-sm sm:text-base font-medium">{label}</Label>
    {children}
  </div>
);

// Mobile-optimized action bar for bottom actions
export const MobileActionBar = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={cn(
    "fixed bottom-20 md:bottom-4 left-4 right-4 bg-white border border-slate-200 rounded-lg p-4 shadow-lg z-40",
    "md:relative md:bottom-auto md:left-auto md:right-auto md:shadow-none md:border-0 md:p-0 md:bg-transparent",
    className
  )}>
    {children}
  </div>
);

// Mobile-optimized grid layout
export const MobileGrid = ({ 
  children, 
  cols = 1, 
  className 
}: { 
  children: React.ReactNode; 
  cols?: number;
  className?: string;
}) => (
  <div className={cn(
    `grid grid-cols-1 sm:grid-cols-${cols} gap-4 sm:gap-6`,
    className
  )}>
    {children}
  </div>
);

// Mobile-optimized section header
export const MobileSectionHeader = ({ 
  title, 
  description, 
  action,
  className 
}: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 mb-4 sm:mb-6",
    className
  )}>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      {description && <p className="text-sm sm:text-base text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

// Mobile-optimized list item with touch targets
export const MobileListItem = ({ 
  children, 
  onClick, 
  className 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  className?: string;
}) => (
  <div 
    className={cn(
      "flex items-center justify-between p-4 border rounded-lg min-h-[60px] touch-manipulation",
      onClick && "cursor-pointer hover:bg-slate-50 active:bg-slate-100",
      className
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// Mobile-optimized tab with better touch targets
export const MobileTabsList = ({ 
  children, 
  columns = 4,
  className 
}: { 
  children: React.ReactNode; 
  columns?: number;
  className?: string;
}) => (
  <div className={cn(
    `grid grid-cols-2 sm:grid-cols-${columns} w-full h-auto`,
    className
  )}>
    {children}
  </div>
);

// Mobile-optimized metric display
export const MobileMetric = ({ 
  value, 
  label, 
  color = "blue", 
  className 
}: { 
  value: string | number; 
  label: string; 
  color?: "blue" | "green" | "red" | "yellow";
  className?: string;
}) => (
  <div className={cn("text-center p-3 bg-muted rounded-lg", className)}>
    <div className={cn(
      "text-xl sm:text-2xl font-bold",
      color === "blue" && "text-blue-600",
      color === "green" && "text-green-600", 
      color === "red" && "text-red-600",
      color === "yellow" && "text-yellow-600"
    )}>
      {value}
    </div>
    <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
  </div>
);