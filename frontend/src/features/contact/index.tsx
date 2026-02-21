import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(
    null
  );
  // Honeypot + timing
  const [hp, setHp] = useState('');
  const [formRenderedAt] = useState(() => Date.now());

  interface FormData {
    name: string;
    email: string;
    message: string;
  }

  interface ChangeEvent {
    target: {
      name: string;
      value: string;
    };
  }

  const handleChange = (e: ChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Honeypot check: if hidden field filled or submitted too fast, reject
      const elapsed = Date.now() - formRenderedAt;
      if (hp.trim() !== '' || elapsed < 2000) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setSubmitStatus('success'); // Pretend success to avoid tipping off bots
        setIsSubmitting(false);
        setFormData({ name: '', email: '', message: '' });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ContactItem = ({
    icon: Icon,
    text,
    href,
  }: {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    text: string;
    href?: string;
  }) => (
    <div className="flex items-center space-x-2.5 text-[12px]">
      <div className="flex items-center justify-center rounded w-7 h-7 bg-primary/10">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      {href ? (
        <a
          href={href}
          className="transition-colors text-muted-foreground hover:text-primary"
        >
          {text}
        </a>
      ) : (
        <span className="text-muted-foreground">{text}</span>
      )}
    </div>
  );

  return (
    <PageLayout
      header={<PageHeader>Contact</PageHeader>}
      subheader={
        <PageSubHeader>Drop a message and I'll respond shortly.</PageSubHeader>
      }
    >
      <PageContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px]">
                  Contact Information
                </CardTitle>
                <CardDescription className="text-[11px]">
                  You can also reach me through these channels:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ContactItem icon={Mail} text="Email available on request" />
                <ContactItem icon={Phone} text="Phone available upon request" />
                <ContactItem
                  icon={MapPin}
                  text="Remote or hybrid — Canada & worldwide"
                />
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-[13px]">Send a Message</CardTitle>
                <CardDescription className="text-[11px]">
                  Fill out this form to contact me directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Honeypot field: leave blank */}
                  <div aria-hidden="true" className="hidden">
                    <label htmlFor="company">Company (leave blank)</label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      autoComplete="off"
                      tabIndex={-1}
                      value={hp}
                      onChange={e => setHp(e.target.value)}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="name"
                      className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="message"
                      className="text-[11px] uppercase tracking-wider text-muted-foreground"
                    >
                      Message
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Type your message here..."
                      required
                      className="min-h-[100px] text-[12px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-8 text-[12px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1.5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {submitStatus && (
            <Alert
              variant={submitStatus === 'success' ? 'default' : 'destructive'}
              className={cn(
                'animate-in fade-in-0 slide-in-from-bottom-5',
                submitStatus === 'success'
                  ? 'bg-success/10 border-success/30 text-success-foreground'
                  : undefined
              )}
            >
              <AlertDescription>
                {submitStatus === 'success'
                  ? "Message sent successfully! I'll get back to you soon."
                  : 'Failed to send message. Please try again later.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default ContactPage;
