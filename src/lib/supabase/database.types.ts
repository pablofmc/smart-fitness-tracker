
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activities": {
                  Row: {
                    "avg_hr": number | null,"data": NonNullable<Json>,"distance_m": number | null,"duration_s": number | null,"exercise_count": number | null,"id": number,"local_day": string,"max_hr": number | null,"moving_s": number | null,"name": string | null,"parser_version": number,"raw_file_id": number,"raw_sha256": string,"sport": string,"started_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_hr"?: number | null,"data": NonNullable<Json>,"distance_m"?: number | null,"duration_s"?: number | null,"exercise_count"?: number | null,"id": number,"local_day": string,"max_hr"?: number | null,"moving_s"?: number | null,"name"?: string | null,"parser_version": number,"raw_file_id": number,"raw_sha256": string,"sport": string,"started_at"?: string | null
                  }
                  Update: {
                    "avg_hr"?: number | null,"data"?: NonNullable<Json>,"distance_m"?: number | null,"duration_s"?: number | null,"exercise_count"?: number | null,"id"?: number,"local_day"?: string,"max_hr"?: number | null,"moving_s"?: number | null,"name"?: string | null,"parser_version"?: number,"raw_file_id"?: number,"raw_sha256"?: string,"sport"?: string,"started_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_raw_file_id_fkey"
      columns: ["raw_file_id"]
isOneToOne: false
      referencedRelation: "raw_files"
      referencedColumns: ["id"]
    }
                  ]
                },"activity_loads": {
                  Row: {
                    "activity_id": number,"computed_at": string,"formula_version": number,"hr_minutes": number | null,"hr_settings_id": number | null,"trimp": number | null,"unavailable_reason": string | null,"zone_seconds": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": number,"computed_at"?: string,"formula_version": number,"hr_minutes"?: number | null,"hr_settings_id"?: number | null,"trimp"?: number | null,"unavailable_reason"?: string | null,"zone_seconds"?: (number)[] | null
                  }
                  Update: {
                    "activity_id"?: number,"computed_at"?: string,"formula_version"?: number,"hr_minutes"?: number | null,"hr_settings_id"?: number | null,"trimp"?: number | null,"unavailable_reason"?: string | null,"zone_seconds"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_loads_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: true
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_loads_hr_settings_id_fkey"
      columns: ["hr_settings_id"]
isOneToOne: false
      referencedRelation: "hr_settings"
      referencedColumns: ["id"]
    }
                  ]
                },"checkin_tags": {
                  Row: {
                    "created_at": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"checkins": {
                  Row: {
                    "day": string,"feel": number | null,"note": string | null,"tags": (string)[],"updated_at": string,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"feel"?: number | null,"note"?: string | null,"tags"?: (string)[],"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Update: {
                    "day"?: string,"feel"?: number | null,"note"?: string | null,"tags"?: (string)[],"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"garmin_key": {
                  Row: {
                    "api_key": string,"blocked_at": string | null,"expires_on": string,"id": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "api_key": string,"blocked_at"?: string | null,"expires_on": string,"id"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "api_key"?: string,"blocked_at"?: string | null,"expires_on"?: string,"id"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"health_days": {
                  Row: {
                    "data": NonNullable<Json>,"day": string,"kind": string,"parser_version": number,"raw_file_id": number,"raw_sha256": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data": NonNullable<Json>,"day": string,"kind": string,"parser_version": number,"raw_file_id": number,"raw_sha256": string
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"day"?: string,"kind"?: string,"parser_version"?: number,"raw_file_id"?: number,"raw_sha256"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "health_days_raw_file_id_fkey"
      columns: ["raw_file_id"]
isOneToOne: false
      referencedRelation: "raw_files"
      referencedColumns: ["id"]
    }
                  ]
                },"health_parsed_files": {
                  Row: {
                    "parser_version": number,"raw_file_id": number,"raw_sha256": string
                  }
                  ComputedFields: never
                  Insert: {
                    "parser_version": number,"raw_file_id": number,"raw_sha256": string
                  }
                  Update: {
                    "parser_version"?: number,"raw_file_id"?: number,"raw_sha256"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "health_parsed_files_raw_file_id_fkey"
      columns: ["raw_file_id"]
isOneToOne: true
      referencedRelation: "raw_files"
      referencedColumns: ["id"]
    }
                  ]
                },"hr_settings": {
                  Row: {
                    "created_at": string,"effective_from": string,"id": number,"lthr": number,"max_hr": number,"resting_hr": number,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"effective_from": string,"id"?: never,"lthr": number,"max_hr": number,"resting_hr": number,"source"?: string
                  }
                  Update: {
                    "created_at"?: string,"effective_from"?: string,"id"?: never,"lthr"?: number,"max_hr"?: number,"resting_hr"?: number,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"raw_files": {
                  Row: {
                    "content_type": string,"fetched_at": string,"id": number,"kind": string,"sha256": string,"size_bytes": number,"source_key": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_type": string,"fetched_at"?: string,"id"?: never,"kind": string,"sha256": string,"size_bytes": number,"source_key": string,"storage_path": string
                  }
                  Update: {
                    "content_type"?: string,"fetched_at"?: string,"id"?: never,"kind"?: string,"sha256"?: string,"size_bytes"?: number,"source_key"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    
                  ]
                },"run_metrics": {
                  Row: {
                    "activity_id": number,"best_10k_s": number | null,"best_1k_s": number | null,"best_21k_s": number | null,"best_5k_s": number | null,"cadence_spm": number | null,"computed_at": string,"counts_for_records": boolean,"drift_pct": number | null,"drift_reason": string | null,"formula_version": number,"hr_settings_id": number | null,"pace_at_hr_reason": string | null,"pace_at_hr_s_per_km": number | null,"target_hr": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": number,"best_10k_s"?: number | null,"best_1k_s"?: number | null,"best_21k_s"?: number | null,"best_5k_s"?: number | null,"cadence_spm"?: number | null,"computed_at"?: string,"counts_for_records": boolean,"drift_pct"?: number | null,"drift_reason"?: string | null,"formula_version": number,"hr_settings_id"?: number | null,"pace_at_hr_reason"?: string | null,"pace_at_hr_s_per_km"?: number | null,"target_hr"?: number | null
                  }
                  Update: {
                    "activity_id"?: number,"best_10k_s"?: number | null,"best_1k_s"?: number | null,"best_21k_s"?: number | null,"best_5k_s"?: number | null,"cadence_spm"?: number | null,"computed_at"?: string,"counts_for_records"?: boolean,"drift_pct"?: number | null,"drift_reason"?: string | null,"formula_version"?: number,"hr_settings_id"?: number | null,"pace_at_hr_reason"?: string | null,"pace_at_hr_s_per_km"?: number | null,"target_hr"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "run_metrics_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: true
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "run_metrics_hr_settings_id_fkey"
      columns: ["hr_settings_id"]
isOneToOne: false
      referencedRelation: "hr_settings"
      referencedColumns: ["id"]
    }
                  ]
                },"shoe_models": {
                  Row: {
                    "brand": string,"created_at": string,"id": number,"model": string,"run_types": (string)[],"version": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand": string,"created_at"?: string,"id"?: never,"model": string,"run_types": (string)[],"version"?: string | null
                  }
                  Update: {
                    "brand"?: string,"created_at"?: string,"id"?: never,"model"?: string,"run_types"?: (string)[],"version"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"shoe_runs": {
                  Row: {
                    "activity_id": number,"shoe_id": number | null,"source": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": number,"shoe_id"?: number | null,"source": string,"updated_at"?: string
                  }
                  Update: {
                    "activity_id"?: number,"shoe_id"?: number | null,"source"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shoe_runs_shoe_id_fkey"
      columns: ["shoe_id"]
isOneToOne: false
      referencedRelation: "shoe_totals"
      referencedColumns: ["shoe_id"]
    },{
      foreignKeyName: "shoe_runs_shoe_id_fkey"
      columns: ["shoe_id"]
isOneToOne: false
      referencedRelation: "shoes"
      referencedColumns: ["id"]
    }
                  ]
                },"shoes": {
                  Row: {
                    "brand": string,"catalog_image": string | null,"created_at": string,"id": number,"initial_km": number,"is_default": boolean,"limit_km": number,"model": string,"photo_path": string | null,"retired_on": string | null,"run_types": (string)[],"started_on": string,"version": string | null,"warning_hidden_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand": string,"catalog_image"?: string | null,"created_at"?: string,"id"?: never,"initial_km"?: number,"is_default"?: boolean,"limit_km"?: number,"model": string,"photo_path"?: string | null,"retired_on"?: string | null,"run_types": (string)[],"started_on": string,"version"?: string | null,"warning_hidden_until"?: string | null
                  }
                  Update: {
                    "brand"?: string,"catalog_image"?: string | null,"created_at"?: string,"id"?: never,"initial_km"?: number,"is_default"?: boolean,"limit_km"?: number,"model"?: string,"photo_path"?: string | null,"retired_on"?: string | null,"run_types"?: (string)[],"started_on"?: string,"version"?: string | null,"warning_hidden_until"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"strength_sessions": {
                  Row: {
                    "active_s": number,"activity_id": number,"computed_at": string,"exercises": NonNullable<Json>,"formula_version": number,"group_sets": NonNullable<Json>,"total_reps": number,"total_sets": number,"unknown_sets": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active_s": number,"activity_id": number,"computed_at"?: string,"exercises": NonNullable<Json>,"formula_version": number,"group_sets": NonNullable<Json>,"total_reps": number,"total_sets": number,"unknown_sets": number
                  }
                  Update: {
                    "active_s"?: number,"activity_id"?: number,"computed_at"?: string,"exercises"?: NonNullable<Json>,"formula_version"?: number,"group_sets"?: NonNullable<Json>,"total_reps"?: number,"total_sets"?: number,"unknown_sets"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "strength_sessions_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: true
      referencedRelation: "activities"
      referencedColumns: ["id"]
    }
                  ]
                },"sync_cursors": {
                  Row: {
                    "backfill_completed_at": string | null,"position": string | null,"stream": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "backfill_completed_at"?: string | null,"position"?: string | null,"stream": string,"updated_at"?: string
                  }
                  Update: {
                    "backfill_completed_at"?: string | null,"position"?: string | null,"stream"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sync_runs": {
                  Row: {
                    "error": string | null,"finished_at": string | null,"id": number,"items_fetched": number,"started_at": string,"status": string,"trigger": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"finished_at"?: string | null,"id"?: never,"items_fetched"?: number,"started_at"?: string,"status"?: string,"trigger": string
                  }
                  Update: {
                    "error"?: string | null,"finished_at"?: string | null,"id"?: never,"items_fetched"?: number,"started_at"?: string,"status"?: string,"trigger"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "shoe_totals": {
                  Row: {
                    "km": number | null,"runs": number | null,"shoe_id": number
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
