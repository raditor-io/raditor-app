-- Optional per-subscription body template for pushed_webhook deliveries:
-- lets a subscription target third-party APIs (Resend, Slack, ...) that
-- expect their own body shape. Null = the standard Raditor envelope.
-- Placeholders: {{path}} (JSON-escaped text) and {{{path}}} (raw JSON value).

alter table public.subscriptions add column webhook_body_template text;
