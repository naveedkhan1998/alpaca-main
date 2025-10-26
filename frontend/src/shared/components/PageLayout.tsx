import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AssetSearch } from './AssetSearch';
import { useIsMobile } from '@/hooks/useMobile';
import { useAppSelector } from '../../app/hooks';
import { getCurrentToken } from 'src/features/auth/authSlice';

interface PageLayoutProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: 'default' | 'clean' | 'full-width';
}

export const PageHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`mb-4 sm:mb-6 animate-fade-in ${className}`}>
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground">
      {children}
    </h1>
  </div>
);

export const PageSubHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`mb-6 sm:mb-8 text-base sm:text-lg text-muted-foreground leading-relaxed animate-fade-in ${className}`}
    style={{ animationDelay: '0.1s' }}
  >
    {children}
  </div>
);

export const PageActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`flex flex-wrap items-center gap-3 mb-8 animate-fade-in ${className}`}
    style={{ animationDelay: '0.2s' }}
  >
    {children}
  </div>
);

export const PageContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <main
    className={`flex-1 w-full animate-fade-in ${className}`}
    style={{ animationDelay: '0.3s' }}
  >
    {children}
  </main>
);

const extractTextContent = (element: React.ReactNode): string => {
  if (typeof element === 'string') return element;
  if (typeof element === 'number') return element.toString();
  if (React.isValidElement(element)) {
    if (typeof element.props.children === 'string') {
      return element.props.children;
    }
    if (Array.isArray(element.props.children)) {
      return element.props.children
        .map((child: React.ReactNode) => extractTextContent(child))
        .join('');
    }
    return extractTextContent(element.props.children);
  }
  return 'Alpaca Trading';
};

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  header,
  subheader,
  actions,
  className = '',
  contentClassName = '',
  variant = 'default',
}) => {
  const pageTitle = header ? extractTextContent(header) : 'Alpaca Trading';
  const isMobile = useIsMobile();
  const accessToken = useAppSelector(getCurrentToken);
  const [isAssetSearchOpen, setIsAssetSearchOpen] = useState(false);

  // Use clean variant on mobile by default
  const effectiveVariant =
    variant === 'default' && isMobile ? 'clean' : variant;

  const getContainerClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return 'mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10';
      case 'full-width':
        return 'w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10';
      default:
        return 'mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10';
    }
  };

  const getContentClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return `${contentClassName}`;
      case 'full-width':
        return `${contentClassName}`;
      default:
        return `rounded-2xl bg-gradient-to-br min-h-[calc(100dvh-22rem)] from-card/50 to-card/30 border border-border/50 backdrop-blur-sm ${contentClassName}`;
    }
  };

  // If user is not logged in, show simplified layout without sidebar
  if (!accessToken) {
    return (
      <>
        <Helmet>
          <title>{pageTitle} - Alpaca Trading</title>
        </Helmet>
        <div
          className={`flex min-h-[100dvh] flex-col bg-background ${className}`}
        >
          <div className="flex-1 w-full">
            <div className={getContainerClasses()}>
              {/* Header Section */}
              {(header || subheader || actions) && (
                <div className="mb-8 sm:mb-10">
                  <div className="p-6 border rounded-2xl border-border/50 bg-gradient-to-br from-card/60 to-muted/30 backdrop-blur-sm shadow-premium sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-3">
                        {header}
                        {subheader}
                      </div>
                      {actions && (
                        <div className="flex-shrink-0">
                          <div className="flex flex-wrap items-center gap-3">
                            {actions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Content Section */}
              {effectiveVariant === 'default' ? (
                <Card className={getContentClasses()}>
                  <CardContent className="p-6 sm:p-8">{children}</CardContent>
                </Card>
              ) : (
                <div className={getContentClasses()}>
                  {effectiveVariant === 'clean' ? (
                    <div className="space-y-6 sm:space-y-8">{children}</div>
                  ) : (
                    children
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle} - Alpaca Trading</title>
      </Helmet>
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
            onOpenChange={setIsAssetSearchOpen}
            isMobile={isMobile}
          />

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto scrollbar-hidden">
            <div className="flex-1 w-full bg-background">
              <div className={getContainerClasses()}>
                {/* Header Section */}
                {(header || subheader || actions) && (
                  <div className="mb-8 sm:mb-10">
                    <div className="p-6 border rounded-2xl border-border/50 bg-gradient-to-br from-card/60 to-muted/30 backdrop-blur-sm shadow-premium sm:p-8">
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1 space-y-3">
                          {header}
                          {subheader}
                        </div>
                        {actions && (
                          <div className="flex-shrink-0">
                            <div className="flex flex-wrap items-center gap-3">
                              {actions}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Section */}
                {effectiveVariant === 'default' ? (
                  <Card className={getContentClasses()}>
                    <CardContent className="p-6 sm:p-8">{children}</CardContent>
                  </Card>
                ) : (
                  <div className={getContentClasses()}>
                    {effectiveVariant === 'clean' ? (
                      <div className="space-y-6 sm:space-y-8">{children}</div>
                    ) : (
                      children
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};

export default PageLayout;
