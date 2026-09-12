export const GATED_ROUTES = [
  '/butce-plani/',
  '/tesekkurler/',
  '/aydinlatma-metni/',
] as const;

export const GATED_ROUTE_SET = new Set<string>(GATED_ROUTES);
