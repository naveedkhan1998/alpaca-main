import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/useMobile';

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
  <div className={`flex flex-wrap items-center gap-3 mb-8 animate-fade-in ${className}`}
    style={{ animationDelay: '0.2s' }}>
    {children}
  </div>
);

export const PageContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <main className={`flex-1 w-full animate-fade-in ${className}`}
    style={{ animationDelay: '0.3s' }}>
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
        return `rounded-2xl bg-gradient-to-br from-card/50 to-card/30 border border-border/50 backdrop-blur-sm ${contentClassName}`;
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} - Alpaca Trading</title>
      </Helmet>
      <div
        className={`flex min-h-[100dvh] flex-col bg-background pb-20 lg:pb-0 ${className}`}
      >
        <Navbar />

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

        {/* Footer */}
        <footer className="border-t bg-background/90 backdrop-blur-xl shadow-[0_-2px_16px_rgba(0,0,0,0.04)]">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center space-x-3">
                <img
                  src="/android-chrome-192x192.png"
                  alt="Logo"
                  className="w-7 h-7 rounded-lg ring-2 ring-border/40"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  © {new Date().getFullYear()} MNK All rights reserved.
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm font-medium text-muted-foreground">
                <Link
                  to="/privacy"
                  className="transition-all hover:text-foreground hover:underline underline-offset-4"
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="transition-all hover:text-foreground hover:underline underline-offset-4"
                >
                  Terms
                </Link>
                <Link
                  to="/contact"
                  className="transition-all hover:text-foreground hover:underline underline-offset-4"
                >
                  Support
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PageLayout;
