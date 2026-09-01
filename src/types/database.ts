// Hand-written for Fase 0. Regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// once the Supabase CLI is linked, and keep it in sync after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          is_anonymous: boolean;
          default_machine_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      machine_models: {
        Row: {
          id: string;
          slug: string;
          brand: string;
          model_name: string;
          capabilities_version: number;
          capabilities: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["machine_models"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["machine_models"]["Row"]>;
        Relationships: [];
      };
      user_machines: {
        Row: {
          id: string;
          user_id: string;
          machine_model_id: string;
          nickname: string | null;
          settings: Json;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_machines"]["Row"]> & {
          user_id: string;
          machine_model_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_machines"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "user_machines_machine_model_id_fkey";
            columns: ["machine_model_id"];
            referencedRelation: "machine_models";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_default_machine: {
        Args: { p_machine_model_id: string; p_nickname?: string | null };
        Returns: Database["public"]["Tables"]["user_machines"]["Row"];
      };
    };
  };
}
