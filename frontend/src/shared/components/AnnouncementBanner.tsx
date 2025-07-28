import { useState } from 'react';

import { MdAnnouncement } from 'react-icons/md';
import { HiX } from 'react-icons/hi';
import { isDevelopment } from '@/lib/environment';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
  };

  if (isDevelopment || !isVisible) {
    return null;
  }

  return (
    <div className="flex justify-between w-full p-4 border-b border-border bg-card">
      <div className="flex items-center mx-auto">
        <p className="flex items-center text-sm font-normal text-muted-foreground">
          <MdAnnouncement className="w-4 h-4 mr-4" aria-hidden="true" />
          <span className="[&_p]:inline">
            This deployed version is using free services, so the limit for data
            being fetched is 1 month. To use, input your Breeze API key and
            secret in the account section, then follow the instructions to get
            the access token.
          </span>
        </p>
      </div>
      <button
        onClick={handleClose}
        className="transition-colors bg-transparent border-0 text-muted-foreground hover:text-foreground"
        aria-label="Close announcement"
      >
        <HiX className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
