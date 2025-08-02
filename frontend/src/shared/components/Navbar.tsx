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
  Sparkles,
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
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          isScrolled
            ? 'bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/95 shadow-lg border-border/50'
            : 'bg-background/98 backdrop-blur-md border-border/30'
        }`}
      >
        <div className="container px-4 mx-auto sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo Section */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img
                  src="/android-chrome-192x192.png"
                  alt="Logo"
                  className="flex items-center justify-center w-10 h-10 transition-all duration-300 shadow-lg rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 group-hover:shadow-xl group-hover:scale-105"
                />
                <div className="absolute transition-opacity duration-300 opacity-0 -inset-1 bg-gradient-to-br from-primary/20 to-transparent rounded-xl group-hover:opacity-100 blur-sm" />
              </div>
              <div className="flex-col sm:flex">
                <span className="text-xl font-bold tracking-tight text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                  Alpaca Trading
                </span>
                <div className="items-center hidden space-x-2 sm:flex">
                  <Badge
                    variant="secondary"
                    className="text-xs px-2 py-0.5 font-medium"
                  >
                    Platform
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Search Bar */}
            <div className="flex-1 hidden max-w-md mx-8 lg:flex">
              <div className="relative w-full">
                <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search instruments, symbols..."
                  value={searchQuery}
                  disabled={true}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 pr-4 transition-all duration-200 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="items-center hidden space-x-1 lg:flex">
              <nav className="flex items-center space-x-1">
                {navItems.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg group ${
                        isActive
                          ? 'text-primary bg-primary/10 shadow-sm border border-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2.5 transition-transform group-hover:scale-110" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="absolute w-1 h-1 transform -translate-x-1/2 rounded-full -bottom-1 left-1/2 bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
              <Separator orientation="vertical" className="h-8 mx-4" />
              {/* Desktop Actions */}
              <div className="flex items-center space-x-2">
                <ModeToggle />
                <HealthStatus />
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 px-3 rounded-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <Avatar className="w-8 h-8 transition-all duration-200 hover:scale-105">
                          <AvatarImage
                            src={
                              user?.avatar ||
                              `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                            }
                            alt="Profile"
                          />
                          <AvatarFallback className="font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                            {user?.name
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('') || 'NK'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-col items-start hidden xl:flex">
                          <span className="text-sm font-medium">
                            {user?.name || 'Naveed Khan'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user?.is_admin ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                      <div className="absolute w-3 h-3 border-2 rounded-full -bottom-1 -right-1 bg-success border-background" />
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
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
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
            <div className="flex items-center space-x-2 lg:hidden">
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
                <DrawerContent className="h-[95dvh] p-0 bg-gradient-to-br from-background/20 via-background/50 to-muted/20 ">
                  {/* Header with close button */}
                  <div className="relative p-6 pb-4">
                    {/* User Profile Card */}
                    <Card className="mt-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
                              <AvatarImage
                                src={
                                  user?.avatar ||
                                  `https://ui-avatars.com/api/?name=${user?.name}&background=random`
                                }
                                alt="Profile"
                              />
                              <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                {user?.name
                                  ?.split(' ')
                                  .map((n: string) => n[0])
                                  .join('') || 'NK'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute flex items-center justify-center w-5 h-5 border-2 rounded-full -bottom-1 -right-1 bg-success border-background">
                              <Sparkles className="w-2.5 h-2.5 text-white" />
                            </div>
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

                  {/* Search Bar */}
                  <div className="px-6 pb-4">
                    <div className="relative">
                      <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search instruments, symbols..."
                        value={searchQuery}
                        disabled={true}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-12 pl-12 text-base border-0 rounded-2xl bg-muted/50 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Navigation Grid */}
                  <div className="flex-1 p-6 space-y-3 overflow-y-auto ">
                    <h4 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                      Pages
                    </h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                              isActive
                                ? 'ring-2 ring-primary/30 shadow-lg scale-[1.02]'
                                : 'hover:scale-[1.02] hover:shadow-md'
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <Card
                              className={`h-24 border-0 ${
                                isActive
                                  ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
                                  : 'bg-gradient-to-br from-muted/50 to-muted/20 hover:from-muted/70 hover:to-muted/30'
                              }`}
                            >
                              <CardContent className="flex flex-col justify-between h-full p-4">
                                <div
                                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}
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
                        className="flex items-center justify-between p-4 transition-all duration-200 rounded-2xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
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
                        <ChevronRight className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-foreground" />
                      </Link>

                      <button
                        className="flex items-center justify-between w-full p-4 transition-all duration-200 rounded-2xl bg-gradient-to-r from-red-500/10 to-red-500/5 hover:from-red-500/20 hover:to-red-500/10 group"
                        onClick={() => {
                          signOut();
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600">
                            <LogOut className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <span className="font-medium text-red-600 dark:text-red-400">
                              Sign Out
                            </span>
                            <p className="text-xs text-red-500/70">
                              End your session
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 transition-colors text-red-500/70 group-hover:text-red-500" />
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
