import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Server,
  KeyRound,
  FileText,
  BarChart3,
  Globe2,
  ShieldCheck,
} from 'lucide-react';

const PrivacyPage = () => {
  const sections = [
    {
      icon: Server,
      title: 'Self-Hosted Scope',
      content: [
        'Alpaca API Wrapper is distributed as open-source software; the maintainers do not run a hosted service',
        'Any personal or financial data remains within the infrastructure you deploy (Docker, databases, cloud, etc.)',
        'Default setup keeps services on your local machine or private network',
        'Remove the project if you are unable to maintain the responsibilities that come with self-hosting',
      ],
    },
    {
      icon: KeyRound,
      title: 'Credentials & Session Data',
      content: [
        'API keys and secrets live in `.envs/.env` files or environment variables you control',
        "Login tokens and feature flags may be stored in your browser's local storage to support the UI",
        'Secrets are never transmitted to the maintainers or shared upstream by default',
        'Scrub credentials before submitting bug reports, screenshots, or logs to the community',
      ],
    },
    {
      icon: FileText,
      title: 'Logs & Diagnostics',
      content: [
        'Application logs, database dumps, and Celery task data stay on the hosts you operate',
        'There is no built-in log shipping, cloud backup, or remote monitoring provided by the maintainers',
        'Configure retention, masking, and rotation for any sensitive audit trails you create',
        'Before sharing diagnostic bundles, review and redact personal or regulated information',
      ],
    },
    {
      icon: BarChart3,
      title: 'Analytics & Telemetry',
      content: [
        'The project does not enable analytics by default; Google Analytics 4 activates only if you supply `VITE_GA4_MEASUREMENT_ID`',
        'When enabled, usage data such as page views or feature events is sent directly from your deployment to Google',
        "Review Google's terms and obtain any required consents before turning analytics on",
        'Remove or replace the analytics integration if it conflicts with your compliance requirements',
      ],
    },
    {
      icon: Globe2,
      title: 'Third-Party Services',
      content: [
        'Connecting to the Alpaca API or other brokerages sends data governed by their respective privacy policies',
        'You are responsible for configuring webhook URLs, data feeds, and integrations that touch external systems',
        'Monitor updates to third-party terms, rate limits, and retention policies that may affect your deployment',
        'Ensure you have authority to process data retrieved from external APIs before storing or redistributing it',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Your Privacy Responsibilities',
      content: [
        'If you host this project for others, publish your own privacy notice that reflects your deployment choices',
        'Comply with regional data laws (GDPR, CCPA, etc.) that apply to your users and infrastructure',
        'Regularly audit custom code, dependencies, and contributions for security and privacy implications',
        'Document data flows and access controls so stakeholders know how information is handled',
      ],
    },
  ];

  return (
    <PageLayout
      header={<PageHeader>Privacy Policy</PageHeader>}
      subheader={
        <PageSubHeader>
          This policy describes how the open-source Alpaca API Wrapper handles
          data by default and what changes when you self-host or extend the
          project.
        </PageSubHeader>
      }
      variant="clean"
    >
      <PageContent>
        {/* Last Updated */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> October 25, 2025
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This Privacy Policy outlines the information practices of the
              Alpaca API Wrapper repository and sample applications. Because you
              run the stack yourself, you control what data is collected,
              transmitted, or retained.
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
            <h3 className="mb-4 text-xl font-bold">
              Planning a Production Deployment?
            </h3>
            <p className="mb-4 text-muted-foreground">
              Review the README and infrastructure docs for guidance on securing
              Docker services, databases, and secrets management. Adapt this
              policy to match your environment before onboarding teammates or
              end users.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:contact@mnaveedk.com"
                  className="text-primary hover:underline"
                >
                  contact@mnaveedk.com
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
