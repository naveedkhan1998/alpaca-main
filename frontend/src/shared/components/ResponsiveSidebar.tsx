// components/ResponsiveSidebar.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button'; // Adjust paths as needed for your setup
import { Card } from '@/components/ui/card';
import { HiMenu, HiX } from 'react-icons/hi';

interface ResponsiveSidebarProps {
  children: React.ReactNode;
  isFullscreen: boolean;
}

const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  isFullscreen,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="w-full md:w-96">
      {/* Toggle Button for Mobile */}
      <div className="flex justify-end p-2 md:hidden">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Sidebar"
          size="icon"
        >
          {isOpen ? (
            <HiX className="w-6 h-6" />
          ) : (
            <HiMenu className="w-6 h-6" />
          )}
        </Button>
      </div>
      {/* Sidebar Content */}
      {isOpen && (
        <div className="hidden md:block">
          <Card className="h-full overflow-y-auto">{children}</Card>
        </div>
      )}
      {/* Sidebar for Mobile */}
      {isOpen && (
        <div className="block md:hidden">
          <Card className="h-full overflow-y-auto">{children}</Card>
        </div>
      )}
    </div>
  );
};

export default ResponsiveSidebar;
