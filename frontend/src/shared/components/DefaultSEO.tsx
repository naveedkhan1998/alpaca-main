import { buildCanonical, getSiteUrl } from '@/lib/site';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

type Props = {
  defaultTitle?: string;
  description?: string;
};

export function DefaultSEO({
  defaultTitle = 'Alpaca API Wrapper',
  description = 'Best free, open-source Alpaca API boilerplate: Django, Celery, Redis, React + TradingView with real-time market data.',
}: Props) {
  const location = useLocation();
  const canonical = buildCanonical(location.pathname, location.search);
  const siteUrl = getSiteUrl();
  const image = `${siteUrl}/android-chrome-512x512.png`;

  return (
    <Helmet defaultTitle={defaultTitle} titleTemplate="%s | Alpaca API Wrapper">
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />

      <link rel="canonical" href={canonical} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Alpaca API Wrapper" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
