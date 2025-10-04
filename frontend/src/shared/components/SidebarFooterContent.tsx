import type React from 'react';
import { Link } from 'react-router-dom';
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const SidebarFooterContent: React.FC = () => {
  const { state } = useSidebar();
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-3">
      {/* Expanded View */}
      {state === 'expanded' && (
        <>
          {/* Logo and Copyright */}
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="relative flex-shrink-0">
                  <img
                    src="/android-chrome-192x192.png"
                    alt="Logo"
                    className="w-8 h-8 rounded-lg shadow-sm ring-2 ring-border/40"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground">
                    Alpaca Trading
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    © {currentYear} MNK
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Links */}
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-around px-2 py-1 text-xs font-medium">
                <Link
                  to="/privacy"
                  className="transition-all text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                >
                  Privacy
                </Link>
                <span className="text-border">•</span>
                <Link
                  to="/terms"
                  className="transition-all text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                >
                  Terms
                </Link>
                <span className="text-border">•</span>
                <Link
                  to="/contact"
                  className="transition-all text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                >
                  Support
                </Link>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </>
      )}

      {/* Collapsed View - Just Logo with Tooltip */}
      {state === 'collapsed' && (
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className="flex items-center justify-center w-full py-2"
                  >
                    <img
                      src="/android-chrome-192x192.png"
                      alt="Logo"
                      className="w-6 h-6 rounded-md shadow-sm ring-2 ring-border/40"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-xs">
                    <p className="font-semibold">Alpaca Trading</p>
                    <p className="text-muted-foreground">
                      © {currentYear} MNK
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </div>
  );
};

export default SidebarFooterContent;
