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
      contacts: {
        Row: {
          category: string | null
          comments: string | null
          created_at: string
          direct_phone: string | null
          email: string | null
          estimated_value: number | null
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          main_phone: string | null
          maturity_level: string | null
          offer_target: string | null
          prospect_id: string
          role_title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          comments?: string | null
          created_at?: string
          direct_phone?: string | null
          email?: string | null
          estimated_value?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          main_phone?: string | null
          maturity_level?: string | null
          offer_target?: string | null
          prospect_id: string
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          comments?: string | null
          created_at?: string
          direct_phone?: string | null
          email?: string | null
          estimated_value?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          main_phone?: string | null
          maturity_level?: string | null
          offer_target?: string | null
          prospect_id?: string
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_batches: {
        Row: {
          companies: Json
          created_at: string
          current_step: number
          filters: Json
          id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          companies?: Json
          created_at?: string
          current_step?: number
          filters?: Json
          id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          companies?: Json
          created_at?: string
          current_step?: number
          filters?: Json
          id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospection_logs: {
        Row: {
          action_date: string
          action_type: string
          canal: string
          contact_id: string | null
          created_at: string
          id: string
          meeting_date: string | null
          meeting_duration_minutes: number | null
          next_action_date: string | null
          notes: string | null
          objective: string | null
          prospect_id: string
          result: string | null
          stage: string | null
          video_link: string | null
        }
        Insert: {
          action_date?: string
          action_type: string
          canal?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          meeting_duration_minutes?: number | null
          next_action_date?: string | null
          notes?: string | null
          objective?: string | null
          prospect_id: string
          result?: string | null
          stage?: string | null
          video_link?: string | null
        }
        Update: {
          action_date?: string
          action_type?: string
          canal?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          meeting_duration_minutes?: number | null
          next_action_date?: string | null
          notes?: string | null
          objective?: string | null
          prospect_id?: string
          result?: string | null
          stage?: string | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospection_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospection_logs_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          address: string | null
          category: string
          city: string | null
          comments: string | null
          company_name: string
          created_at: string
          current_stage: string
          estimated_value: number
          google_place_id: string | null
          headcount_range: string | null
          id: string
          legal_status: string | null
          main_phone: string | null
          naf_code: string | null
          next_action_date: string | null
          offer_target: string | null
          reception_hours: string | null
          sector: string | null
          siren: string | null
          source: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          city?: string | null
          comments?: string | null
          company_name: string
          created_at?: string
          current_stage?: string
          estimated_value?: number
          google_place_id?: string | null
          headcount_range?: string | null
          id?: string
          legal_status?: string | null
          main_phone?: string | null
          naf_code?: string | null
          next_action_date?: string | null
          offer_target?: string | null
          reception_hours?: string | null
          sector?: string | null
          siren?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          city?: string | null
          comments?: string | null
          company_name?: string
          created_at?: string
          current_stage?: string
          estimated_value?: number
          google_place_id?: string | null
          headcount_range?: string | null
          id?: string
          legal_status?: string | null
          main_phone?: string | null
          naf_code?: string | null
          next_action_date?: string | null
          offer_target?: string | null
          reception_hours?: string | null
          sector?: string | null
          siren?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
