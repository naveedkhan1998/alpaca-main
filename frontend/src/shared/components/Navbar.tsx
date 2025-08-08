import type React from 'react';
import { useState, useEffect } from 'react';
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
      description: 'Overview & Analytics',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      path: '/instruments',
      label: 'Instruments',
      icon: BarChart3,
      description: 'Trading Instruments',
      color: 'from-green-500 to-emerald-500',
    },
    {
      path: '/accounts',
      label: 'Account',
      icon: TrendingUp,
      description: 'Account Management',
      color: 'from-purple-500 to-pink-500',
    },
    {
      path: '/about',
      label: 'About',
      icon: Info,
      description: 'Developer Information',
      color: 'from-orange-500 to-red-500',
    },
    {
      path: '/contact',
      label: 'Support',
      icon: Mail,
      description: 'Help & Contact',
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
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
              <img
                src="/android-chrome-192x192.png"
                alt="Alpaca"
                className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-border/40"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
                  Alpaca Trading
                </span>
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">Dashboard</Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Search Bar */}
            <div className="flex-1 hidden lg:flex max-w-lg mx-6">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search symbols, instruments…"
                  value={searchQuery}
                  disabled
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-4 bg-muted/40 border-border/40 focus:bg-background/70"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`group relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'text-primary bg-primary/10 ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <Separator orientation="vertical" className="mx-2 h-6" />
              {/* Desktop Actions */}
              <div className="flex items-center gap-2">
                <ModeToggle />
                <HealthStatus />
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 px-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
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
                        <div className="hidden xl:flex flex-col items-start">
                          <span className="text-sm font-medium leading-none">
                            {user?.name || 'Naveed Khan'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user?.is_admin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                      <div className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-background bg-success" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 p-2">
                    <DropdownMenuLabel className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
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
            <div className="flex items-center gap-2 lg:hidden">
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
                  {/* Header with close button */}
                  <div className="relative p-6 pb-4">
                    {/* User Profile Card */}
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
                            <div className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-background bg-success" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-foreground">
                              {user?.name || 'Naveed Khan'}
                            </h3>
                            <p className="mb-2 text-sm text-muted-foreground">
                              {user?.email || ''}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="default" className="text-xs font-medium">
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

                  {/* Search Bar */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search symbols…"
                        value={searchQuery}
                        disabled
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-11 pl-11 text-base rounded-xl bg-muted/40 border-border/40"
                      />
                    </div>
                  </div>

                  {/* Navigation Grid */}
                  <div className="flex-1 p-6 space-y-3 overflow-y-auto ">
                    <h4 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                      Pages
                    </h4>
          <div className="grid grid-cols-2 gap-3 mb-6">
                      {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
              className={`group relative overflow-hidden rounded-xl transition-all duration-200 ${
                              isActive
                ? 'ring-1 ring-primary/30 shadow-sm'
                : 'hover:ring-1 hover:ring-border/50'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Card
                className={`h-24 ${
                                isActive
                  ? 'bg-primary/5'
                  : 'bg-muted/30 hover:bg-muted/40'
                              }`}
                            >
                <CardContent className="flex h-full flex-col justify-between p-4">
                                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow`}
                                >
                  <item.icon className="h-5 w-5 text-white" />
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
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
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
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </Link>

                      <button
                        className="flex w-full items-center justify-between p-4 rounded-xl bg-destructive/10 hover:bg-destructive/15 transition-colors"
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600">
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
                        <ChevronRight className="h-5 w-5 text-destructive/70" />
                      </button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
