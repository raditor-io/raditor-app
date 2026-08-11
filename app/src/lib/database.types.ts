export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_usage_events: {
        Row: {
          created_at: string
          editor_agent_id: string | null
          estimated_cost_usd: number
          functionality: string
          id: string
          input_tokens: number
          is_byok: boolean
          model: string
          organization_id: string
          output_tokens: number
          project_id: string | null
          provider: string
          scan_id: string | null
          suggestion_id: string | null
        }
        Insert: {
          created_at?: string
          editor_agent_id?: string | null
          estimated_cost_usd?: number
          functionality: string
          id?: string
          input_tokens?: number
          is_byok?: boolean
          model: string
          organization_id: string
          output_tokens?: number
          project_id?: string | null
          provider?: string
          scan_id?: string | null
          suggestion_id?: string | null
        }
        Update: {
          created_at?: string
          editor_agent_id?: string | null
          estimated_cost_usd?: number
          functionality?: string
          id?: string
          input_tokens?: number
          is_byok?: boolean
          model?: string
          organization_id?: string
          output_tokens?: number
          project_id?: string | null
          provider?: string
          scan_id?: string | null
          suggestion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_editor_agent_id_fkey"
            columns: ["editor_agent_id"]
            isOneToOne: false
            referencedRelation: "editor_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_drafts: {
        Row: {
          base_git_blob_sha: string | null
          committed_git_blob_sha: string | null
          created_at: string
          draft_content: string
          file_path: string
          id: string
          organization_id: string
          project_id: string
          suggestion_id: string
          updated_at: string
        }
        Insert: {
          base_git_blob_sha?: string | null
          committed_git_blob_sha?: string | null
          created_at?: string
          draft_content?: string
          file_path: string
          id?: string
          organization_id: string
          project_id: string
          suggestion_id: string
          updated_at?: string
        }
        Update: {
          base_git_blob_sha?: string | null
          committed_git_blob_sha?: string | null
          created_at?: string
          draft_content?: string
          file_path?: string
          id?: string
          organization_id?: string
          project_id?: string
          suggestion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_agent_assignments: {
        Row: {
          created_at: string
          editor_agent_id: string
          id: string
          organization_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          editor_agent_id: string
          id?: string
          organization_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          editor_agent_id?: string
          id?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_agent_assignments_editor_agent_id_fkey"
            columns: ["editor_agent_id"]
            isOneToOne: false
            referencedRelation: "editor_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_agent_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_agent_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_agents: {
        Row: {
          created_at: string
          display_name: string
          id: string
          model_config: Json
          organization_id: string
          persona_md: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          model_config?: Json
          organization_id: string
          persona_md?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          model_config?: Json
          organization_id?: string
          persona_md?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actor_id: string | null
          actor_kind: string
          created_at: string
          event_type: string
          id: number
          organization_id: string
          payload: Json
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          event_type: string
          id?: never
          organization_id: string
          payload?: Json
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          created_at?: string
          event_type?: string
          id?: never
          organization_id?: string
          payload?: Json
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_installations: {
        Row: {
          created_at: string
          github_account_login: string
          github_account_type: string
          github_installation_id: number
          id: string
          is_active: boolean
          organization_id: string
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          github_account_login: string
          github_account_type?: string
          github_installation_id: number
          id?: string
          is_active?: boolean
          organization_id: string
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          github_account_login?: string
          github_account_type?: string
          github_installation_id?: number
          id?: string
          is_active?: boolean
          organization_id?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_installations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      github_pull_requests: {
        Row: {
          branch_name: string
          closed_at: string | null
          created_at: string
          head_commit_sha: string | null
          id: string
          is_from_fork: boolean
          merged_at: string | null
          opened_at: string
          organization_id: string
          pr_number: number
          project_id: string
          repo_full_name: string
          status: string
          suggestion_id: string
          updated_at: string
        }
        Insert: {
          branch_name: string
          closed_at?: string | null
          created_at?: string
          head_commit_sha?: string | null
          id?: string
          is_from_fork?: boolean
          merged_at?: string | null
          opened_at?: string
          organization_id: string
          pr_number: number
          project_id: string
          repo_full_name: string
          status?: string
          suggestion_id: string
          updated_at?: string
        }
        Update: {
          branch_name?: string
          closed_at?: string | null
          created_at?: string
          head_commit_sha?: string | null
          id?: string
          is_from_fork?: boolean
          merged_at?: string | null
          opened_at?: string
          organization_id?: string
          pr_number?: number
          project_id?: string
          repo_full_name?: string
          status?: string
          suggestion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_pull_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_pull_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "github_pull_requests_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_failures: {
        Row: {
          attempt_count: number
          error_message: string | null
          failed_at: string
          id: string
          job_name: string
          payload: Json
          queue_name: string
        }
        Insert: {
          attempt_count?: number
          error_message?: string | null
          failed_at?: string
          id?: string
          job_name: string
          payload?: Json
          queue_name: string
        }
        Update: {
          attempt_count?: number
          error_message?: string | null
          failed_at?: string
          id?: string
          job_name?: string
          payload?: Json
          queue_name?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          member_role: string
          organization_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          member_role?: string
          organization_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          member_role?: string
          organization_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          member_email: string | null
          member_role: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email?: string | null
          member_role?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string | null
          member_role?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          display_name: string
          id: string
          model_routing: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          model_routing?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          model_routing?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_goals: {
        Row: {
          body_md: string
          created_at: string
          goal_key: string | null
          id: string
          is_active: boolean
          organization_id: string
          priority: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          goal_key?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          priority?: number
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          goal_key?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          priority?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deploy_base_branch: string
          deploy_github_installation_id: number | null
          deploy_path_allowlist: string[]
          deploy_pr_mode: string
          deploy_repo_full_name: string | null
          display_name: string
          do_not_write_md: string
          editorial_memory_md: string
          i18n_config: Json
          id: string
          max_suggestions_per_interval: number
          organization_id: string
          purpose_md: string
          site_type: string
          slug: string
          suggestion_interval: string
          updated_at: string
          url_mapping_config: Json
        }
        Insert: {
          created_at?: string
          deploy_base_branch?: string
          deploy_github_installation_id?: number | null
          deploy_path_allowlist?: string[]
          deploy_pr_mode?: string
          deploy_repo_full_name?: string | null
          display_name: string
          do_not_write_md?: string
          editorial_memory_md?: string
          i18n_config?: Json
          id?: string
          max_suggestions_per_interval?: number
          organization_id: string
          purpose_md?: string
          site_type?: string
          slug: string
          suggestion_interval?: string
          updated_at?: string
          url_mapping_config?: Json
        }
        Update: {
          created_at?: string
          deploy_base_branch?: string
          deploy_github_installation_id?: number | null
          deploy_path_allowlist?: string[]
          deploy_pr_mode?: string
          deploy_repo_full_name?: string | null
          display_name?: string
          do_not_write_md?: string
          editorial_memory_md?: string
          i18n_config?: Json
          id?: string
          max_suggestions_per_interval?: number
          organization_id?: string
          purpose_md?: string
          site_type?: string
          slug?: string
          suggestion_interval?: string
          updated_at?: string
          url_mapping_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_ciphertext: string
          key_iv: string
          key_last_four: string
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_ciphertext: string
          key_iv: string
          key_last_four: string
          organization_id: string
          provider?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_ciphertext?: string
          key_iv?: string
          key_last_four?: string
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_target_events: {
        Row: {
          consumed_by_scan_id: string | null
          delivery_ref: string | null
          event_kind: string
          external_ref: string
          id: string
          occurred_at: string
          organization_id: string
          payload: Json
          radar_id: string
          radar_target_id: string
          received_at: string
        }
        Insert: {
          consumed_by_scan_id?: string | null
          delivery_ref?: string | null
          event_kind: string
          external_ref: string
          id?: string
          occurred_at?: string
          organization_id: string
          payload?: Json
          radar_id: string
          radar_target_id: string
          received_at?: string
        }
        Update: {
          consumed_by_scan_id?: string | null
          delivery_ref?: string | null
          event_kind?: string
          external_ref?: string
          id?: string
          occurred_at?: string
          organization_id?: string
          payload?: Json
          radar_id?: string
          radar_target_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_target_events_consumed_fk"
            columns: ["consumed_by_scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_target_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_target_events_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_target_events_radar_target_id_fkey"
            columns: ["radar_target_id"]
            isOneToOne: false
            referencedRelation: "radar_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      radar_targets: {
        Row: {
          config: Json
          created_at: string
          github_installation_id: number | null
          github_repo_full_name: string | null
          id: string
          is_active: boolean
          organization_id: string
          radar_id: string
          scan_checkpoint: Json | null
          target_kind: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          github_installation_id?: number | null
          github_repo_full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          radar_id: string
          scan_checkpoint?: Json | null
          target_kind: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          github_installation_id?: number | null
          github_repo_full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          radar_id?: string
          scan_checkpoint?: Json | null
          target_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radar_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radar_targets_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
        ]
      }
      radars: {
        Row: {
          created_at: string
          directive_md: string
          id: string
          is_active: boolean
          last_scanned_at: string | null
          name: string
          organization_id: string
          project_id: string
          scan_interval_minutes: number
          scan_strategies: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          directive_md?: string
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          name: string
          organization_id: string
          project_id: string
          scan_interval_minutes?: number
          scan_strategies?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          directive_md?: string
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          name?: string
          organization_id?: string
          project_id?: string
          scan_interval_minutes?: number
          scan_strategies?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radars_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_outputs: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          external_ref: string
          id: string
          is_reconciled: boolean
          occurred_at: string
          organization_id: string
          output_kind: string
          radar_id: string
          radar_target_id: string | null
          scan_id: string
          signal_id: string | null
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          external_ref: string
          id?: string
          is_reconciled?: boolean
          occurred_at?: string
          organization_id: string
          output_kind: string
          radar_id: string
          radar_target_id?: string | null
          scan_id: string
          signal_id?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          external_ref?: string
          id?: string
          is_reconciled?: boolean
          occurred_at?: string
          organization_id?: string
          output_kind?: string
          radar_id?: string
          radar_target_id?: string | null
          scan_id?: string
          signal_id?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_outputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_outputs_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_outputs_radar_target_id_fkey"
            columns: ["radar_target_id"]
            isOneToOne: false
            referencedRelation: "radar_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_outputs_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_outputs_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          finished_at: string | null
          id: string
          organization_id: string
          radar_id: string
          started_at: string
          stats: Json
          status: string
          strategies_used: string[]
          trigger: string
        }
        Insert: {
          finished_at?: string | null
          id?: string
          organization_id: string
          radar_id: string
          started_at?: string
          stats?: Json
          status?: string
          strategies_used?: string[]
          trigger?: string
        }
        Update: {
          finished_at?: string | null
          id?: string
          organization_id?: string
          radar_id?: string
          started_at?: string
          stats?: Json
          status?: string
          strategies_used?: string[]
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_evaluations: {
        Row: {
          created_at: string
          editor_agent_id: string | null
          error_message: string | null
          evaluated_at: string | null
          id: string
          organization_id: string
          project_id: string
          rationale_md: string
          relevance_score: number | null
          signal_id: string
          status: string
          suggestion_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          editor_agent_id?: string | null
          error_message?: string | null
          evaluated_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          rationale_md?: string
          relevance_score?: number | null
          signal_id: string
          status?: string
          suggestion_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          editor_agent_id?: string | null
          error_message?: string | null
          evaluated_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          rationale_md?: string
          relevance_score?: number | null
          signal_id?: string
          status?: string
          suggestion_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_evaluations_editor_agent_id_fkey"
            columns: ["editor_agent_id"]
            isOneToOne: false
            referencedRelation: "editor_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_evaluations_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          cluster_key: string
          created_at: string
          evidence: Json
          has_suspicious_content: boolean
          id: string
          organization_id: string
          status: string
          summary_md: string
          title: string
          updated_at: string
          window_ended_at: string
          window_started_at: string
        }
        Insert: {
          cluster_key: string
          created_at?: string
          evidence?: Json
          has_suspicious_content?: boolean
          id?: string
          organization_id: string
          status?: string
          summary_md?: string
          title: string
          updated_at?: string
          window_ended_at?: string
          window_started_at?: string
        }
        Update: {
          cluster_key?: string
          created_at?: string
          evidence?: Json
          has_suspicious_content?: boolean
          id?: string
          organization_id?: string
          status?: string
          summary_md?: string
          title?: string
          updated_at?: string
          window_ended_at?: string
          window_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          created_at: string
          editor_agent_id: string | null
          graph_impact: Json
          has_conflict: boolean
          has_suspicious_source_content: boolean
          id: string
          interval_bucket: string
          organization_id: string
          project_id: string
          reason_md: string
          recommendation_md: string
          relevance_score: number | null
          sibling_group_id: string | null
          signal_id: string | null
          signal_summary_md: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          editor_agent_id?: string | null
          graph_impact?: Json
          has_conflict?: boolean
          has_suspicious_source_content?: boolean
          id?: string
          interval_bucket: string
          organization_id: string
          project_id: string
          reason_md?: string
          recommendation_md?: string
          relevance_score?: number | null
          sibling_group_id?: string | null
          signal_id?: string | null
          signal_summary_md?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          editor_agent_id?: string | null
          graph_impact?: Json
          has_conflict?: boolean
          has_suspicious_source_content?: boolean
          id?: string
          interval_bucket?: string
          organization_id?: string
          project_id?: string
          reason_md?: string
          recommendation_md?: string
          relevance_score?: number | null
          sibling_group_id?: string | null
          signal_id?: string | null
          signal_summary_md?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestions_editor_agent_id_fkey"
            columns: ["editor_agent_id"]
            isOneToOne: false
            referencedRelation: "editor_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestions_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token_hash: string }; Returns: string }
      bootstrap_organization: { Args: never; Returns: string }
      is_org_admin: { Args: { p_organization_id: string }; Returns: boolean }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      jobs_archive: {
        Args: { p_msg_id: number; p_queue: string }
        Returns: boolean
      }
      jobs_enqueue: {
        Args: { p_message: Json; p_queue: string }
        Returns: number
      }
      jobs_read_batch: {
        Args: {
          p_batch_size: number
          p_queue: string
          p_visibility_timeout: number
        }
        Returns: {
          enqueued_at: string
          message: Json
          msg_id: number
          read_ct: number
          vt: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
