import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Database, 
  BarChart3, 
  Clock, 
  MessageSquare, 
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Sparkles,
  Target,
  CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
}

export function ModernSidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navigationItems = [
    {
      title: "Overview",
      items: [
        { href: "/", label: "Home", icon: Home, description: "Quick goal input" },
        { href: "/dashboard", label: "Dashboard", icon: BarChart3, description: "Progress overview" },
      ]
    },
    {
      title: "AI Features",
      items: [
        { href: "/standup", label: "AI Standup", icon: MessageSquare, description: "Weekly planning", badge: "AI" },
        { href: "/timeline", label: "Timeline", icon: Clock, description: "Smart scheduling" },
      ]
    },
    {
      title: "Management",
      items: [
        { href: "/database", label: "Database", icon: Database, description: "All tasks & projects" },
      ]
    }
  ];

  const SidebarItem = ({ href, label, icon: Icon, description, badge }: any) => (
    <Link href={href}>
      <Button
        variant={isActive(href) ? "default" : "ghost"}
        className={cn(
          "w-full justify-start h-auto p-3 text-left transition-all duration-200",
          collapsed ? "px-3" : "px-4",
          isActive(href) 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <div className="flex items-center w-full">
          <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-5 w-5 mr-3")} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{label}</span>
                {badge && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    {badge}
                  </Badge>
                )}
              </div>
              <div className="text-xs opacity-70 line-clamp-1">{description}</div>
            </div>
          )}
        </div>
      </Button>
    </Link>
  );

  return (
    <div className={cn(
      "flex flex-col bg-background border-r border-border transition-all duration-300",
      collapsed ? "w-16" : "w-72",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                <Target className="text-primary-foreground h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Taflo</h1>
                <p className="text-xs text-muted-foreground">AI Task Manager</p>
              </div>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <SidebarItem key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start h-auto p-3">
              <User className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium text-sm">Default User</div>
                <div className="text-xs text-muted-foreground">default@example.com</div>
              </div>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4 mr-3" />
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full p-2">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="w-full p-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}