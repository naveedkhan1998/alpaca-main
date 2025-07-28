import { ChangeEvent } from 'react';
import { ExternalLink, Loader2, KeyRound, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UpdateSessionTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken: string;
  onSessionTokenChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onUpdate: () => void;
  isUpdating: boolean;
  apiKey: string;
  onOpenLink: (apiKey: string) => void;
}

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const UpdateSessionTokenDialog = ({
  open,
  onOpenChange,
  sessionToken,
  onSessionTokenChange,
  onUpdate,
  isUpdating,
  apiKey,
  onOpenLink,
}: UpdateSessionTokenDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="p-0 sm:max-w-lg">
      <DialogHeader className="p-6 pb-4">
        <DialogTitle className="text-2xl font-bold">
          Refresh Your Session
        </DialogTitle>
        <DialogDescription>
          Follow these steps to securely update your session token.
        </DialogDescription>
      </DialogHeader>

      <motion.div
        className="px-6 py-4 space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
      >
        <motion.div variants={stepVariants} className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 text-lg font-bold rounded-full bg-primary text-primary-foreground">
            1
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Launch ICICI Breeze</h3>
            <p className="text-sm text-muted-foreground">
              Click the button below to open the login portal.
            </p>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => onOpenLink(apiKey)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open ICICI Breeze Portal
            </Button>
          </div>
        </motion.div>

        <motion.div variants={stepVariants} className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 text-lg font-bold rounded-full bg-primary text-primary-foreground">
            2
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Log In & Copy Token</h3>
            <p className="text-sm text-muted-foreground">
              After logging in, copy the session token from the URL.
            </p>
          </div>
        </motion.div>

        <motion.div variants={stepVariants} className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 text-lg font-bold rounded-full bg-primary text-primary-foreground">
            3
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Paste Your Token</h3>
            <p className="text-sm text-muted-foreground">
              Paste the copied token into the field below to finalize.
            </p>
            <div className="relative mt-2">
              <KeyRound className="absolute w-5 h-5 -translate-y-1/2 text-muted-foreground left-3 top-1/2" />
              <Input
                placeholder="Enter Session Token"
                value={sessionToken}
                onChange={onSessionTokenChange}
                className="w-full pl-10"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>

      <DialogFooter className="flex-col gap-2 p-6 bg-muted/50 sm:flex-row">
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          onClick={onUpdate}
          disabled={isUpdating || !sessionToken}
          className="w-full sm:w-auto"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying & Updating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Update Token
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default UpdateSessionTokenDialog;
