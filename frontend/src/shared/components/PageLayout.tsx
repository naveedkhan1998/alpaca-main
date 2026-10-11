import React, { useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Search, Info } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AssetSearch } from './AssetSearch';
import { ModeToggle } from './ModeToggle';
import { MobileTabBar } from './MobileTabBar';
import { useIsMobile } from '@/hooks/useMobile';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  getCurrentToken,
  getIsGuest,
  setGuestMode,
} from 'src/features/auth/authSlice';
import { clearGuestMode } from '@/lib/guestMode';

interface PageLayoutProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode;
  title?: string;
  className?: string;
  contentClassName?: string;
  variant?: 'default' | 'clean' | 'full-width';
}

export const PageHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h1
    className={`font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl ${className}`}
  >
    {children}
  </h1>
);

export const PageSubHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <p className={`max-w-2xl text-[13px] text-muted-foreground ${className}`}>
    {children}
  </p>
);

export const PageActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    {children}
  </div>
);

export const PageContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <main className={`w-full flex-1 ${className}`}>{children}</main>
);

const extractTextContent = (element: React.ReactNode): string => {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return element.toString();
  if (React.isValidElement(element)) {
    const propsChildren = (element.props as { children?: React.ReactNode })
      .children;
    if (!propsChildren) return '';
    if (typeof propsChildren === 'string') return propsChildren;
    if (typeof propsChildren === 'number') return propsChildren.toString();
    if (Array.isArray(propsChildren)) {
      return propsChildren
        .map((child: React.ReactNode) => extractTextContent(child))
        .filter(Boolean)
        .join(' ');
    }
    return extractTextContent(propsChildren);
  }
  return '';
};

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  header,
  subheader,
  actions,
  title,
  className = '',
  contentClassName = '',
  variant = 'default',
}) => {
  const extracted = header ? extractTextContent(header).trim() : '';
  const pageTitle = title || extracted || 'Alpaca Trading';
  const isMobile = useIsMobile();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(getCurrentToken);
  const isGuest = useAppSelector(getIsGuest);
  const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);
  const showSidebarLayout = Boolean(accessToken || isGuest);

  const isFullWidth = variant === 'full-width';

  // Tablets get the collapsed icon rail by default so content keeps its width.
  const defaultSidebarOpen =
    typeof window === 'undefined' ? true : window.innerWidth >= 1280;

  // Full-width pages (charts) go edge-to-edge; everything else is measured
  // against a readable column that still fills ultrawide displays.
  const containerClasses = isFullWidth
    ? 'w-full px-3 sm:px-4 lg:px-6'
    : 'mx-auto w-full max-w-[--content-max] px-4 sm:px-6 lg:px-8';

  const handleLogin = () => {
    clearGuestMode();
    dispatch(setGuestMode(false));
    window.location.href = '/login';
  };

  const guestBanner = isGuest ? (
    <div className="mb-5 flex flex-col gap-3 rounded-md border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="text-[13px] font-semibold text-foreground">
            Guest mode
          </p>
          <p className="text-[12px] text-muted-foreground">
            Read-only access. Log in to save watchlists, sync assets, and enable
            live updates.
          </p>
        </div>
      </div>
      <Button size="sm" className="shrink-0" onClick={handleLogin}>
        Log in
      </Button>
    </div>
  ) : null;

  const pageIntro = (header || subheader || actions) && (
    <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1 space-y-1">
        {header}
        {subheader}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );

  const body = (
    <div className={`${containerClasses} py-5 sm:py-6 lg:py-8`}>
      {guestBanner}
      {pageIntro}
      <div className={contentClassName}>{children}</div>
    </div>
  );

  // Unauthenticated: no rail, no chrome — just the page on the shell backdrop.
  if (!showSidebarLayout) {
    return (
      <>
        <Helmet key={pageTitle}>
          <title>{pageTitle} - Alpaca Trading</title>
        </Helmet>
        <div className={`app-shell flex min-h-[100dvh] flex-col ${className}`}>
          <div className="amber-rule h-[2px] w-full shrink-0" />
          <div className="flex-1">{body}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title={`${pageTitle} - Alpaca Trading`} key={pageTitle} />
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <AppSidebar />
        <SidebarInset className={`app-shell min-h-[100dvh] ${className}`}>
          <header className="shell-topbar sticky top-0 z-20 flex h-[--topbar-height] shrink-0 items-center gap-2 px-3 sm:px-4">
            <SidebarTrigger className="size-8 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" />
            <Separator orientation="vertical" className="mr-1 h-5" />

            <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
              {pageTitle}
            </h2>

            <Button
              variant="outline"
              size="sm"
              aria-label="Search assets"
              className="hidden h-8 min-w-[200px] justify-start gap-2 px-2.5 text-[12px] font-normal text-muted-foreground sm:inline-flex lg:min-w-[260px]"
              onClick={() => setIsAssetSearchOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search assets…</span>
              <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Search assets"
              className="size-8 shrink-0 text-muted-foreground sm:hidden"
              onClick={() => setIsAssetSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            <ModeToggle />
          </header>

          <AssetSearch
            open={isAssetSearchOpen}
            onOpenChange={(open: boolean) => setIsAssetSearchOpen(open)}
            isMobile={isMobile}
          />

          {/* Bottom padding clears the mobile tab bar */}
          <div className="flex-1 pb-[--mobile-nav-height] md:pb-0">{body}</div>

          <MobileTabBar
            onSearch={() => setIsAssetSearchOpen(true)}
            isAuthenticated={Boolean(accessToken)}
            onLogin={handleLogin}
          />
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default PageLayout;
