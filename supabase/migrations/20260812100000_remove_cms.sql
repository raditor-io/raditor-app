-- Pivot: Raditor is "RSS for the agentic web". Radars scan matters and emit
-- signals; feeds collect signals; subscribers consume feeds. The CMS pipeline
-- (evaluations, suggestions, drafts, PRs, content graph, editor agents) is
-- removed: signals are by definition relevant per radar configuration, so no
-- downstream evaluation stage exists anymore.

-- --- Metering columns referencing CMS tables (FK safety, drop first) ----------

alter table public.ai_usage_events drop column editor_agent_id;
alter table public.ai_usage_events drop column suggestion_id;

-- --- CMS tables, children before parents --------------------------------------

drop table public.content_edges;
drop table public.content_nodes;
drop table public.github_pull_requests;
drop table public.content_drafts;
drop table public.suggestions;
drop table public.signal_evaluations;
drop table public.editor_agent_assignments;
drop table public.editor_agents;
drop table public.project_goals;

-- --- Queues owned by removed pipelines ----------------------------------------

select pgmq.drop_queue('publish');
select pgmq.drop_queue('graph');

-- --- Metering vocabulary: only scan functionalities remain --------------------
-- Pre-launch data: rows for removed functionalities are deleted so the new
-- check validates.

delete from public.ai_usage_events
  where functionality not in ('scan_summary', 'scan_briefing');
alter table public.ai_usage_events drop constraint ai_usage_functionality_check;
alter table public.ai_usage_events add constraint ai_usage_functionality_check
  check (functionality in ('scan_summary', 'scan_briefing'));
