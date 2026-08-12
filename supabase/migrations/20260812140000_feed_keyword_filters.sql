-- Feed attachments filter signals by keywords over their visible text
-- (title + summary) instead of the AI-coined signal kind vocabulary:
-- must_include_keywords = signal must match at least one entry (empty = all),
-- muted_keywords = signal must match none. Matching happens in the app at
-- fan-out time; the columns are plain text arrays.
-- Reverse: alter table feed_radars add column signal_kinds text[];
--          alter table feed_radars drop column must_include_keywords;
--          alter table feed_radars drop column muted_keywords;

alter table feed_radars add column must_include_keywords text[];
alter table feed_radars add column muted_keywords text[];
alter table feed_radars drop column signal_kinds;
