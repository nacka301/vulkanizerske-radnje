// Generirano preko Supabase MCP-a (generate_typescript_types) nad cloud
// projektom vulkanizerske-radnje. Regeneriraj nakon svake migracije koja
// mijenja shemu/funkcije.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      booking_events: {
        Row: {
          actor: string
          at: string
          booking_id: string
          data: Json
          event: string
          id: string
        }
        Insert: {
          actor: string
          at?: string
          booking_id: string
          data?: Json
          event: string
          id?: string
        }
        Update: {
          actor?: string
          at?: string
          booking_id?: string
          data?: Json
          event?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time: string
          id?: string
          license_plate: string
          manage_token?: string
          manage_token_hash?: string | null
          notes?: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          status_changed_at?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time?: string
          id?: string
          license_plate?: string
          manage_token?: string
          manage_token_hash?: string | null
          notes?: string | null
          service_id?: string
          slot_count?: number
          source?: Database["public"]["Enums"]["booking_source"]
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          status_changed_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          store_id: string | null
        }
        Insert: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          code: string
          default_slots: number
          id: string
          name: string
        }
        Insert: {
          code: string
          default_slots: number
          id?: string
          name: string
        }
        Update: {
          code?: string
          default_slots?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      slot_blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          reason: string | null
          starts_at: string
          store_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          reason?: string | null
          starts_at: string
          store_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          reason?: string | null
          starts_at?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_blocks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_holds: {
        Row: {
          created_at: string
          end_time: string
          expires_at: string
          id: string
          service_id: string
          start_time: string
          store_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          expires_at?: string
          id?: string
          service_id: string
          start_time: string
          store_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          expires_at?: string
          id?: string
          service_id?: string
          start_time?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_holds_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slot_holds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_outbox: {
        Row: {
          attempts: number
          body: string
          booking_id: string | null
          created_at: string
          error: string | null
          id: string
          kind: Database["public"]["Enums"]["sms_kind"]
          provider_message_id: string | null
          scheduled_at: string
          sending_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["sms_status"]
          to_phone: string
        }
        Insert: {
          attempts?: number
          body: string
          booking_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind: Database["public"]["Enums"]["sms_kind"]
          provider_message_id?: string | null
          scheduled_at?: string
          sending_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"]
          to_phone: string
        }
        Update: {
          attempts?: number
          body?: string
          booking_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["sms_kind"]
          provider_message_id?: string | null
          scheduled_at?: string
          sending_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"]
          to_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_outbox_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      store_hours: {
        Row: {
          close_time: string
          is_closed: boolean
          open_time: string
          store_id: string
          weekday: number
        }
        Insert: {
          close_time: string
          is_closed?: boolean
          open_time: string
          store_id: string
          weekday: number
        }
        Update: {
          close_time?: string
          is_closed?: boolean
          open_time?: string
          store_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_hours_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_services: {
        Row: {
          enabled: boolean
          service_id: string
          slots: number
          store_id: string
        }
        Insert: {
          enabled?: boolean
          service_id: string
          slots: number
          store_id: string
        }
        Update: {
          enabled?: boolean
          service_id?: string
          slots?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean
          address: string | null
          bays: number
          client_cancel_cutoff_minutes: number
          created_at: string
          id: string
          max_horizon_days: number
          min_lead_minutes: number
          name: string
          phone: string | null
          require_otp: boolean
          slot_minutes: number
          slug: string
          timezone: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          bays?: number
          client_cancel_cutoff_minutes?: number
          created_at?: string
          id?: string
          max_horizon_days?: number
          min_lead_minutes?: number
          name: string
          phone?: string | null
          require_otp?: boolean
          slot_minutes?: number
          slug: string
          timezone?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          bays?: number
          client_cancel_cutoff_minutes?: number
          created_at?: string
          id?: string
          max_horizon_days?: number
          min_lead_minutes?: number
          name?: string
          phone?: string | null
          require_otp?: boolean
          slot_minutes?: number
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_setting: { Args: { p_key: string }; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      auth_store_id: { Args: never; Returns: string }
      build_sms_body: {
        Args: {
          p_kind: Database["public"]["Enums"]["sms_kind"]
          p_plate: string
          p_start: string
          p_store_name: string
          p_tz: string
          p_url: string
        }
        Returns: string
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      client_cancel_booking: {
        Args: { p_token: string }
        Returns: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
      }
      create_booking: {
        Args: {
          p_hold_id?: string | null
          p_name: string | null
          p_phone: string | null
          p_plate: string
          p_service_id: string
          p_source: Database["public"]["Enums"]["booking_source"]
          p_start: string
          p_store_id: string
        }
        Returns: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
      }
      create_hold: {
        Args: { p_service_id: string; p_start: string; p_store_id: string }
        Returns: {
          created_at: string
          end_time: string
          expires_at: string
          id: string
          service_id: string
          start_time: string
          store_id: string
        }
      }
      get_availability: {
        Args: { p_date: string; p_service_id: string; p_store_id: string }
        Returns: {
          available: boolean
          start_time: string
        }[]
      }
      get_booking_by_token: {
        Args: { p_token: string }
        Returns: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
      }
      hr_strip_diacritics: { Args: { p_text: string }; Returns: string }
      reschedule_booking: {
        Args: {
          p_actor: string
          p_booking_id: string
          p_new_start: string
          p_notify: boolean
          p_store_id: string
        }
        Returns: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
      }
      set_booking_status: {
        Args: {
          p_actor?: string
          p_booking_id: string
          p_notify?: boolean
          p_status: Database["public"]["Enums"]["booking_status"]
          p_store_id: string
        }
        Returns: {
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          license_plate: string
          manage_token: string
          manage_token_hash: string | null
          notes: string | null
          service_id: string
          slot_count: number
          source: Database["public"]["Enums"]["booking_source"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          status_changed_at: string
          store_id: string
          updated_at: string
        }
      }
      store_stats: {
        Args: {
          p_from: string
          p_group?: string
          p_store_id: string | null
          p_to: string
        }
        Returns: {
          bucket: string
          cancelled: number
          completed: number
          confirmed: number
          no_show: number
          no_show_rate: number
          source_online: number
          source_phone: number
          source_walk_in: number
          store_id: string
          total: number
        }[]
      }
      validate_booking_slot: {
        Args: {
          p_end: string
          p_ignore_booking_id: string | null
          p_ignore_hold_id: string | null
          p_start: string
          p_store_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_source: "ONLINE" | "PHONE" | "WALK_IN"
      booking_status: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
      sms_kind: "CONFIRMATION" | "REMINDER" | "CANCELLATION" | "RESCHEDULE"
      sms_status: "PENDING" | "SENDING" | "SENT" | "FAILED" | "CANCELLED"
      user_role: "super_admin" | "store_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
