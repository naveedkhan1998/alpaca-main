import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileCode,
  Server,
  KeyRound,
  Scale,
  Users,
  AlertCircle,
} from 'lucide-react';

const TermsPage = () => {
  const sections = [
    {
      icon: FileCode,
      title: 'Project Scope',
      content: [
        'Alpaca API Wrapper is an open-source toolkit for building market data workflows and trading experiments',
        'The maintainers do not operate a hosted brokerage, managed service, or financial product',
        'Use is intended for developers who understand self-hosting and Alpaca API integration requirements',
        'You must comply with Alpaca Markets terms and all applicable market and data regulations',
      ],
    },
    {
      icon: Server,
      title: 'Self-Hosted Responsibility',
      content: [
        'You are solely responsible for provisioning infrastructure (Docker, databases, credentials, networking)',
        'Validate the behaviour of any automation or strategy before using it with live funds',
        'Monitor your deployment, backups, and access controls to keep systems healthy and secure',
        'Review Alpaca rate limits and execution rules before enabling live or paper trading',
      ],
    },
    {
      icon: AlertCircle,
      title: 'Risk Disclosure',
      content: [
        'Trading and algorithmic execution carry significant financial risk and operational complexity',
        'Historical performance, backtests, or demo environments do not guarantee future results',
        'Integration bugs, infrastructure outages, or third-party API changes can produce unexpected outcomes',
        'You are fully responsible for the financial and compliance impact of any strategy you run',
      ],
    },
    {
      icon: KeyRound,
      title: 'Credentials & Data',
      content: [
        'API keys live in your `.envs/.env` files and are never transmitted to the maintainers by default',
        'Review and harden any secrets management or logging before deploying to shared environments',
        'Cache, watchlist, and analytics data remain within the infrastructure you operate',
        'Scrub credentials and private data from bug reports, issues, and community discussions',
      ],
    },
    {
      icon: Scale,
      title: 'Acceptable Use & Compliance',
      content: [
        'Use the project in accordance with applicable laws, exchange rules, and Alpaca API policies',
        'Do not employ the software for market manipulation, data scraping beyond permitted scope, or unlawful activity',
        'Provide clear disclosure if you redistribute the project as part of a commercial product or service',
        'Respect third-party licenses and intellectual property contained within the repository and dependencies',
      ],
    },
    {
      icon: Users,
      title: 'Contributions & Community',
      content: [
        "By contributing code you agree that submissions are licensed under the project's MIT License",
        'Follow the development workflow, testing practices, and code style documented in the README',
        'Do not submit malicious, harmful, or unlicensed code or data to the repository',
        'The maintainers may review, modify, or decline contributions at their discretion',
      ],
    },
  ];

  return (
    <PageLayout
      header={<PageHeader>Terms of Service</PageHeader>}
      subheader={
        <PageSubHeader>
          These terms apply to your use of the Alpaca API Wrapper codebase,
          documentation, and sample workflows. Self-hosting the project implies
          you accept the responsibilities described below.
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
              These Terms of Service govern your use of the Alpaca API Wrapper
              project, documentation, and example workflows. Installing or
              running the code base means you understand these terms and accept
              responsibility for how you deploy it.
            </p>
          </CardContent>
        </Card>

        {/* Important Notice */}
        <Card className="mb-8 border-destructive/30 bg-gradient-to-br from-destructive/5 to-warning/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="mb-2 text-lg font-bold">Important Notice</h3>
                <p className="text-sm text-muted-foreground">
                  This repository is offered for educational and self-hosted use
                  only. It is not a brokerage account, trading venue, or managed
                  service, and the maintainers cannot monitor how you deploy it.
                  Review the Alpaca Markets Terms of Service and consult
                  qualified legal or financial advisors before operating any
                  strategy in production.
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
            <h3 className="mb-4 text-xl font-bold">No Financial Advice</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              The Alpaca API Wrapper and its documentation are provided for
              technical reference. Nothing in this project constitutes
              investment, trading, or legal advice. You are responsible for
              verifying strategies, managing risk, and complying with all laws
              before deploying automation with live or paper capital.
            </p>
            <h3 className="mt-6 mb-4 text-xl font-bold">
              Third-Party Services
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              The project depends on third-party services such as Alpaca API,
              Redis, PostgreSQL, and Docker. Those services are governed by
              their own agreements and may change without notice. Ensure you
              review and accept those terms separately before integrating them
              into your environment.
            </p>
            <h3 className="mt-6 mb-4 text-xl font-bold">
              Limitation of Liability & Warranty
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              The software is provided "as is" without warranty of any kind. To
              the maximum extent permitted by law, the maintainers and
              contributors are not liable for any direct, indirect, incidental,
              special, consequential, or punitive damages arising from your use
              of the project, including trading losses or service outages.
            </p>
            <h3 className="mt-6 mb-4 text-xl font-bold">
              Changes to These Terms
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              These Terms may evolve as the project grows. Material changes will
              be noted in the repository documentation. Continued use of the
              project after updates constitutes acceptance of the revised Terms.
            </p>
            <h3 className="mt-6 mb-4 text-xl font-bold">Contact Us</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              If you have questions about these Terms or the project, reach out
              to the maintainers:
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

export default TermsPage;
