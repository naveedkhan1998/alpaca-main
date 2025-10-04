const appPathPrefixes = [
  '/app',
  '/login',
  '/contact',
  '/privacy',
  '/terms',
  '/profile',
  '/accounts',
  '/instruments',
  '/graphs',
  '/watchlists',
];

let path = window.location.pathname;

if (path !== '/' && !path.startsWith('/app')) {
  const shouldRewrite = appPathPrefixes.some(
    prefix => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (shouldRewrite) {
    const newPath = `/app${path}`;
    const newUrl = `${newPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
    path = newPath;
  }
}

const isLandingPath = path === '/' || path === '' || path === '/index.html';

const bootstrap = isLandingPath
  ? () =>
      import('./landing/bootstrapLanding').then(module =>
        module.bootstrapLanding()
      )
  : () => import('./app/bootstrapApp').then(module => module.bootstrapApp());

bootstrap().catch(error => {
  console.error('Failed to bootstrap frontend shell', error);
});
