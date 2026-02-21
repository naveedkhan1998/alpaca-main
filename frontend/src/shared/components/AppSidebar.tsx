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

const marketNavItems = [
  {
    path: '/',
    label: 'Watchlists',
    icon: TrendingUp,
    description: 'Track instruments',
  },
  {
    path: '/instruments',
    label: 'Instruments',
    icon: BarChart3,
    description: 'Browse assets',
  },
];

const systemNavItems = [
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

  const renderNavGroup = (label: string, items: typeof marketNavItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={`h-8 px-2.5 text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary font-medium'
                      : 'hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground border-l-2 border-transparent'
                  }`}
                >
                  <Link to={item.path} className="flex items-center gap-2.5">
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader className="border-b border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-12 hover:bg-sidebar-accent/50"
            >
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex items-center justify-center rounded size-7 bg-primary/15 ring-1 ring-primary/20">
                  <img
                    src="/android-chrome-192x192.png"
                    alt="Alpaca Logo"
                    className="object-contain size-8"
                  />
                </div>
                {state === 'expanded' && (
                  <div className="flex flex-col flex-1 text-left">
                    <span className="text-[13px] font-bold tracking-tight text-sidebar-foreground">
                      Alpaca
                    </span>
                    <span className="text-[10px] font-mono text-primary/70">
                      Terminal v2.0
                    </span>
                  </div>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-1">
        {renderNavGroup('Market', marketNavItems)}
        {renderNavGroup('System', systemNavItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60">
        {/* Footer Links and Copyright */}
        <SidebarFooterContent />

        {/* Theme Toggle */}
        <SidebarMenu>
          <SidebarMenuItem>
            {state === 'expanded' ? (
              <SidebarMenuButton
                onClick={toggleTheme}
                tooltip="Toggle theme"
                className="h-8 px-2.5 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Sun className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="font-mono">
                  {theme === 'dark' ? 'DARK' : 'LIGHT'}
                </span>
              </SidebarMenuButton>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      onClick={toggleTheme}
                      className="flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    >
                      {theme === 'dark' ? (
                        <Moon className="w-3.5 h-3.5" />
                      ) : (
                        <Sun className="w-3.5 h-3.5" />
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs">Toggle theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Health Status Dropdown */}
        <HealthStatus compact={state === 'collapsed'} />

        {isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-10 hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="rounded size-8">
                      <AvatarFallback className="text-[10px] font-bold rounded bg-primary/15 text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 text-left">
                      <span className="text-[12px] font-medium truncate">
                        {user?.name || 'User'}
                      </span>
                      <span className="text-[10px] truncate text-sidebar-foreground/50 font-mono">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-foreground/40" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-52 rounded-md"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-2 text-sm text-left">
                      <Avatar className="rounded w-7 h-7">
                        <AvatarFallback className="text-[10px] font-bold rounded bg-primary/15 text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 text-left">
                        <span className="text-[12px] font-medium truncate">
                          {user?.name || 'User'}
                        </span>
                        <span className="text-[11px] truncate text-muted-foreground font-mono">
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
                        className="flex items-center gap-2 cursor-pointer text-[13px]"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/accounts"
                        className="flex items-center gap-2 cursor-pointer text-[13px]"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Accounts</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-destructive focus:text-destructive text-[13px]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
                className="h-10 hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
