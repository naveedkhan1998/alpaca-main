import { useEffect, useState } from 'react';
import { MdAnnouncement } from 'react-icons/md';
import { HiX } from 'react-icons/hi';
import { isDevelopment } from '@/lib/environment';

const STORAGE_KEY = 'announcement:dismissed:v1';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isDevelopment) return; // skip in dev
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsVisible(!dismissed);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (isDevelopment || !isVisible) return null;

  return (
    <div className="w-full border-b border-border/40 bg-surface-gradient">
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
        <p className="flex items-center text-xs sm:text-sm text-muted-foreground">
          <MdAnnouncement
            className="w-4 h-4 mr-2 text-primary"
            aria-hidden="true"
          />
          <span>
            This demo uses free services with a 1-month data limit. Provide your
            Breeze API key/secret in Accounts to enable full access.
          </span>
        </p>
        <button
          onClick={handleClose}
          className="p-1 transition-colors rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close announcement"
        >
          <HiX className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
