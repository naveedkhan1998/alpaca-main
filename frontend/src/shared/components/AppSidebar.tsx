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
  Github,
  PanelLeftClose,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getCurrentToken,
  getIsGuest,
  getLoggedInUser,
  logOut,
  setGuestMode,
} from 'src/features/auth/authSlice';
import HealthStatus from './HealthStatus';
import { removeToken } from '@/api/auth';
import SidebarFooterContent from './SidebarFooterContent';
import { clearGuestMode } from '@/lib/guestMode';
import { useGetWatchListsQuery } from '@/api/watchlistService';

export const marketNavItems = [
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

export const systemNavItems = [
  {
    path: '/accounts',
    label: 'Accounts',
    icon: Settings,
    description: 'Broker connections',
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
  const { state, toggleSidebar } = useSidebar();

  const collapsed = state === 'collapsed';
  const isAuthenticated = Boolean(access_token);

  // Cached by RTK Query — the watchlists page already requests this.
  const { data: watchlists } = useGetWatchListsQuery(
    {},
    { skip: !isAuthenticated }
  );

  const navCounts: Record<string, number | undefined> = {
    '/': watchlists?.count,
  };

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

  const renderNavGroup = (label: string, items: typeof marketNavItems) => (
    <SidebarGroup className="px-2 py-1.5">
      <SidebarGroupLabel className="h-6 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map(item => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            const count = navCounts[item.path];
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{
                    children: (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    ),
                  }}
                  className="group/nav relative h-9 rounded-md px-2.5 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold"
                >
                  <Link
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex items-center gap-2.5"
                  >
                    {/* Active marker: a solid amber tick on the rail edge */}
                    <span
                      aria-hidden
                      className={`absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <item.icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-primary'
                          : 'text-sidebar-foreground/55 group-hover/nav:text-sidebar-foreground'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {typeof count === 'number' && count > 0 && (
                  <SidebarMenuBadge className="pointer-events-none h-5 min-w-5 justify-center rounded-full bg-sidebar-accent px-1.5 font-mono text-[10px] text-sidebar-foreground/70 peer-data-[size=default]/menu-button:top-1/2 peer-data-[size=default]/menu-button:-translate-y-1/2 peer-data-[active=true]/menu-button:bg-primary/15 peer-data-[active=true]/menu-button:text-primary">
                    {count > 99 ? '99+' : count}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader className="h-[--topbar-height] justify-center border-b border-sidebar-border px-2">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Alpaca Terminal"
                className="h-9 rounded-md hover:bg-sidebar-accent"
              >
                <Link to="/" className="flex items-center gap-2.5">
                  <span className="brand-mark flex size-6 shrink-0 items-center justify-center rounded font-display text-[13px] font-bold leading-none">
                    A
                  </span>
                  {!collapsed && (
                    <span className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="truncate font-display text-[13px] font-bold tracking-tight text-sidebar-foreground">
                        Alpaca
                      </span>
                      <span className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
                        Terminal
                      </span>
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* In-place collapse control, so the action lives where the rail is */}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                Collapse
                <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">
                  ⌘B
                </kbd>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-1">
        {renderNavGroup('Market', marketNavItems)}
        <SidebarSeparator className="mx-2 bg-sidebar-border" />
        {renderNavGroup('System', systemNavItems)}
      </SidebarContent>

      <SidebarFooter className="gap-1.5 border-t border-sidebar-border p-2">
        <HealthStatus compact={collapsed} />

        {!collapsed && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-8 rounded-md px-2 text-[11px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <a
                  href="https://github.com/naveedkhan1998/alpaca-main"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2"
                >
                  <Github className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-mono uppercase tracking-[0.12em]">
                    Open source
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {isAuthenticated ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-11 rounded-md border border-sidebar-border/80 px-2 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-7 rounded">
                      <AvatarFallback className="rounded bg-primary text-[10px] font-bold text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                      <span className="truncate text-[12px] font-medium">
                        {user?.name || 'User'}
                      </span>
                      <span className="truncate font-mono text-[10px] text-sidebar-foreground/50">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/40" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-md"
                  side="top"
                  align="start"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-2 text-left">
                      <Avatar className="size-7 rounded">
                        <AvatarFallback className="rounded bg-primary text-[10px] font-bold text-primary-foreground">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[12px] font-medium">
                          {user?.name || 'User'}
                        </span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
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
                        className="flex cursor-pointer items-center gap-2 text-[13px]"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/accounts"
                        className="flex cursor-pointer items-center gap-2 text-[13px]"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Accounts</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer text-[13px] text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-3.5 w-3.5" />
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
                tooltip="Log in"
                className="h-11 rounded-md border border-primary/30 bg-primary/5 px-2 hover:bg-primary/10"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary/15">
                  <LogIn className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                  <span className="truncate text-[12px] font-semibold">
                    Guest
                  </span>
                  <span className="truncate text-[10px] text-sidebar-foreground/55">
                    Log in for full access
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <SidebarFooterContent />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
