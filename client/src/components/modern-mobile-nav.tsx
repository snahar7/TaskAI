import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Database, 
  BarChart3, 
  Clock, 
  MessageSquare, 
  Menu,
  X,
  Target,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ModernMobileNav() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home, description: "Quick goal input" },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3, description: "Progress overview" },
    { href: "/standup", label: "AI Standup", icon: MessageSquare, description: "Weekly planning", badge: "AI" },
    { href: "/timeline", label: "Timeline", icon: Clock, description: "Smart scheduling" },
    { href: "/database", label: "Database", icon: Database, description: "All tasks & projects" },
  ];

  const NavButton = ({ href, label, icon: Icon, description, badge, onClick }: any) => (
    <Link href={href}>
      <Button
        variant={isActive(href) ? "default" : "ghost"}
        className={cn(
          "w-full justify-start h-auto p-4 text-left",
          isActive(href) 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={onClick}
      >
        <div className="flex items-center w-full">
          <Icon className="h-5 w-5 mr-4 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{label}</span>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <div className="text-xs opacity-70">{description}</div>
          </div>
        </div>
      </Button>
    </Link>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-background border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Target className="text-primary-foreground h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Taflo</h1>
              </div>
            </div>
          </Link>
          
          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                      <Target className="text-primary-foreground h-4 w-4" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-foreground">Taflo</h1>
                      <p className="text-xs text-muted-foreground">AI Task Manager</p>
                    </div>
                  </div>
                </div>
                
                {/* Navigation */}
                <div className="flex-1 p-6 space-y-2">
                  {navItems.map((item) => (
                    <NavButton
                      key={item.href}
                      {...item}
                      onClick={() => setIsOpen(false)}
                    />
                  ))}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Signed in as <span className="font-medium">Default User</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div className="grid grid-cols-4 h-16">
          {navItems.slice(0, 4).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className={cn(
                "flex flex-col items-center justify-center h-full px-2 transition-colors",
                isActive(href) 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground'
              )}>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}