import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string;
  profilePicture: string;
}

interface UserAvatarProps {
  userId: number | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const getInitials = (firstName: string, lastName: string, displayName: string) => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  }
  if (displayName) {
    const words = displayName.split(' ');
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`;
    }
    return displayName.charAt(0);
  }
  return "U";
};

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base"
};

export function UserAvatar({ userId, size = "md", showTooltip = true, className = "" }: UserAvatarProps) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false,
  });

  if (!userId) {
    return (
      <div className={`flex items-center ${className}`}>
        <Avatar className={`${sizeClasses[size]} bg-gray-100`}>
          <AvatarFallback className="bg-gray-200 text-gray-500">
            ?
          </AvatarFallback>
        </Avatar>
        {showTooltip && (
          <span className="ml-2 text-sm text-gray-500">Unassigned</span>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <Avatar className={`${sizeClasses[size]} bg-gray-100 animate-pulse`}>
          <AvatarFallback className="bg-gray-200">
            ?
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center ${className}`}>
        <Avatar className={`${sizeClasses[size]} bg-gray-100`}>
          <AvatarFallback className="bg-gray-200 text-gray-500">
            ?
          </AvatarFallback>
        </Avatar>
        {showTooltip && (
          <span className="ml-2 text-sm text-gray-500">Unknown User</span>
        )}
      </div>
    );
  }

  const initials = getInitials(user.firstName, user.lastName, user.displayName);
  const displayName = user.displayName || `${user.firstName} ${user.lastName}`.trim();

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center cursor-pointer ${className}`}>
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.profilePicture || ""} alt={displayName} />
              <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{displayName}</p>
          {user.firstName && user.lastName && (
            <p className="text-xs text-gray-500">{user.firstName} {user.lastName}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={user.profilePicture || ""} alt={displayName} />
        <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}