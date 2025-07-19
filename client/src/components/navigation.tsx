import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Database, CheckSquare, BarChart3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeAuthModal } from '@/components/auth/NativeAuthModal';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserProfile } from "@/components/auth/UserProfile";
import { ReactiveStatusBar } from "@/components/ReactiveStatusBar";

export function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showNativeAuth, setShowNativeAuth] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/database", label: "Database", icon: Database },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  const NavButton = ({ href, label, icon: Icon, onClick }: any) => (
    <Link href={href}>
      <Button
        variant={isActive(href) ? "default" : "ghost"}
        size="sm"
        className="w-full justify-start text-sm font-medium h-12 px-4"
        onClick={onClick}
      >
        <Icon className="w-4 h-4 mr-3" />
        {label}
      </Button>
    </Link>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <CheckSquare className="text-white" size={16} />
                </div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900">Taflo</h1>
              </div>
            </Link>
            
            {/* Desktop Navigation Menu */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={isActive(href) ? "default" : "ghost"}
                    size="sm"
                    className="text-sm font-medium"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                </Link>
              ))}
              <div className="ml-4 flex items-center gap-4">
                <ReactiveStatusBar />
                <UserProfile />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-12 w-12 p-0">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <CheckSquare className="text-white" size={16} />
                        </div>
                        <h1 className="text-lg font-semibold text-slate-900">Taflo</h1>
                      </div>
                    </div>
                    <div className="flex-1 py-4 space-y-2 px-4">
                      {navItems.map(({ href, label, icon }) => (
                        <NavButton
                          key={href}
                          href={href}
                          label={label}
                          icon={icon}
                          onClick={() => setIsOpen(false)}
                        />
                      ))}
                    </div>
                    <div className="border-t p-4">
                      <UserProfile />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="grid grid-cols-3 h-16">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className={`flex flex-col items-center justify-center h-full px-2 ${
                isActive(href) 
                  ? 'text-primary bg-primary/10' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Native Auth Modal */}
      <NativeAuthModal open={showNativeAuth} onOpenChange={setShowNativeAuth} />
    </>
  );
}
