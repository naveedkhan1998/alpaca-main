import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertCircle, Shield, Users, Gavel, Ban } from 'lucide-react';

const TermsPage = () => {
  const sections = [
    {
      icon: Users,
      title: 'User Accounts',
      content: [
        'You must be at least 18 years old to create an account',
        'You are responsible for maintaining the security of your account',
        'You must provide accurate and complete information',
        'One person or legal entity may maintain only one account',
        'Account credentials must not be shared with others',
      ],
    },
    {
      icon: Shield,
      title: 'Trading Services',
      content: [
        'Our platform provides access to trading markets and financial instruments',
        'All trades are executed through our partner brokers',
        'Trading involves risk and you may lose your entire investment',
        'Past performance does not guarantee future results',
        'We do not provide investment advice or recommendations',
      ],
    },
    {
      icon: AlertCircle,
      title: 'Risk Disclosure',
      content: [
        'Trading securities involves significant risk of loss',
        'You should only trade with money you can afford to lose',
        'Market conditions can change rapidly',
        'Leverage amplifies both gains and losses',
        'You are solely responsible for your trading decisions',
      ],
    },
    {
      icon: Gavel,
      title: 'Platform Usage',
      content: [
        'You agree to use the platform in accordance with all applicable laws',
        'Automated trading bots require explicit authorization',
        'Market manipulation and fraudulent activities are strictly prohibited',
        'We reserve the right to suspend accounts violating terms',
        'System availability is not guaranteed 24/7',
      ],
    },
    {
      icon: Ban,
      title: 'Prohibited Activities',
      content: [
        'Attempting to gain unauthorized access to our systems',
        'Using the platform for money laundering or illegal activities',
        'Manipulating market prices or engaging in wash trading',
        'Sharing account access or selling account credentials',
        'Reverse engineering or attempting to copy our software',
      ],
    },
    {
      icon: FileText,
      title: 'Fees and Payments',
      content: [
        'Trading fees and commissions apply as disclosed in our fee schedule',
        'Fees are subject to change with 30 days notice',
        'You are responsible for all taxes on trading gains',
        'Withdrawals may be subject to processing fees',
        'Currency conversion fees may apply to international transactions',
      ],
    },
  ];

  return (
    <PageLayout
      header={
        <PageHeader>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <span>Terms of Service</span>
          </div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Please read these terms carefully before using our trading platform.
          By using our services, you agree to be bound by these terms.
        </PageSubHeader>
      }
      variant="clean"
    >
      <PageContent>
        {/* Last Updated */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> October 3, 2025
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              These Terms of Service ("Terms") govern your access to and use of
              Alpaca Trading platform and services. By creating an account and
              using our services, you accept and agree to be bound by these
              Terms.
            </p>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="mb-8 border-destructive/30 bg-gradient-to-br from-destructive/5 to-warning/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold mb-2">Important Notice</h3>
                <p className="text-sm text-muted-foreground">
                  Trading involves substantial risk of loss and is not suitable
                  for all investors. You should carefully consider whether
                  trading is appropriate for you in light of your experience,
                  objectives, financial resources, and other relevant
                  circumstances.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section, index) => (
            <Card
              key={index}
              className="transition-all hover:shadow-lg hover:border-primary/30"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-lg">{section.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {section.content.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Terms */}
        <Card className="mt-8 border-border/50 bg-gradient-to-br from-card/60 to-muted/30">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold mb-4">Limitation of Liability</h3>
            <p className="text-sm text-muted-foreground mb-4">
              To the maximum extent permitted by law, Alpaca Trading shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages, or any loss of profits or revenues, whether
              incurred directly or indirectly, or any loss of data, use,
              goodwill, or other intangible losses.
            </p>
            <h3 className="text-xl font-bold mb-4 mt-6">Modifications</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We reserve the right to modify these Terms at any time. We will
              notify you of any material changes via email or through the
              platform. Your continued use of the service after such
              notification constitutes acceptance of the modified Terms.
            </p>
            <h3 className="text-xl font-bold mb-4 mt-6">Contact Us</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:legal@alpacatrading.com"
                  className="text-primary hover:underline"
                >
                  legal@alpacatrading.com
                </a>
              </p>
              <p>
                <strong>Support:</strong>{' '}
                <a href="/contact" className="text-primary hover:underline">
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  );
};

export default TermsPage;
