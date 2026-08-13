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
          estimated_cost_usd: number
          functionality: string
          id: string
          input_tokens: number
          is_byok: boolean
          model: string
          organization_id: string
          output_tokens: number
          provider: string
          scan_id: string | null
        }
        Insert: {
          created_at?: string
          estimated_cost_usd?: number
          functionality: string
          id?: string
          input_tokens?: number
          is_byok?: boolean
          model: string
          organization_id: string
          output_tokens?: number
          provider?: string
          scan_id?: string | null
        }
        Update: {
          created_at?: string
          estimated_cost_usd?: number
          functionality?: string
          id?: string
          input_tokens?: number
          is_byok?: boolean
          model?: string
          organization_id?: string
          output_tokens?: number
          provider?: string
          scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_organization_id_fkey"
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
      feed_item_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          error_message: string | null
          feed_item_id: number
          id: string
          last_attempted_at: string | null
          organization_id: string
          response_data_raw: string | null
          status: string
          status_code: number | null
          subscription_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          feed_item_id: number
          id?: string
          last_attempted_at?: string | null
          organization_id: string
          response_data_raw?: string | null
          status?: string
          status_code?: number | null
          subscription_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          feed_item_id?: number
          id?: string
          last_attempted_at?: string | null
          organization_id?: string
          response_data_raw?: string | null
          status?: string
          status_code?: number | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_item_deliveries_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "feed_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_item_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_item_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_items: {
        Row: {
          added_at: string
          feed_id: string
          id: number
          organization_id: string
          signal_id: string
        }
        Insert: {
          added_at?: string
          feed_id: string
          id?: never
          organization_id: string
          signal_id: string
        }
        Update: {
          added_at?: string
          feed_id?: string
          id?: never
          organization_id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_radars: {
        Row: {
          created_at: string
          feed_id: string
          id: string
          organization_id: string
          radar_id: string
        }
        Insert: {
          created_at?: string
          feed_id: string
          id?: string
          organization_id: string
          radar_id: string
        }
        Update: {
          created_at?: string
          feed_id?: string
          id?: string
          organization_id?: string
          radar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_radars_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_radars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_radars_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
        ]
      }
      feeds: {
        Row: {
          created_at: string
          description_md: string
          id: string
          must_include_keywords: string[] | null
          muted_keywords: string[] | null
          name: string
          organization_id: string
          slug: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description_md?: string
          id?: string
          must_include_keywords?: string[] | null
          muted_keywords?: string[] | null
          name: string
          organization_id: string
          slug: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description_md?: string
          id?: string
          must_include_keywords?: string[] | null
          muted_keywords?: string[] | null
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeds_organization_id_fkey"
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
          date_format: string
          display_name: string
          id: string
          model_routing: Json
          slug: string
          time_format: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_format?: string
          display_name: string
          id?: string
          model_routing?: Json
          slug: string
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_format?: string
          display_name?: string
          id?: string
          model_routing?: Json
          slug?: string
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
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
          deactivated_at: string | null
          directive_md: string
          emit_scan_summary_as_signal: boolean
          id: string
          is_active: boolean
          last_scanned_at: string | null
          name: string
          organization_id: string
          scan_interval_minutes: number
          scan_strategies: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          directive_md?: string
          emit_scan_summary_as_signal?: boolean
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          name: string
          organization_id: string
          scan_interval_minutes?: number
          scan_strategies?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          directive_md?: string
          emit_scan_summary_as_signal?: boolean
          id?: string
          is_active?: boolean
          last_scanned_at?: string | null
          name?: string
          organization_id?: string
          scan_interval_minutes?: number
          scan_strategies?: string[]
          slug?: string
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
          error_message: string | null
          finished_at: string | null
          id: string
          organization_id: string
          radar_id: string
          started_at: string
          stats: Json
          status: string
          strategies_used: string[]
          summary_md: string
          trigger: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          radar_id: string
          started_at?: string
          stats?: Json
          status?: string
          strategies_used?: string[]
          summary_md?: string
          trigger?: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          radar_id?: string
          started_at?: string
          stats?: Json
          status?: string
          strategies_used?: string[]
          summary_md?: string
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
      signals: {
        Row: {
          body_md: string
          created_at: string
          custom_data: Json | null
          dedup_key: string
          evidence: Json
          has_suspicious_content: boolean
          id: string
          kind: string
          occurred_at: string
          organization_id: string
          radar_id: string
          signed_event: Json | null
          status: string
          summary_md: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          created_at?: string
          custom_data?: Json | null
          dedup_key: string
          evidence?: Json
          has_suspicious_content?: boolean
          id?: string
          kind: string
          occurred_at?: string
          organization_id: string
          radar_id: string
          signed_event?: Json | null
          status?: string
          summary_md?: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          created_at?: string
          custom_data?: Json | null
          dedup_key?: string
          evidence?: Json
          has_suspicious_content?: boolean
          id?: string
          kind?: string
          occurred_at?: string
          organization_id?: string
          radar_id?: string
          signed_event?: Json | null
          status?: string
          summary_md?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          api_token_hash: string | null
          api_token_prefix: string | null
          created_at: string
          created_by: string | null
          feed_id: string
          id: string
          is_active: boolean
          last_acked_feed_item_id: number
          name: string
          organization_id: string
          subscriber_kind: string
          transport: string
          updated_at: string
          user_id: string | null
          webhook_auth_header_name: string | null
          webhook_auth_secret_ciphertext: string | null
          webhook_auth_secret_iv: string | null
          webhook_body_template: string | null
          webhook_method: string
          webhook_secret_ciphertext: string | null
          webhook_secret_iv: string | null
          webhook_url: string | null
        }
        Insert: {
          api_token_hash?: string | null
          api_token_prefix?: string | null
          created_at?: string
          created_by?: string | null
          feed_id: string
          id?: string
          is_active?: boolean
          last_acked_feed_item_id?: number
          name: string
          organization_id: string
          subscriber_kind: string
          transport: string
          updated_at?: string
          user_id?: string | null
          webhook_auth_header_name?: string | null
          webhook_auth_secret_ciphertext?: string | null
          webhook_auth_secret_iv?: string | null
          webhook_body_template?: string | null
          webhook_method?: string
          webhook_secret_ciphertext?: string | null
          webhook_secret_iv?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_token_hash?: string | null
          api_token_prefix?: string | null
          created_at?: string
          created_by?: string | null
          feed_id?: string
          id?: string
          is_active?: boolean
          last_acked_feed_item_id?: number
          name?: string
          organization_id?: string
          subscriber_kind?: string
          transport?: string
          updated_at?: string
          user_id?: string | null
          webhook_auth_header_name?: string | null
          webhook_auth_secret_ciphertext?: string | null
          webhook_auth_secret_iv?: string | null
          webhook_body_template?: string | null
          webhook_method?: string
          webhook_secret_ciphertext?: string | null
          webhook_secret_iv?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      target_events: {
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
            foreignKeyName: "target_events_consumed_fk"
            columns: ["consumed_by_scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_events_radar_id_fkey"
            columns: ["radar_id"]
            isOneToOne: false
            referencedRelation: "radars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_events_radar_target_id_fkey"
            columns: ["radar_target_id"]
            isOneToOne: false
            referencedRelation: "radar_targets"
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
