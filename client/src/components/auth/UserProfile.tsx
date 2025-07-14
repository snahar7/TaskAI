import { useState } from 'react';
import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNativeAuth } from '@/hooks/useNativeAuth';
import { LogOut, Settings, User } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { NativeAuthModal } from './NativeAuthModal';

export function UserProfile() {
  const { user: firebaseUser, logout: firebaseLogout, loading: firebaseLoading } = useAuth();
  const { user: nativeUser, logout: nativeLogout, loading: nativeLoading } = useNativeAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [nativeAuthModalOpen, setNativeAuthModalOpen] = useState(false);
  
  // Use either Firebase or native user, preferring native
  const user = nativeUser || firebaseUser;
  const loading = nativeLoading || firebaseLoading;
  
  // Debug logging
  // console.log('UserProfile render - user:', user, 'loading:', loading);

  const handleLogout = async () => {
    try {
      if (nativeUser) {
        await nativeLogout();
      } else if (firebaseUser) {
        await firebaseLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (firstName?: string, lastName?: string, displayName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (displayName) {
      const parts = displayName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return displayName[0]?.toUpperCase() || '';
    }
    if (email) {
      return email[0]?.toUpperCase() || '';
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.firstName) return user.firstName;
    return user?.email || 'User';
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setNativeAuthModalOpen(true)}
            className="text-sm font-medium"
          >
            Sign in
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setAuthModalOpen(true)}
            className="text-sm font-medium"
          >
            Google
          </Button>
        </div>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        <NativeAuthModal open={nativeAuthModalOpen} onOpenChange={setNativeAuthModalOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage 
                src={user.profilePicture || undefined} 
                alt={getUserDisplayName()} 
              />
              <AvatarFallback className="text-xs">
                {getInitials(user.firstName, user.lastName, user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {getUserDisplayName()}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <Link href="/profile">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <NativeAuthModal open={nativeAuthModalOpen} onOpenChange={setNativeAuthModalOpen} />
    </>
  );
}