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
      attempt_media: {
        Row: {
          alt_text: string | null
          attempt_id: string
          created_at: string
          id: string
          is_cover: boolean
          kind: string
          storage_path: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          attempt_id: string
          created_at?: string
          id?: string
          is_cover?: boolean
          kind?: string
          storage_path: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          attempt_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          kind?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_media_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "brew_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      brew_attempts: {
        Row: {
          acidity: number | null
          attempt_no: number
          balance: number | null
          basket_size: string | null
          basket_wall: string | null
          bitterness: number | null
          body: number | null
          coffee_bag_id: string
          coffee_id: string
          created_at: string
          dilution_water_g: number | null
          dose_feedback: string | null
          dose_g: number | null
          dose_mode: string | null
          equipment_id: string | null
          equipment_snapshot: Json
          extraction_ms: number | null
          grind_seconds: number | null
          grind_setting: number | null
          grinder_id: string | null
          heat_intensity: string | null
          hidden_from_dashboard: boolean
          id: string
          idempotency_key: string | null
          input_weight_g: number | null
          intensity: number | null
          machine_id: string | null
          machine_snapshot: Json
          method: string
          moka_cup_size: number | null
          notes: string | null
          output_volume_ml: number | null
          output_weight_g: number | null
          overall_rating: number | null
          parent_attempt_id: string | null
          preinfusion_ms: number | null
          pressure_observation: string | null
          shot_mode: string | null
          sweetness: number | null
          target_time_ms: number | null
          target_weight_g: number | null
          tds_percent: number | null
          temperature_c: number | null
          temperature_offset_c: number | null
          updated_at: string
          upper_burr_setting: number | null
          used_bit_more: boolean
          user_id: string
          water_g: number | null
          would_brew_again: boolean | null
        }
        Insert: {
          acidity?: number | null
          attempt_no?: number
          balance?: number | null
          basket_size?: string | null
          basket_wall?: string | null
          bitterness?: number | null
          body?: number | null
          coffee_bag_id: string
          coffee_id: string
          created_at?: string
          dilution_water_g?: number | null
          dose_feedback?: string | null
          dose_g?: number | null
          dose_mode?: string | null
          equipment_id?: string | null
          equipment_snapshot?: Json
          extraction_ms?: number | null
          grind_seconds?: number | null
          grind_setting?: number | null
          grinder_id?: string | null
          heat_intensity?: string | null
          hidden_from_dashboard?: boolean
          id?: string
          idempotency_key?: string | null
          input_weight_g?: number | null
          intensity?: number | null
          machine_id?: string | null
          machine_snapshot?: Json
          method?: string
          moka_cup_size?: number | null
          notes?: string | null
          output_volume_ml?: number | null
          output_weight_g?: number | null
          overall_rating?: number | null
          parent_attempt_id?: string | null
          preinfusion_ms?: number | null
          pressure_observation?: string | null
          shot_mode?: string | null
          sweetness?: number | null
          target_time_ms?: number | null
          target_weight_g?: number | null
          tds_percent?: number | null
          temperature_c?: number | null
          temperature_offset_c?: number | null
          updated_at?: string
          upper_burr_setting?: number | null
          used_bit_more?: boolean
          user_id: string
          water_g?: number | null
          would_brew_again?: boolean | null
        }
        Update: {
          acidity?: number | null
          attempt_no?: number
          balance?: number | null
          basket_size?: string | null
          basket_wall?: string | null
          bitterness?: number | null
          body?: number | null
          coffee_bag_id?: string
          coffee_id?: string
          created_at?: string
          dilution_water_g?: number | null
          dose_feedback?: string | null
          dose_g?: number | null
          dose_mode?: string | null
          equipment_id?: string | null
          equipment_snapshot?: Json
          extraction_ms?: number | null
          grind_seconds?: number | null
          grind_setting?: number | null
          grinder_id?: string | null
          heat_intensity?: string | null
          hidden_from_dashboard?: boolean
          id?: string
          idempotency_key?: string | null
          input_weight_g?: number | null
          intensity?: number | null
          machine_id?: string | null
          machine_snapshot?: Json
          method?: string
          moka_cup_size?: number | null
          notes?: string | null
          output_volume_ml?: number | null
          output_weight_g?: number | null
          overall_rating?: number | null
          parent_attempt_id?: string | null
          preinfusion_ms?: number | null
          pressure_observation?: string | null
          shot_mode?: string | null
          sweetness?: number | null
          target_time_ms?: number | null
          target_weight_g?: number | null
          tds_percent?: number | null
          temperature_c?: number | null
          temperature_offset_c?: number | null
          updated_at?: string
          upper_burr_setting?: number | null
          used_bit_more?: boolean
          user_id?: string
          water_g?: number | null
          would_brew_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "brew_attempts_coffee_bag_id_fkey"
            columns: ["coffee_bag_id"]
            isOneToOne: false
            referencedRelation: "coffee_bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_attempts_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_attempts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "user_brew_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_attempts_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "user_grinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_attempts_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "user_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brew_attempts_parent_attempt_id_fkey"
            columns: ["parent_attempt_id"]
            isOneToOne: false
            referencedRelation: "brew_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_bags: {
        Row: {
          coffee_id: string
          created_at: string
          estimated_dose_g: number | null
          finished_at: string | null
          first_brew_at: string | null
          id: string
          inventory_mode: string
          lot_label: string | null
          opened_at: string | null
          package_weight_g: number | null
          purchase_date: string | null
          remaining_g: number | null
          roast_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coffee_id: string
          created_at?: string
          estimated_dose_g?: number | null
          finished_at?: string | null
          first_brew_at?: string | null
          id?: string
          inventory_mode?: string
          lot_label?: string | null
          opened_at?: string | null
          package_weight_g?: number | null
          purchase_date?: string | null
          remaining_g?: number | null
          roast_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coffee_id?: string
          created_at?: string
          estimated_dose_g?: number | null
          finished_at?: string | null
          first_brew_at?: string | null
          id?: string
          inventory_mode?: string
          lot_label?: string | null
          opened_at?: string | null
          package_weight_g?: number | null
          purchase_date?: string | null
          remaining_g?: number | null
          roast_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_bags_coffee_id_fkey"
            columns: ["coffee_id"]
            isOneToOne: false
            referencedRelation: "coffees"
            referencedColumns: ["id"]
          },
        ]
      }
      coffee_media: {
        Row: {
          alt_text: string | null
          coffee_bag_id: string
          created_at: string
          id: string
          is_cover: boolean
          kind: string
          storage_path: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          coffee_bag_id: string
          created_at?: string
          id?: string
          is_cover?: boolean
          kind?: string
          storage_path: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
          coffee_bag_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          kind?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffee_media_coffee_bag_id_fkey"
            columns: ["coffee_bag_id"]
            isOneToOne: false
            referencedRelation: "coffee_bags"
            referencedColumns: ["id"]
          },
        ]
      }
      coffees: {
        Row: {
          altitude_max_m: number | null
          altitude_min_m: number | null
          archived_at: string | null
          country: string | null
          created_at: string
          farm: string | null
          id: string
          name: string
          preferred_attempt_id: string | null
          process: string | null
          producer: string | null
          region: string | null
          roast_level: string | null
          roaster: string
          tasting_notes: string[]
          updated_at: string
          user_id: string
          varieties: string[]
        }
        Insert: {
          altitude_max_m?: number | null
          altitude_min_m?: number | null
          archived_at?: string | null
          country?: string | null
          created_at?: string
          farm?: string | null
          id?: string
          name: string
          preferred_attempt_id?: string | null
          process?: string | null
          producer?: string | null
          region?: string | null
          roast_level?: string | null
          roaster: string
          tasting_notes?: string[]
          updated_at?: string
          user_id: string
          varieties?: string[]
        }
        Update: {
          altitude_max_m?: number | null
          altitude_min_m?: number | null
          archived_at?: string | null
          country?: string | null
          created_at?: string
          farm?: string | null
          id?: string
          name?: string
          preferred_attempt_id?: string | null
          process?: string | null
          producer?: string | null
          region?: string | null
          roast_level?: string | null
          roaster?: string
          tasting_notes?: string[]
          updated_at?: string
          user_id?: string
          varieties?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "coffees_preferred_attempt_fk"
            columns: ["preferred_attempt_id"]
            isOneToOne: false
            referencedRelation: "brew_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events: {
        Row: {
          attempt_id: string | null
          coffee_bag_id: string
          created_at: string
          delta_g: number
          id: string
          kind: string
          note: string | null
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          coffee_bag_id: string
          created_at?: string
          delta_g: number
          id?: string
          kind: string
          note?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          coffee_bag_id?: string
          created_at?: string
          delta_g?: number
          id?: string
          kind?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "brew_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_coffee_bag_id_fkey"
            columns: ["coffee_bag_id"]
            isOneToOne: false
            referencedRelation: "coffee_bags"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_models: {
        Row: {
          brand: string
          capabilities: Json
          capabilities_version: number
          created_at: string
          id: string
          model_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          brand: string
          capabilities?: Json
          capabilities_version?: number
          created_at?: string
          id?: string
          model_name: string
          slug: string
          updated_at?: string
        }
        Update: {
          brand?: string
          capabilities?: Json
          capabilities_version?: number
          created_at?: string
          id?: string
          model_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_machine_id: string | null
          display_name: string | null
          id: string
          is_anonymous: boolean
          locale: string
          role: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          default_machine_id?: string | null
          display_name?: string | null
          id: string
          is_anonymous?: boolean
          locale?: string
          role?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          default_machine_id?: string | null
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          locale?: string
          role?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_machine_fk"
            columns: ["default_machine_id"]
            isOneToOne: false
            referencedRelation: "user_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_brew_equipment: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          method: string
          model_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          method: string
          model_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          method?: string
          model_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_grinders: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          model_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          model_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          model_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_machines: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          machine_model_id: string
          nickname: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          machine_model_id: string
          nickname?: string | null
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          machine_model_id?: string
          nickname?: string | null
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_machines_machine_model_id_fkey"
            columns: ["machine_model_id"]
            isOneToOne: false
            referencedRelation: "machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dashboard_overview: {
        Args: never
        Returns: {
          avg_rating: number
          favorite_method: string
          total_brews: number
        }[]
      }
      set_default_equipment: {
        Args: { p_equipment_id: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean
          method: string
          model_name: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_brew_equipment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_default_grinder: {
        Args: { p_grinder_id: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean
          model_name: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_grinders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_default_machine: {
        Args: { p_machine_model_id: string; p_nickname?: string }
        Returns: {
          created_at: string
          id: string
          is_default: boolean
          machine_model_id: string
          nickname: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_machines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_preferred_attempt: {
        Args: { p_attempt_id: string; p_coffee_id: string }
        Returns: {
          altitude_max_m: number | null
          altitude_min_m: number | null
          archived_at: string | null
          country: string | null
          created_at: string
          farm: string | null
          id: string
          name: string
          preferred_attempt_id: string | null
          process: string | null
          producer: string | null
          region: string | null
          roast_level: string | null
          roaster: string
          tasting_notes: string[]
          updated_at: string
          user_id: string
          varieties: string[]
        }
        SetofOptions: {
          from: "*"
          to: "coffees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stats_by_coffee: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          avg_rating: number
          coffee_id: string
          has_preferred: boolean
          name: string
          rated_count: number
          roaster: string
        }[]
      }
      stats_by_dimension: {
        Args: { p_dimension: string; p_from?: string; p_to?: string }
        Returns: {
          avg_rating: number
          label: string
          rated_count: number
        }[]
      }
      stats_by_method: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          avg_rating: number
          method: string
          rated_count: number
        }[]
      }
      stats_extraction_seconds_distribution: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          attempt_count: number
          bucket_seconds: number
        }[]
      }
      stats_frequent_notes: {
        Args: { p_from?: string; p_min_rating?: number; p_to?: string }
        Returns: {
          coffee_count: number
          note: string
        }[]
      }
      stats_grind_setting_distribution: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          attempt_count: number
          grind_setting: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
