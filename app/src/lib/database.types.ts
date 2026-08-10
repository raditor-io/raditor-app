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
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
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
      project_sources: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          project_id: string
          source_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          source_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
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
      source_events: {
        Row: {
          created_at: string
          event_kind: string
          external_ref: string
          github_delivery_id: string | null
          id: string
          is_processed: boolean
          occurred_at: string
          organization_id: string
          payload: Json
          signal_id: string | null
          source_id: string
        }
        Insert: {
          created_at?: string
          event_kind: string
          external_ref: string
          github_delivery_id?: string | null
          id?: string
          is_processed?: boolean
          occurred_at?: string
          organization_id: string
          payload?: Json
          signal_id?: string | null
          source_id: string
        }
        Update: {
          created_at?: string
          event_kind?: string
          external_ref?: string
          github_delivery_id?: string | null
          id?: string
          is_processed?: boolean
          occurred_at?: string
          organization_id?: string
          payload?: Json
          signal_id?: string | null
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_events_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          display_name: string
          github_installation_id: number | null
          github_repo_full_name: string | null
          id: string
          is_active: boolean
          organization_id: string
          source_type: string
          updated_at: string
          watch_config: Json
        }
        Insert: {
          created_at?: string
          display_name: string
          github_installation_id?: number | null
          github_repo_full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          source_type?: string
          updated_at?: string
          watch_config?: Json
        }
        Update: {
          created_at?: string
          display_name?: string
          github_installation_id?: number | null
          github_repo_full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          source_type?: string
          updated_at?: string
          watch_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
