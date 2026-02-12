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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addon_requests: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          rejection_reason: string | null
          requested_at: string
          requested_by: string
          requested_price: number
          reviewed_at: string | null
          reviewed_by: string | null
          service_id: string
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by: string
          requested_price: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id: string
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string
          requested_price?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_audit_log: {
        Row: {
          action: string
          booking_id: string
          changed_by: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          stage_id: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          booking_id: string
          changed_by: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          stage_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          booking_id?: string
          changed_by?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          stage_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_audit_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_audit_log_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "booking_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_services: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          price: number
          service_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          price: number
          service_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_services_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_stage_images: {
        Row: {
          booking_stage_id: string
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          booking_stage_id: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          booking_stage_id?: string
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_stage_images_booking_stage_id_fkey"
            columns: ["booking_stage_id"]
            isOneToOne: false
            referencedRelation: "booking_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_stages: {
        Row: {
          assigned_to: string | null
          booking_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          stage: string
          stage_name: string | null
          stage_order: number | null
          started_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          stage: string
          stage_name?: string | null
          stage_order?: number | null
          started_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          stage?: string
          stage_name?: string | null
          stage_order?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_stages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string | null
          created_at: string | null
          current_stage: string | null
          estimated_completion: string | null
          id: string
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          priority: string | null
          service_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          template_id: string | null
          updated_at: string | null
          user_id: string
          vehicle_id: string | null
          yoco_checkout_id: string | null
          yoco_payment_id: string | null
        }
        Insert: {
          booking_date: string
          booking_time?: string | null
          created_at?: string | null
          current_stage?: string | null
          estimated_completion?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          priority?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_id?: string | null
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string | null
          created_at?: string | null
          current_stage?: string | null
          estimated_completion?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          priority?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string | null
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
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
            foreignKeyName: "bookings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "process_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          merchandise_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchandise_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchandise_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          before_image_url: string | null
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          is_featured: boolean | null
          service_id: string | null
          title: string
          updated_at: string | null
          vehicle_info: string | null
        }
        Insert: {
          before_image_url?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          is_featured?: boolean | null
          service_id?: string | null
          title: string
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Update: {
          before_image_url?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          service_id?: string | null
          title?: string
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_consumable: boolean | null
          last_restocked_at: string | null
          location: string | null
          min_stock_level: number | null
          name: string
          quantity: number
          sku: string | null
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_consumable?: boolean | null
          last_restocked_at?: string | null
          location?: string | null
          min_stock_level?: number | null
          name: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          cost_per_unit?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_consumable?: boolean | null
          last_restocked_at?: string | null
          location?: string | null
          min_stock_level?: number | null
          name?: string
          quantity?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          performed_by: string
          quantity: number
          transaction_type: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          performed_by: string
          quantity: number
          transaction_type: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          converted_to_booking_id: string | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          deposit_paid_at: string | null
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string
          priority: string
          quoted_amount: number | null
          service_interest: string[] | null
          source: string
          status: string
          updated_at: string
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: string | null
        }
        Insert: {
          assigned_to?: string | null
          converted_to_booking_id?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone: string
          priority?: string
          quoted_amount?: number | null
          service_interest?: string[] | null
          source?: string
          status?: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
        }
        Update: {
          assigned_to?: string | null
          converted_to_booking_id?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string
          priority?: string
          quoted_amount?: number | null
          service_interest?: string[] | null
          source?: string
          status?: string
          updated_at?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_booking_id_fkey"
            columns: ["converted_to_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          lifetime_points: number
          points: number
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          booking_id: string | null
          created_at: string | null
          description: string | null
          id: string
          points: number
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          in_app_enabled: boolean | null
          notify_booking_confirmations: boolean | null
          notify_eta_updates: boolean | null
          notify_promotions: boolean | null
          notify_ready_for_pickup: boolean | null
          notify_stage_updates: boolean | null
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          in_app_enabled?: boolean | null
          notify_booking_confirmations?: boolean | null
          notify_eta_updates?: boolean | null
          notify_promotions?: boolean | null
          notify_ready_for_pickup?: boolean | null
          notify_stage_updates?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          in_app_enabled?: boolean | null
          notify_booking_confirmations?: boolean | null
          notify_eta_updates?: boolean | null
          notify_promotions?: boolean | null
          notify_ready_for_pickup?: boolean | null
          notify_stage_updates?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_required: boolean | null
          booking_id: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          read_at: string | null
          recipient_uid: string
          sender_uid: string | null
          title: string
          type: string
          vehicle_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read_at?: string | null
          recipient_uid: string
          sender_uid?: string | null
          title: string
          type: string
          vehicle_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read_at?: string | null
          recipient_uid?: string
          sender_uid?: string | null
          title?: string
          type?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          merchandise_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          merchandise_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          merchandise_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          shipping_address: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
          yoco_checkout_id: string | null
          yoco_payment_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          shipping_address?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          shipping_address?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
        }
        Relationships: []
      }
      process_template_stages: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          requires_photo: boolean | null
          stage_name: string
          stage_order: number
          template_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          requires_photo?: boolean | null
          stage_name: string
          stage_order: number
          template_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          requires_photo?: boolean | null
          stage_name?: string
          stage_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "process_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          service_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          service_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          service_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          id: string
          points_awarded: number | null
          promo_code_id: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          points_awarded?: number | null
          promo_code_id: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          points_awarded?: number | null
          promo_code_id?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          points_value: number
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          points_value?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          points_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_info: string | null
          endpoint: string
          expires_at: string | null
          id: string
          p256dh_key: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_info?: string | null
          endpoint: string
          expires_at?: string | null
          id?: string
          p256dh_key: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_info?: string | null
          endpoint?: string
          expires_at?: string | null
          id?: string
          p256dh_key?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          reward_points: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          reward_points?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          reward_points?: number | null
          status?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          content: string | null
          created_at: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          rating: number
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating: number
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_availability: {
        Row: {
          available_slots: number | null
          booked_slots: number | null
          created_at: string | null
          date: string
          id: string
          is_available: boolean | null
          service_id: string
        }
        Insert: {
          available_slots?: number | null
          booked_slots?: number | null
          created_at?: string | null
          date: string
          id?: string
          is_available?: boolean | null
          service_id: string
        }
        Update: {
          available_slots?: number | null
          booked_slots?: number | null
          created_at?: string | null
          date?: string
          id?: string
          is_available?: boolean | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_availability_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          add_ons: string[] | null
          category: string
          color: string | null
          created_at: string | null
          description: string | null
          duration: string
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          notes: string[] | null
          price_from: number
          title: string
          updated_at: string | null
        }
        Insert: {
          add_ons?: string[] | null
          category: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration: string
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          notes?: string[] | null
          price_from: number
          title: string
          updated_at?: string | null
        }
        Update: {
          add_ons?: string[] | null
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          notes?: string[] | null
          price_from?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          job_title: string | null
          staff_role: Database["public"]["Enums"]["staff_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          job_title?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"]
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          job_title?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          can_approve_pricing: boolean | null
          can_collect_deposits: boolean | null
          created_at: string
          department: string | null
          department_id: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          is_primary_contact: boolean | null
          job_title: string | null
          notes: string | null
          phone_number: string | null
          responsibilities: string[] | null
          skills: string[] | null
          staff_role: Database["public"]["Enums"]["staff_role"] | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_approve_pricing?: boolean | null
          can_collect_deposits?: boolean | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_primary_contact?: boolean | null
          job_title?: string | null
          notes?: string | null
          phone_number?: string | null
          responsibilities?: string[] | null
          skills?: string[] | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_approve_pricing?: boolean | null
          can_collect_deposits?: boolean | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          is_primary_contact?: boolean | null
          job_title?: string | null
          notes?: string | null
          phone_number?: string | null
          responsibilities?: string[] | null
          skills?: string[] | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          image_url: string | null
          make: string
          model: string
          updated_at: string | null
          user_id: string
          vin: string | null
          year: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          make: string
          model: string
          updated_at?: string | null
          user_id: string
          vin?: string | null
          year: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          make?: string
          model?: string
          updated_at?: string | null
          user_id?: string
          vin?: string | null
          year?: string
        }
        Relationships: []
      }
      whatsapp_alert_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone_number: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone_number: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone_number?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_booking_stage: { Args: { p_booking_id: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: undefined
      }
      redeem_promo_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "client" | "staff" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      inventory_category:
        | "ppf_film"
        | "vinyl"
        | "adhesives"
        | "cleaning_supplies"
        | "polishing_compounds"
        | "tools"
        | "equipment"
        | "safety_gear"
        | "other"
      staff_role:
        | "technician"
        | "senior_technician"
        | "team_lead"
        | "supervisor"
        | "manager"
        | "director"
        | "lead_manager"
        | "sales"
        | "admin_support"
        | "reception"
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
      app_role: ["client", "staff", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      inventory_category: [
        "ppf_film",
        "vinyl",
        "adhesives",
        "cleaning_supplies",
        "polishing_compounds",
        "tools",
        "equipment",
        "safety_gear",
        "other",
      ],
      staff_role: [
        "technician",
        "senior_technician",
        "team_lead",
        "supervisor",
        "manager",
        "director",
        "lead_manager",
        "sales",
        "admin_support",
        "reception",
      ],
    },
  },
} as const
