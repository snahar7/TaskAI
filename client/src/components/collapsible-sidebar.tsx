import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  CheckSquare, 
  Target, 
  MessageSquare, 
  Bot,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function CollapsibleSidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navigationItems = [
    { href: "/todo", label: "To-do", icon: CheckSquare, color: "text-blue-600" },
    { href: "/goals", label: "Goals", icon: Target, color: "text-green-600" },
    { href: "/standup", label: "Standup", icon: MessageSquare, color: "text-purple-600" },
    { href: "/assist", label: "Assist", icon: Bot, color: "text-orange-600" },
  ];

  const SidebarItem = ({ href, label, icon: Icon, color }: any) => (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-12 transition-all duration-200",
          collapsed ? "px-3" : "px-4",
          isActive(href) 
            ? "bg-accent/50 text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
        )}
      >
        <div className="flex items-center w-full">
          <Icon className={cn("shrink-0 h-5 w-5", color, collapsed ? "" : "mr-3")} />
          {!collapsed && (
            <span className="font-medium text-sm">{label}</span>
          )}
        </div>
      </Button>
    </Link>
  );

  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 h-screen",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Target className="text-white h-4 w-4" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">TaskAI</h1>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3 space-y-2">
        {navigationItems.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}