import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { HiMail, HiMap, HiPhone } from 'react-icons/hi';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const AboutPage = () => {
  return (
    <PageLayout
      header={
        <PageHeader>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text">
            About Me
          </span>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Full-stack Developer with 2+ years of experience building and
          deploying production-grade web applications.
        </PageSubHeader>
      }
    >
      <PageContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src="/placeholder.svg" alt="Naveed Khan" />
                  <AvatarFallback>NK</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-bold">Naveed Khan</h1>
                  <p className="text-lg text-muted-foreground">
                    Full-stack Software Developer
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4 sm:justify-start">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <HiMap className="w-4 h-4" /> London, ON, Canada
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <HiPhone className="w-4 h-4" /> +1 (226) 236-7245
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <HiMail className="w-4 h-4" />{' '}
                      naveedkhan13041998@gmail.com
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <FaLinkedin className="w-4 h-4" />
                      <a
                        href="https://www.linkedin.com/in/mnk1998/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LinkedIn
                      </a>
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <FaGithub className="w-4 h-4" />
                      <a
                        href="https://www.mnaveedk.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Portfolio
                      </a>
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Me</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Full-stack Developer with 2+ years of experience building and
                deploying production-grade web applications using Django, React,
                Svelte, and modern cloud infrastructure. Strong track record of
                owning features end-to-end—from backend architecture and API
                design to responsive UIs and Kubernetes deployments. Skilled in
                refactoring legacy systems, integrating LLM pipelines, and
                handling real-time data flows across distributed services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 font-semibold">Languages</h3>
                  <p className="text-muted-foreground">
                    Python, JavaScript/TypeScript, SQL, Bash, C++
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Backend & Infra</h3>
                  <p className="text-muted-foreground">
                    Django, FastAPI, Celery, Redis, WebSockets, REST APIs, async
                    workers, message queues
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Frontend</h3>
                  <p className="text-muted-foreground">
                    React, Svelte, Next.js, Tailwind CSS, ShadCN UI, Vite,
                    TanStack Table
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Databases</h3>
                  <p className="text-muted-foreground">
                    PostgreSQL, SQLite, Schema Design, Migrations, Query
                    Optimization
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Cloud & DevOps</h3>
                  <p className="text-muted-foreground">
                    Docker, Kubernetes (Helm), AWS (EC2, S3, SES,
                    CloudFormation), GitHub Actions, NGINX
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">Testing & Monitoring</h3>
                  <p className="text-muted-foreground">
                    Pytest, Vitest, Playwright, Sentry, Prometheus
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">
                  Full-stack Developer (Sole Engineer)
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  Cypienta (EzSec Inc.) | Jan 2025 - Present
                </p>
                <ul className="pl-5 space-y-1 list-disc text-muted-foreground">
                  <li>
                    Owned and maintained two major products end-to-end: a
                    React-based SaaS demo platform and the core on-prem Svelte +
                    Django app.
                  </li>
                  <li>
                    Refactored legacy mono-repo, migrated Svelte 3.4 → 4, Django
                    3 → 5, and replaced Rollup with Vite, cutting HMR times from
                    3 minutes to instant.
                  </li>
                  <li>
                    Integrated pgAdmin and pgHero to monitor query performance;
                    optimized critical bulk query (2000+ items) from 20s → 2s.
                  </li>
                  <li>
                    Architected modular LLM integration via LangChain,
                    supporting OpenAI, Ollama, Google, Anthropic.
                  </li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold">
                  Founding Engineer (Part-time, Full-stack)
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  RiskTec Systems | Apr 2024 - Dec 2024
                </p>
                <ul className="pl-5 space-y-1 list-disc text-muted-foreground">
                  <li>
                    Built core modules for a multi-tenant SaaS platform for
                    asset management firms.
                  </li>
                  <li>
                    Implemented per-firm tenancy with strict data isolation,
                    RBAC, and per-seat licensing logic.
                  </li>
                  <li>
                    Developed a fully customizable mandate compliance engine to
                    flag and resolve breaches.
                  </li>
                  <li>
                    Integrated Bloomberg API for real-time price feeds and
                    constructed backtesting tools.
                  </li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold">
                  Quant Backend Engineer
                </h3>
                <p className="mb-2 text-sm text-muted-foreground">
                  GenioBITS Technologies | Jun 2022 - Mar 2023
                </p>
                <ul className="pl-5 space-y-1 list-disc text-muted-foreground">
                  <li>
                    Developed backend infrastructure for a customizable
                    derivatives trading platform.
                  </li>
                  <li>
                    Engineered a dynamic strategy execution engine supporting
                    historical data replay and real-time trading.
                  </li>
                  <li>
                    Built a multi-source data ingestion pipeline with WebSocket
                    and REST API integrations.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To become a Principal Engineer and build systems that balance
                  performance, simplicity, and innovation — all while staying
                  deeply hands-on with code.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Why Me?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  I bring strong end-to-end ownership, production experience,
                  and the hunger to improve every day. From database performance
                  to frontend polish — I care about quality across the stack.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </PageContent>
    </PageLayout>
  );
};

export default AboutPage;
