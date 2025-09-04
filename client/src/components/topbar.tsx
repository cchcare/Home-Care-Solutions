import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Search,
  Bell,
  Settings,
  LogOut,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OfficeSelector } from "@/components/office-selector";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  showOfficeSelector?: boolean;
  selectedOfficeId?: string;
  onOfficeChange?: (officeId: string) => void;
}

export function TopBar({ 
  title, 
  subtitle, 
  showOfficeSelector = false,
  selectedOfficeId,
  onOfficeChange 
}: TopBarProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center space-x-4">
        {(title || subtitle) && (
          <div className="hidden sm:block">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {showOfficeSelector && (
          <OfficeSelector
            selectedOfficeId={selectedOfficeId}
            onOfficeChange={onOfficeChange}
            showAllOption={true}
          />
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="hidden md:flex items-center bg-muted rounded-lg px-3 py-2 max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground mr-2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent border-0 focus:outline-none text-sm text-foreground placeholder-muted-foreground flex-1"
            data-testid="input-global-search"
          />
        </div>

        {/* Notifications */}
        <button 
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted" 
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
            0
          </span>
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted" 
              data-testid="button-user-menu"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {userInitials}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.email
                  }
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ') || 'User'}
                </p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}