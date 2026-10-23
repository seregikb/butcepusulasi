export const GATED_ROUTES = [
  '/butce-plani/',
  '/tesekkurler/',
  '/aydinlatma-metni/',
] as const;

export const GATED_ROUTE_SET = new Set<string>(GATED_ROUTES);

export const LEAD_FORM_ROUTE = GATED_ROUTES[0];

export const ALWAYS_ANALYTICS_EXCLUDED_ROUTES = GATED_ROUTES.filter((route) => (
  route === LEAD_FORM_ROUTE || route === GATED_ROUTES[2]
));

export const ALWAYS_ANALYTICS_EXCLUDED_ROUTE_SET = new Set<string>(ALWAYS_ANALYTICS_EXCLUDED_ROUTES);

export function isAnalyticsExcludedRoute(pathname: string, funnelEnabled: boolean): boolean {
  return ALWAYS_ANALYTICS_EXCLUDED_ROUTE_SET.has(pathname)
    || (!funnelEnabled && GATED_ROUTE_SET.has(pathname));
}
