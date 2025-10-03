import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, Database, UserCheck, FileText } from 'lucide-react';

const PrivacyPage = () => {
  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: [
        'Personal identification information (name, email address, phone number)',
        'Trading account information and transaction history',
        'Device information and usage data',
        'Cookies and similar tracking technologies',
      ],
    },
    {
      icon: Lock,
      title: 'How We Use Your Information',
      content: [
        'To provide and maintain our trading services',
        'To process your transactions and manage your account',
        'To send you important notifications and updates',
        'To improve our services and user experience',
        'To comply with legal obligations and prevent fraud',
      ],
    },
    {
      icon: Shield,
      title: 'Data Security',
      content: [
        'We use industry-standard encryption to protect your data',
        'Secure servers with regular security audits',
        'Multi-factor authentication options',
        'Regular backup and disaster recovery procedures',
        'Strict access controls for employee data access',
      ],
    },
    {
      icon: Eye,
      title: 'Information Sharing',
      content: [
        'We do not sell your personal information to third parties',
        'Information may be shared with service providers who assist in operations',
        'Data may be disclosed to comply with legal requirements',
        'Anonymous, aggregated data may be used for analytics',
      ],
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: [
        'Access and review your personal information',
        'Request correction of inaccurate data',
        'Request deletion of your data (subject to legal requirements)',
        'Opt-out of marketing communications',
        'Export your data in a portable format',
      ],
    },
    {
      icon: FileText,
      title: 'Data Retention',
      content: [
        'Account information is retained while your account is active',
        'Transaction records are kept for regulatory compliance (typically 7 years)',
        'Marketing data is retained until you opt-out',
        'Cookies and tracking data follow our cookie policy',
      ],
    },
  ];

  return (
    <PageLayout
      header={
        <PageHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span>Privacy Policy</span>
          </div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Your privacy is important to us. This policy outlines how we collect,
          use, and protect your personal information.
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
              This Privacy Policy explains how Alpaca Trading ("we", "us", or
              "our") collects, uses, and protects your personal information when
              you use our platform.
            </p>
          </CardContent>
        </Card>

        {/* Privacy Sections */}
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

        {/* Contact Section */}
        <Card className="mt-8 border-border/50 bg-gradient-to-br from-card/60 to-muted/30">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold mb-4">Questions About Privacy?</h3>
            <p className="text-muted-foreground mb-4">
              If you have any questions or concerns about our privacy practices,
              please don't hesitate to contact us.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:privacy@alpacatrading.com"
                  className="text-primary hover:underline"
                >
                  privacy@alpacatrading.com
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

export default PrivacyPage;
