import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const PUBLIC_META: Record<string, { title: string; description: string }> = {
  '/app/login': {
    title: 'Login',
    description:
      'Sign in to the Alpaca API Wrapper to access your dashboard and real-time market tools.',
  },
  '/app/privacy': {
    title: 'Privacy Policy',
    description:
      'Learn how the open-source Alpaca API Wrapper handles data when you self-host.',
  },
  '/app/terms': {
    title: 'Terms of Use',
    description:
      'Usage terms for the Alpaca API Wrapper, an open-source Alpaca starter.',
  },
  '/app/contact': {
    title: 'Contact',
    description:
      'Get in touch regarding the Alpaca API Wrapper project, support, or collaboration.',
  },
};

const PRIVATE_PREFIXES = [
  '/app/accounts',
  '/app/profile',
  '/app/instruments',
  '/app/graphs',
  '/app/watchlists',
];

export function RouteSEO() {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const meta = PUBLIC_META[pathname];

  if (isPrivate) {
    return (
      <Helmet>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
    );
  }

  if (meta) {
    return (
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
      </Helmet>
    );
  }

  return null;
}
