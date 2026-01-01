import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toast } from 'sonner';
import {
  TrendingUp,
  BarChart3,
  Mail,
  User,
  Settings,
  LogOut,
  LogIn,
  ChevronsUpDown,
  Sun,
  Moon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getCurrentToken,
  getIsGuest,
  getLoggedInUser,
  logOut,
  setGuestMode,
} from 'src/features/auth/authSlice';
import { useTheme } from './ThemeProvider';
import HealthStatus from './HealthStatus';
import { removeToken } from '@/api/auth';
import SidebarFooterContent from './SidebarFooterContent';
import { clearGuestMode } from '@/lib/guestMode';

const navItems = [
  {
    path: '/',
    label: 'Watchlists',
    icon: TrendingUp,
    description: 'Manage your watchlists',
  },
  {
    path: '/instruments',
    label: 'Instruments',
    icon: BarChart3,
    description: 'Trading instruments',
  },
  {
    path: '/contact',
    label: 'Support',
    icon: Mail,
    description: 'Help & contact',
  },
];

export const AppSidebar: React.FC<React.ComponentProps<typeof Sidebar>> = ({
  ...props
}) => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(getLoggedInUser);
  const access_token = useAppSelector(getCurrentToken);
  const isGuest = useAppSelector(getIsGuest);
  const { theme, setTheme } = useTheme();
  const { state } = useSidebar();

  const signOut = () => {
    removeToken();
    clearGuestMode();
    dispatch(setGuestMode(false));
    dispatch(logOut());
    window.location.reload();
    toast.success('Logged Out Successfully');
  };

  const handleLogin = () => {
    clearGuestMode();
    dispatch(setGuestMode(false));
    window.location.href = '/login';
  };

  if (!access_token && !isGuest) return null;

  const isAuthenticated = Boolean(access_token);

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : isAuthenticated
      ? 'U'
      : 'G';

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-sidebar-accent"
            >
              <Link to="/" className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-lg size-8 bg-primary/10">
                  <img
                    src="/android-chrome-192x192.png"
                    alt="Alpaca"
                    className="w-5 h-5"
                  />
                </div>
                {state === 'expanded' && (
                  <div className="flex flex-col flex-1 text-left">
                    <span className="text-sm font-semibold truncate">
                      Alpaca Trading
                    </span>
                    <span className="text-xs truncate text-sidebar-foreground/70">
                      Dashboard
                    </span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-medium text-sidebar-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-10 px-3"
                    >
                      <Link to={item.path} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Footer Links and Copyright */}
        <SidebarFooterContent />

        {/* Theme Toggle and Health Status Row */}
        {state === 'expanded' && (
          <div className="w-full px-2 py-2 space-y-1">
            <button
              onClick={toggleTheme}
              className="group flex w-full items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/50 hover:text-foreground"
            >
              <span className="relative flex items-center justify-center w-4 h-4">
                <Sun className="w-4 h-4 transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute w-4 h-4 transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
              </span>
              <span className="flex items-center gap-1">
                {theme === 'dark' ? 'Dark' : 'Light'}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  mode
                </span>
              </span>
            </button>
            <HealthStatus />
          </div>
        )}

        {state === 'collapsed' && (
          <div className="flex flex-col items-center w-full gap-1 px-2 py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center transition-all border rounded-full h-9 w-9 border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-foreground"
                  >
                    <span className="relative flex items-center justify-center w-4 h-4">
                      <Sun className="w-4 h-4 transition-all scale-100 rotate-0 dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute w-4 h-4 transition-all scale-0 rotate-90 dark:rotate-0 dark:scale-100" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Toggle theme</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <HealthStatus compact />
          </div>
        )}

        {isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-12 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="w-8 h-8 rounded-lg">
                      <AvatarFallback className="text-xs font-semibold rounded-lg bg-primary/10">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left">
                      <span className="text-sm font-medium truncate">
                        {user?.name || 'User'}
                      </span>
                      <span className="text-xs truncate text-sidebar-foreground/70">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/70" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="w-8 h-8 rounded-lg">
                        <AvatarFallback className="text-xs font-semibold rounded-lg bg-primary/10">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 text-left">
                        <span className="text-sm font-medium truncate">
                          {user?.name || 'User'}
                        </span>
                        <span className="text-xs truncate text-muted-foreground">
                          {user?.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/accounts"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Accounts</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={handleLogin}
                className="h-12 gap-2 hover:bg-sidebar-accent"
              >
                <div className="flex items-center justify-center rounded-lg size-8 bg-primary/10">
                  <LogIn className="w-4 h-4 text-primary" />
                </div>
                <div
                  className={`flex-col flex-1 text-left ${state === 'collapsed' ? 'hidden' : 'flex'}`}
                >
                  <span className="text-sm font-medium truncate">Guest</span>
                  <span className="text-xs truncate text-sidebar-foreground/70">
                    Log in for full access
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
