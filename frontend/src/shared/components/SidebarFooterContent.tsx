import type React from 'react';
import { Link } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Compact legal strip. The brand lives in the sidebar header, so it is
 * deliberately not repeated here, and nothing renders on the icon rail.
 */
const SidebarFooterContent: React.FC = () => {
  const { state } = useSidebar();
  const currentYear = new Date().getFullYear();

  if (state === 'collapsed') return null;

  return (
    <div className="flex items-center gap-1.5 px-2 pt-0.5 font-mono text-[10px] text-sidebar-foreground/35">
      <Link
        to="/privacy"
        className="transition-colors hover:text-sidebar-foreground/70"
      >
        Privacy
      </Link>
      <span aria-hidden>&middot;</span>
      <Link
        to="/terms"
        className="transition-colors hover:text-sidebar-foreground/70"
      >
        Terms
      </Link>
      <span className="ml-auto whitespace-nowrap">
        &copy; {currentYear} MNK
      </span>
    </div>
  );
};

export default SidebarFooterContent;
