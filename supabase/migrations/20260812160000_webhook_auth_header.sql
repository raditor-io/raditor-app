-- Webhook destinations that require authentication (e.g. posting straight
-- into an API like Resend): an optional extra request header per
-- pushed_webhook subscription. The header value is an API key the user
-- already holds, sealed with the vault key like the signing secret.

alter table public.subscriptions add column webhook_auth_header_name text;
alter table public.subscriptions add column webhook_auth_secret_ciphertext text;
alter table public.subscriptions add column webhook_auth_secret_iv text;

alter table public.subscriptions add constraint subscriptions_auth_header_check
  check (
    (webhook_auth_header_name is null)
    = (webhook_auth_secret_ciphertext is null)
  );
