import { Link, useLocation } from "wouter";
import { Home, Database, CheckSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CheckSquare className="text-white" size={16} />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">Taflo</h1>
            </div>
          </Link>
          
          {/* Navigation Menu */}
          <div className="flex space-x-1">
            <Link href="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                size="sm"
                className="text-sm font-medium"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            
            <Link href="/database">
              <Button
                variant={isActive("/database") ? "default" : "ghost"}
                size="sm"
                className="text-sm font-medium"
              >
                <Database className="w-4 h-4 mr-2" />
                Database
              </Button>
            </Link>
            
            <Link href="/dashboard">
              <Button
                variant={isActive("/dashboard") ? "default" : "ghost"}
                size="sm"
                className="text-sm font-medium"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
