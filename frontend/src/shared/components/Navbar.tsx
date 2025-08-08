import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { toast } from 'sonner';
import {
  TrendingUp,
  User,
  Home,
  BarChart3,
  Info,
  Mail,
  Menu,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  Bell,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import {
  getCurrentToken,
  getLoggedInUser,
  logOut,
} from 'src/features/auth/authSlice';
import { ModeToggle } from './ModeToggle';
import HealthStatus from './HealthStatus';
import { removeToken } from '@/api/auth';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const access_token = useAppSelector(getCurrentToken);
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const user = useAppSelector(getLoggedInUser);

  const isActivePath = useMemo(
    () => (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const signOut = () => {
    removeToken();
    dispatch(logOut());
    window.location.reload();
    toast.success('Logged Out Successfully');
  };

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: Home,
      description: 'Overview & analytics',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      path: '/instruments',
      label: 'Instruments',
      icon: BarChart3,
      description: 'Trading instruments',
      color: 'from-green-500 to-emerald-500',
    },
    {
      path: '/accounts',
      label: 'Account',
      icon: TrendingUp,
      description: 'Account management',
      color: 'from-purple-500 to-pink-500',
    },
    {
      path: '/about',
      label: 'About',
      icon: Info,
      description: 'Developer information',
      color: 'from-orange-500 to-red-500',
    },
    {
      path: '/contact',
      label: 'Support',
      icon: Mail,
      description: 'Help & contact',
      color: 'from-indigo-500 to-purple-500',
    },
  ];

  if (!access_token) return null;

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full border-b transition-colors duration-200 ${
          isScrolled
            ? 'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-border/60'
            : 'bg-background/60 backdrop-blur-sm border-border/40'
        }`}
      >
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <img
                src="/android-chrome-192x192.png"
                alt="Alpaca"
                className="w-8 h-8 rounded-lg shadow-sm ring-1 ring-border/40 group-hover:scale-[1.03] transition-transform"
              />
              <div className="flex-col hidden sm:flex">
                <span className="text-lg font-semibold tracking-tight sm:text-xl text-foreground">
                  Alpaca Trading
                </span>
                <div className="items-center hidden gap-2 sm:flex">
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-[10px]"
                  >
                    Dashboard
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Search */}
            <div className="flex-1 hidden max-w-xl mx-4 lg:mx-6 lg:flex">
              <div className="relative w-full">
                <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search symbols, instruments…"
                  value={searchQuery}
                  disabled
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pr-16 h-9 pl-9 bg-muted/40 border-border/40 focus:bg-background/70"
                />
                <span className="hidden md:inline-flex items-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border/60">
                  <span className="font-mono">Ctrl</span>
                  <span className="font-mono">K</span>
                </span>
              </div>
            </div>

            {/* Desktop Navigation & Actions */}
            <div className="items-center hidden gap-2 lg:flex">
              <nav className="items-center hidden gap-1 md:flex">
                {navItems.map(item => {
                  const active = isActivePath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all ${
                        active
                          ? 'text-primary bg-primary/10 ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                      {active && (
                        <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <Separator orientation="vertical" className="h-6 mx-2" />

              {/* Quick actions */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-1 w-52">
                    <DropdownMenuItem className="gap-2">
                      <Plus className="w-4 h-4" /> New order
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Plus className="w-4 h-4" /> New watchlist
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <Plus className="w-4 h-4" /> New alert
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />
                </Button>
                <ModeToggle />
                <HealthStatus />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative px-2 rounded-full h-9"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={
                              user?.avatar ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                            }
                            alt="Profile"
                          />
                          <AvatarFallback className="font-semibold bg-muted text-foreground">
                            {user?.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('') || 'NK'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-col items-start hidden xl:flex">
                          <span className="text-sm font-medium leading-none">
                            {user?.name || 'Naveed Khan'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user?.is_admin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                      <div className="absolute w-3 h-3 border-2 rounded-full -right-1 -bottom-1 border-background bg-success" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-2 w-72">
                    <DropdownMenuLabel className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={
                              user?.avatar ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                            }
                            alt="Profile"
                          />
                          <AvatarFallback className="bg-muted">
                            NK
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email || ''}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {user?.is_admin ? 'Admin' : 'User'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {user?.auth_provider}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="p-3 cursor-pointer">
                      <Link to="/profile" className="flex items-center">
                        <User className="w-4 h-4 mr-3" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            Account Settings
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Manage your profile and preferences
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-3 cursor-pointer">
                      <Settings className="w-4 h-4 mr-3" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          Trading Settings
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Configure trading preferences
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={signOut}
                      className="p-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Sign Out</span>
                        <span className="text-xs text-muted-foreground">
                          End your session
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1 lg:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <ModeToggle />
              <HealthStatus />
              <Drawer
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[95dvh] p-0 bg-background/95">
                  <div className="relative p-6 pb-4">
                    {/* Profile */}
                    <Card className="mt-2 border-border/40">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Avatar className="h-14 w-14 ring-1 ring-border/40">
                              <AvatarImage
                                src={
                                  user?.avatar ||
                                  `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                                }
                                alt="Profile"
                              />
                              <AvatarFallback className="text-base font-bold bg-muted">
                                {user?.name
                                  ?.split(' ')
                                  .map((n: string) => n[0])
                                  .join('') || 'NK'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute w-4 h-4 border-2 rounded-full -right-1 -bottom-1 border-background bg-success" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-foreground">
                              {user?.name || 'Naveed Khan'}
                            </h3>
                            <p className="mb-2 text-sm text-muted-foreground">
                              {user?.email || ''}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="default"
                                className="text-xs font-medium"
                              >
                                {user?.is_admin ? 'Admin' : 'User'}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {user?.auth_provider}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Mobile Search */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search symbols…"
                        value={searchQuery}
                        disabled
                        onChange={e => setSearchQuery(e.target.value)}
                        className="text-base h-11 pl-11 rounded-xl bg-muted/40 border-border/40"
                      />
                    </div>
                  </div>

                  {/* Nav grid */}
                  <div className="flex-1 p-6 space-y-3 overflow-y-auto">
                    <h4 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                      Pages
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {navItems.map(item => {
                        const active = isActivePath(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`group relative overflow-hidden rounded-xl transition-all duration-200 ${
                              active
                                ? 'ring-1 ring-primary/30 shadow-sm'
                                : 'hover:ring-1 hover:ring-border/50'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Card
                              className={`h-24 ${active ? 'bg-primary/5' : 'bg-muted/30 hover:bg-muted/40'}`}
                            >
                              <CardContent className="flex flex-col justify-between h-full p-4">
                                <div
                                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow`}
                                >
                                  <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-foreground">
                                    {item.label}
                                  </h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {item.description}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Quick Actions */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                        Quick Actions
                      </h4>

                      <Link
                        to="/profile"
                        className="flex items-center justify-between p-4 transition-colors rounded-xl bg-muted/30 hover:bg-muted/40"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              Account Settings
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Manage your profile
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </Link>

                      <button
                        className="flex items-center justify-between w-full p-4 transition-colors rounded-xl bg-destructive/10 hover:bg-destructive/15"
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                            <LogOut className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-destructive">
                              Sign Out
                            </span>
                            <p className="text-xs text-destructive/70">
                              End your session
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-destructive/70" />
                      </button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile floating action button */}
      <div className="fixed z-50 -translate-x-1/2 lg:hidden bottom-16 left-1/2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="w-12 h-12 rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            sideOffset={12}
            className="w-56 p-1"
          >
            <DropdownMenuItem className="gap-2">
              <Plus className="w-4 h-4" /> New order
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Plus className="w-4 h-4" /> New watchlist
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Plus className="w-4 h-4" /> New alert
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile bottom tab bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-[700px] px-4">
          <div className="grid h-16 grid-cols-5">
            {navItems.map(item => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center justify-center gap-1 text-[11px] ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon
                    className={`transition-all ${active ? 'w-6 h-6' : 'w-5 h-5'}`}
                  />
                  <span className="leading-none">{item.label}</span>
                  {active && (
                    <span className="absolute -top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
