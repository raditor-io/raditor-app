-- Capture what the webhook destination answered, per delivery attempt: the
-- HTTP status code and a bounded slice of the raw response body. Failures
-- become diagnosable from the UI (e.g. Resend's "domain is not verified"
-- body) instead of a bare "HTTP 403" string. error_message now carries an
-- actual message (request errors like timeouts, or one extracted from a
-- JSON error body) rather than the status-code string, which moves to
-- status_code.

alter table public.feed_item_deliveries add column status_code integer;
alter table public.feed_item_deliveries add column response_data_raw text;

-- The delivery job truncates before writing; the check keeps other writers
-- honest about the bound.
alter table public.feed_item_deliveries
  add constraint feed_item_deliveries_response_data_raw_length_check
  check (char_length(response_data_raw) <= 10000);
