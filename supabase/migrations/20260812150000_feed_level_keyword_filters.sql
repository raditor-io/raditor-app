-- Keyword filters move from the radar attachment to the feed itself: one
-- must-include/muted pair per feed, applied to every signal entering the
-- feed regardless of source radar. Attachment-level values are dropped
-- (feature shipped same-day; nothing to carry over).
-- Reverse: alter table feed_radars add column must_include_keywords text[];
--          alter table feed_radars add column muted_keywords text[];
--          alter table feeds drop column must_include_keywords;
--          alter table feeds drop column muted_keywords;

alter table feeds add column must_include_keywords text[];
alter table feeds add column muted_keywords text[];
alter table feed_radars drop column must_include_keywords;
alter table feed_radars drop column muted_keywords;
