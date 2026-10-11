import type React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, LogIn } from 'lucide-react';
import { marketNavItems } from './AppSidebar';

interface MobileTabBarProps {
  onSearch: () => void;
  isAuthenticated: boolean;
  onLogin: () => void;
}

const tabClasses =
  'relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors';

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  onSearch,
  isAuthenticated,
  onLogin,
}) => {
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <nav
      aria-label="Primary"
      className="shell-tabbar fixed inset-x-0 bottom-0 z-30 flex h-[--mobile-nav-height] items-stretch px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {marketNavItems.map(item => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={`${tabClasses} ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <span
              aria-hidden
              className={`absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-primary transition-opacity ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <item.icon className="h-[18px] w-[18px]" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onSearch}
        className={`${tabClasses} text-muted-foreground`}
      >
        <Search className="h-[18px] w-[18px]" />
        <span>Search</span>
      </button>

      {isAuthenticated ? (
        <Link
          to="/profile"
          aria-current={isActive('/profile') ? 'page' : undefined}
          className={`${tabClasses} ${
            isActive('/profile') ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <span
            aria-hidden
            className={`absolute inset-x-4 top-0 h-[2px] rounded-b-full bg-primary transition-opacity ${
              isActive('/profile') ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <User className="h-[18px] w-[18px]" />
          <span>Profile</span>
        </Link>
      ) : (
        <button
          type="button"
          onClick={onLogin}
          className={`${tabClasses} text-primary`}
        >
          <LogIn className="h-[18px] w-[18px]" />
          <span>Log in</span>
        </button>
      )}
    </nav>
  );
};

export default MobileTabBar;
