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
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {href ? (
        <a href={href} className="text-muted-foreground hover:text-primary">
          {text}
        </a>
      ) : (
        <span className="text-muted-foreground">{text}</span>
      )}
    </div>
  );

  return (
    <PageLayout
      header={<PageHeader>Get in Touch</PageHeader>}
      subheader={
        <PageSubHeader>
          Whether you're looking to collaborate, hire, or just connect—drop a
          message and I'll respond shortly.
        </PageSubHeader>
      }
    >
      <PageContent>
        <div className="space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  You can also reach me through these channels:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ContactItem icon={Mail} text="Email available on request" />
                <ContactItem
                  icon={Phone}
                  text="Phone number available upon request"
                />
                <ContactItem
                  icon={MapPin}
                  text="Open to remote or hybrid roles in Canada & worldwide"
                />
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Send a Message</CardTitle>
                <CardDescription>
                  Fill out this form to contact me directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Type your message here..."
                      required
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
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
                  ? 'Message sent successfully! I\'ll get back to you soon.'
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
