import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './ThemeProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-full">
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Switch theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
