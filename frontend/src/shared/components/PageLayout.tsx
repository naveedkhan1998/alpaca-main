import React, { useState } from 'react';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Search } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { AssetSearch } from './AssetSearch';
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
  <div className={`mb-2 ${className}`}>
    <h1 className="text-xl font-semibold tracking-tight sm:text-2xl text-foreground">
      {children}
    </h1>
  </div>
);

export const PageSubHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`text-sm text-muted-foreground ${className}`}>{children}</div>
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
  <main className={`flex-1 w-full ${className}`}>{children}</main>
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

  // Use clean variant on mobile by default
  const effectiveVariant =
    variant === 'default' && isMobile ? 'clean' : variant;

  const getContainerClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return 'mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6';
      case 'full-width':
        return 'w-full px-4 py-4 sm:px-6 sm:py-6';
      default:
        return 'mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6';
    }
  };

  const getContentClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return `${contentClassName}`;
      case 'full-width':
        return `${contentClassName}`;
      default:
        return `${contentClassName}`;
    }
  };

  const handleLogin = () => {
    clearGuestMode();
    dispatch(setGuestMode(false));
    window.location.href = '/login';
  };

  const guestBanner = isGuest ? (
    <div className="p-4 mb-6 text-sm border rounded-lg border-primary/20 bg-primary/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">Guest mode</p>
          <p className="text-muted-foreground">
            Read-only access. Log in to save watchlists, sync assets, and enable
            live updates.
          </p>
        </div>
        <Button size="sm" onClick={handleLogin}>
          Log in
        </Button>
      </div>
    </div>
  ) : null;

  // If user is not logged in and not in guest mode, show simplified layout without sidebar
  if (!showSidebarLayout) {
    return (
      <>
        <Helmet key={pageTitle}>
          <title>{pageTitle} - Alpaca Trading</title>
        </Helmet>
        <div
          className={`flex min-h-[100dvh] flex-col bg-background ${className}`}
        >
          <div className="flex-1 w-full">
            <div className={getContainerClasses()}>
              {guestBanner}
              {/* Header Section */}
              {(header || subheader || actions) && (
                <div className="mb-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-2">
                      {header}
                      {subheader}
                    </div>
                    {actions && (
                      <div className="flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {actions}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Section */}
              <div className={getContentClasses()}>{children}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title={`${pageTitle} - Alpaca Trading`} key={pageTitle} />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset
          className={`md:rounded-md shadow border m-auto h-[100dvh] md:max-h-[calc(100dvh-1rem)] flex flex-col ${className}`}
        >
          {/* Header with sidebar trigger */}
          <header className="sticky top-0 z-10 flex items-center h-16 gap-2 px-4 transition-[width,height] ease-linear shrink-0 border-b bg-background/95 backdrop-blur-[0.099rem] supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6 mr-2" />
            <div className="flex items-center justify-between flex-1 gap-2">
              <h2 className="text-lg font-semibold">{pageTitle}</h2>
              {/* search button cntrl + k to open */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setIsAssetSearchOpen(true)}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search Assets</span>
                <span className="hidden text-xs sm:inline text-muted-foreground">
                  (Ctrl + K)
                </span>
              </Button>
            </div>
          </header>

          <AssetSearch
            open={isAssetSearchOpen}
            onOpenChange={(open: boolean) => setIsAssetSearchOpen(open)}
            isMobile={isMobile}
          />

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto scrollbar-hidden">
            <div className="flex-1 w-full bg-background">
              <div className={getContainerClasses()}>
                {guestBanner}
                {/* Header Section */}
                {(header || subheader || actions) && (
                  <div className="mb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-2">
                        {header}
                        {subheader}
                      </div>
                      {actions && (
                        <div className="flex-shrink-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {actions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Content Section */}
                <div className={getContentClasses()}>{children}</div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default PageLayout;
