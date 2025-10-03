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
  Mail,
  Menu,
  Settings,
  LogOut,
  Search,
  ChevronRight,
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
import { AssetSearch } from './AssetSearch';
import { useIsMobile } from '@/hooks/useMobile';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const access_token = useAppSelector(getCurrentToken);
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);
  const user = useAppSelector(getLoggedInUser);
  const isMobile = useIsMobile();

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
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          isScrolled
            ? 'bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 border-border/70 shadow-sm'
            : 'bg-background/70 backdrop-blur-lg border-border/50'
        }`}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[4.5rem]">
            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img
                  src="/android-chrome-192x192.png"
                  alt="Alpaca"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md ring-2 ring-border/50 group-hover:ring-primary/40 group-hover:scale-105 transition-all duration-200"
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300 -z-10" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Alpaca Trading
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="px-2 py-0.5 text-[10px] font-semibold"
                  >
                    Dashboard
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Search */}
            <div className="flex-1 hidden max-w-2xl mx-6 lg:flex">
              <button
                onClick={() => setIsAssetSearchOpen(true)}
                className="relative w-full group"
              >
                <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3.5 top-1/2 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                <div className="w-full h-10 pl-10 pr-20 flex items-center rounded-lg bg-muted/30 border border-border/60 hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 cursor-pointer">
                  <span className="text-sm text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
                    Search assets, add to watchlist...
                  </span>
                </div>
                <span className="hidden md:inline-flex items-center gap-1.5 absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-medium text-muted-foreground/80 ring-1 ring-border/70 bg-muted/30">
                  <span className="font-mono font-semibold">Ctrl</span>
                  <span className="font-mono font-semibold">K</span>
                </span>
              </button>
            </div>

            {/* Desktop Navigation & Actions */}
            <div className="items-center hidden gap-3 lg:flex">
              <nav className="items-center hidden gap-1.5 md:flex">
                {navItems.map(item => {
                  const active = isActivePath(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'text-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 ${active ? 'animate-pulse-blue' : ''}`}
                      />
                      <span>{item.label}</span>
                      {active && (
                        <span className="absolute inset-x-4 -bottom-1 h-1 rounded-full bg-gradient-to-r from-primary to-accent" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <Separator orientation="vertical" className="h-8 mx-1" />

              {/* Quick actions */}
              <div className="flex items-center gap-1.5">
                <ModeToggle />
                <HealthStatus />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative px-2 rounded-xl h-11 hover:bg-muted/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-9 h-9 ring-2 ring-border/50">
                          <AvatarImage
                            src={
                              user?.avatar ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                            }
                            alt="Profile"
                          />
                          <AvatarFallback className="font-bold bg-gradient-to-br from-primary/20 to-accent/20 text-foreground">
                            {user?.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('') || 'NK'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-col items-start hidden xl:flex">
                          <span className="text-sm font-semibold leading-none">
                            {user?.name || 'Naveed Khan'}
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {user?.is_admin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                      <div className="absolute w-3 h-3 border-2 rounded-full -right-0.5 -bottom-0.5 border-background bg-success animate-pulse" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="p-2 w-80 animate-scale-in"
                  >
                    <DropdownMenuLabel className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                          <AvatarImage
                            src={
                              user?.avatar ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                            }
                            alt="Profile"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-bold text-base">
                            NK
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1.5">
                          <p className="text-base font-bold">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user?.email || ''}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold"
                            >
                              {user?.is_admin ? 'Admin' : 'User'}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-xs font-semibold"
                            >
                              {user?.auth_provider}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      asChild
                      className="p-3 cursor-pointer rounded-lg hover:bg-muted/70 transition-colors"
                    >
                      <Link to="/profile" className="flex items-center">
                        <User className="w-4 h-4 mr-3" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            Account Settings
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Manage your profile and preferences
                          </span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="p-3 cursor-pointer rounded-lg hover:bg-muted/70 transition-colors">
                      <Settings className="w-4 h-4 mr-3" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
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
                      className="p-3 cursor-pointer rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">Sign Out</span>
                        <span className="text-xs opacity-80">
                          End your session
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl"
                onClick={() => setIsAssetSearchOpen(true)}
              >
                <Search className="w-5 h-5" />
              </Button>
              <ModeToggle />
              <HealthStatus />
              <Drawer
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
              >
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[95dvh] p-0 bg-background/98 backdrop-blur-xl">
                  <div className="relative p-6 pb-4">
                    {/* Profile */}
                    <Card className="mt-2 border-border/60 shadow-lg bg-gradient-to-br from-card to-muted/20">
                      <CardContent className="p-5">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 ring-2 ring-border/60">
                              <AvatarImage
                                src={
                                  user?.avatar ||
                                  `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                                }
                                alt="Profile"
                              />
                              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-accent/20">
                                {user?.name
                                  ?.split(' ')
                                  .map((n: string) => n[0])
                                  .join('') || 'NK'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute w-4 h-4 border-2 rounded-full -right-0.5 -bottom-0.5 border-background bg-success animate-pulse" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-foreground">
                              {user?.name || 'Naveed Khan'}
                            </h3>
                            <p className="mb-2 text-sm text-muted-foreground">
                              {user?.email || ''}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="default"
                                className="text-xs font-semibold"
                              >
                                {user?.is_admin ? 'Admin' : 'User'}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-xs font-semibold"
                              >
                                {user?.auth_provider}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Nav grid */}
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    <h4 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                      Navigation
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {navItems.map(item => {
                        const active = isActivePath(item.path);
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`group relative overflow-hidden rounded-2xl transition-all duration-200 ${
                              active
                                ? 'ring-2 ring-primary/40 shadow-lg'
                                : 'hover:ring-2 hover:ring-border/60 hover:shadow-md'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Card
                              className={`h-28 ${active ? 'bg-gradient-to-br from-primary/10 to-accent/10' : 'bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/50 hover:to-muted/30'}`}
                            >
                              <CardContent className="flex flex-col justify-between h-full p-4">
                                <div
                                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
                                >
                                  <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-foreground">
                                    {item.label}
                                  </h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
                      <h4 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                        Quick Actions
                      </h4>

                      <Link
                        to="/profile"
                        className="flex items-center justify-between p-4 transition-all rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/50 hover:to-muted/30 hover:shadow-md"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
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
                        className="flex items-center justify-between w-full p-4 transition-all rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/10 hover:from-destructive/20 hover:to-destructive/15 hover:shadow-md"
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                            <LogOut className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <span className="font-semibold text-destructive">
                              Sign Out
                            </span>
                            <p className="text-xs text-destructive/80">
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

      {/* Asset Search Modal/Drawer */}
      <AssetSearch
        open={isAssetSearchOpen}
        onOpenChange={setIsAssetSearchOpen}
        isMobile={isMobile}
      />

      {/* Mobile bottom tab bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/90 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] safe-area-inset-bottom"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      >
        <div className="mx-auto max-w-[700px] px-4">
          <div className="grid h-16 grid-cols-4 gap-1">
            {navItems.map(item => {
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center justify-center gap-1.5 text-[11px] font-medium rounded-xl transition-all duration-200 ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <item.icon
                    className={`transition-all ${active ? 'w-6 h-6' : 'w-5 h-5'}`}
                  />
                  <span className="leading-none">{item.label}</span>
                  {active && (
                    <span className="absolute top-0 h-1 w-8 rounded-full bg-gradient-to-r from-primary to-accent" />
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
