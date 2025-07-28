import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  <div className={`mb-4 sm:mb-6 ${className}`}>
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
      {children}
    </h1>
  </div>
);

export const PageSubHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div
    className={`mb-4 sm:mb-6 lg:mb-8 text-base sm:text-lg text-muted-foreground leading-relaxed ${className}`}
  >
    {children}
  </div>
);

export const PageActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`flex flex-wrap items-center gap-3 mb-8 ${className}`}>
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
  return 'ICICI Breeze';
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
  const pageTitle = header ? extractTextContent(header) : 'ICICI Breeze';
  const isMobile = useIsMobile();

  // Use clean variant on mobile by default
  const effectiveVariant =
    variant === 'default' && isMobile ? 'clean' : variant;

  const getContainerClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return 'px-4 py-8 mx-auto sm:px-6 lg:px-8';
      case 'full-width':
        return 'px-4 py-8 sm:px-6 lg:px-8';
      default:
        return 'container mx-auto px-4 py-8 sm:px-6 lg:px-8';
    }
  };

  const getContentClasses = () => {
    switch (effectiveVariant) {
      case 'clean':
        return `${contentClassName}`;
      case 'full-width':
        return `${contentClassName}`;
      default:
        return `bg-card text-card-foreground border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${contentClassName}`;
    }
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle} - ICICI Breeze</title>
      </Helmet>
      <div
        className={`flex flex-col min-h-[100dvh] bg-gradient-to-br from-background via-background to-background/95 ${className}`}
      >
        <Navbar />

        <div className="flex-1 w-full">
          <div className={getContainerClasses()}>
            {/* Header Section */}
            {(header || subheader || actions) && (
              <div className="mb-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-2">
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
                {(header || subheader || actions) && (
                  <Separator className="mt-8" />
                )}
              </div>
            )}

            {/* Content Section */}
            {effectiveVariant === 'default' ? (
              <Card className={getContentClasses()}>
                <CardContent className="p-8">{children}</CardContent>
              </Card>
            ) : (
              <div className={getContentClasses()}>
                {effectiveVariant === 'clean' ? (
                  <div className="space-y-6">{children}</div>
                ) : (
                  children
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t bg-background/50 backdrop-blur-sm">
          <div className="container px-4 py-6 mx-auto sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center space-x-2">
                <img
                  src="/android-chrome-192x192.png"
                  alt="Logo"
                  className="w-6 h-6 rounded"
                />
                <span className="text-sm text-muted-foreground">
                  © 2024 ICICI Breeze. All rights reserved.
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <Link
                  to="/privacy"
                  className="transition-colors hover:text-foreground"
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="transition-colors hover:text-foreground"
                >
                  Terms
                </Link>
                <Link
                  to="/support"
                  className="transition-colors hover:text-foreground"
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
