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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          citations_daily_limit: number
          citations_enabled: boolean
          id: number
          support_message: string | null
          support_whatsapp: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          citations_daily_limit?: number
          citations_enabled?: boolean
          id?: number
          support_message?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          citations_daily_limit?: number
          citations_enabled?: boolean
          id?: number
          support_message?: string | null
          support_whatsapp?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      citation_lookups: {
        Row: {
          cached_at: string
          cost_cents: number
          created_at: string
          id: string
          lead_address: string | null
          lead_name: string | null
          model: string | null
          place_id: string
          query: string
          result: Json
          user_id: string
        }
        Insert: {
          cached_at?: string
          cost_cents?: number
          created_at?: string
          id?: string
          lead_address?: string | null
          lead_name?: string | null
          model?: string | null
          place_id: string
          query: string
          result: Json
          user_id: string
        }
        Update: {
          cached_at?: string
          cost_cents?: number
          created_at?: string
          id?: string
          lead_address?: string | null
          lead_name?: string | null
          model?: string | null
          place_id?: string
          query?: string
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string | null
          has_website: boolean
          has_whatsapp: boolean
          id: string
          instagram_handle: string | null
          instagram_last_post_days: number | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          score_lead: number
          status: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          has_website?: boolean
          has_whatsapp?: boolean
          id?: string
          instagram_handle?: string | null
          instagram_last_post_days?: number | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          score_lead?: number
          status?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          has_website?: boolean
          has_whatsapp?: boolean
          id?: string
          instagram_handle?: string | null
          instagram_last_post_days?: number | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          score_lead?: number
          status?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      plan_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          plan: Database["public"]["Enums"]["user_plan"]
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          month_reset_at: string
          plan: Database["public"]["Enums"]["user_plan"]
          search_count_month: number
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_login_at?: string | null
          month_reset_at?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          search_count_month?: number
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          month_reset_at?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          search_count_month?: number
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      version_log: {
        Row: {
          created_at: string
          description: string
          id: string
          impact: string | null
          risk: string | null
          version: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          impact?: string | null
          risk?: string | null
          version: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          impact?: string | null
          risk?: string | null
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_search_quota: {
        Args: { _free_limit: number; _user_id: string }
        Returns: {
          allowed: boolean
          plan: Database["public"]["Enums"]["user_plan"]
          remaining: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "admin" | "user"
      user_plan: "free" | "pro"
      user_status: "active" | "blocked"
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
  public: {
    Enums: {
      app_role: ["master", "admin", "user"],
      user_plan: ["free", "pro"],
      user_status: ["active", "blocked"],
    },
  },
} as const
