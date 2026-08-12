-- Configurable HTTP method per pushed_webhook subscription (httpie-style
-- method picker). POST stays the default; GET/HEAD deliveries send signed
-- headers without a body (fetch forbids bodies on those methods).

alter table public.subscriptions add column webhook_method text not null default 'POST';

alter table public.subscriptions add constraint subscriptions_webhook_method_check
  check (
    webhook_method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')
  );
