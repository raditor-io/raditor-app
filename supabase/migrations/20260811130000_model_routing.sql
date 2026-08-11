-- Per-functionality model routing: organizations configure which model runs
-- each AI functionality (declarative names replace the generic capability
-- vocabulary). Resolution ladder in the app: editor override -> org
-- model_routing -> platform defaults.

alter table public.organizations
  add column model_routing jsonb not null default '{}'::jsonb;

-- Rename the usage metering column + values to the functionality vocabulary.
-- The old check constraint must go before the value rewrite.
alter table public.ai_usage_events rename column capability to functionality;
alter table public.ai_usage_events drop constraint ai_usage_capability_check;

update public.ai_usage_events set functionality = case functionality
  when 'summarize' then 'scan_summary'
  when 'classify' then 'signal_evaluation'
  when 'write' then 'content_suggestion'
  when 'scan' then 'scan_briefing'
  when 'translate' then 'translation'
  when 'critic' then 'draft_critique'
  when 'judge' then 'eval_judgement'
  else functionality
end;

alter table public.ai_usage_events add constraint ai_usage_functionality_check check (
  functionality in (
    'scan_summary', 'scan_briefing', 'signal_evaluation',
    'content_suggestion', 'content_draft', 'translation',
    'draft_critique', 'eval_judgement'
  )
);
