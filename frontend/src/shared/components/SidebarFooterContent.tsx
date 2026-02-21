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
    <div className="space-y-1.5">
      {/* Expanded View */}
      {state === 'expanded' && (
        <>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="relative flex-shrink-0">
                  <img
                    src="/android-chrome-192x192.png"
                    alt="Logo"
                    className="rounded size-8 ring-1 ring-border/30"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-sidebar-foreground">
                    Alpaca Trading
                  </span>
                  <span className="text-[9px] font-mono text-sidebar-foreground/50">
                    &copy; {currentYear} MNK
                  </span>
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-around px-2 py-0.5 text-[10px] font-mono">
                <Link
                  to="/privacy"
                  className="transition-colors text-sidebar-foreground/40 hover:text-sidebar-primary"
                >
                  Privacy
                </Link>
                <span className="text-sidebar-foreground/20">&middot;</span>
                <Link
                  to="/terms"
                  className="transition-colors text-sidebar-foreground/40 hover:text-sidebar-primary"
                >
                  Terms
                </Link>
                <span className="text-sidebar-foreground/20">&middot;</span>
                <Link
                  to="/contact"
                  className="transition-colors text-sidebar-foreground/40 hover:text-sidebar-primary"
                >
                  Support
                </Link>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </>
      )}

      {/* Collapsed View */}
      {state === 'collapsed' && (
        <SidebarMenu>
          <SidebarMenuItem>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className="flex items-center justify-center w-full py-1.5"
                  >
                    <img
                      src="/android-chrome-192x192.png"
                      alt="Logo"
                      className="rounded size-8 ring-1 ring-border/30"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-[11px]">
                    <p className="font-semibold">Alpaca Trading</p>
                    <p className="font-mono text-muted-foreground">
                      &copy; {currentYear} MNK
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
