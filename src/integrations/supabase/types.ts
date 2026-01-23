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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      catalog_items: {
        Row: {
          category: Database["public"]["Enums"]["catalog_category"]
          created_at: string
          description: string
          id: string
          search_keywords: string[] | null
          search_vector: unknown
          size_or_spec: string | null
          supplier_id: string
          supplier_sku: string
          uom_default: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["catalog_category"]
          created_at?: string
          description: string
          id?: string
          search_keywords?: string[] | null
          search_vector?: unknown
          size_or_spec?: string | null
          supplier_id: string
          supplier_sku: string
          uom_default?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["catalog_category"]
          created_at?: string
          description?: string
          id?: string
          search_keywords?: string[] | null
          search_vector?: unknown
          size_or_spec?: string | null
          supplier_id?: string
          supplier_sku?: string
          uom_default?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      change_work_pricing: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number
          sort_order: number
          unit_price: number
          uom: string
          updated_at: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
          uom?: string
          updated_at?: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          sort_order?: number
          unit_price?: number
          uom?: string
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_work_pricing_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_rollups: {
        Row: {
          category: string
          created_at: string
          description: string
          final_amount: number | null
          id: string
          markup_percent: number
          notes: string | null
          raw_cost: number
          updated_at: string
          work_item_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          final_amount?: number | null
          id?: string
          markup_percent?: number
          notes?: string | null
          raw_cost?: number
          updated_at?: string
          work_item_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          final_amount?: number | null
          id?: string
          markup_percent?: number
          notes?: string | null
          raw_cost?: number
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_rollups_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_packs: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          pack_name: string
          pack_type: Database["public"]["Enums"]["pack_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          pack_name: string
          pack_type?: Database["public"]["Enums"]["pack_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          pack_name?: string
          pack_type?: Database["public"]["Enums"]["pack_type"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_packs_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "project_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries: {
        Row: {
          created_at: string
          description: string | null
          entered_by: string
          entry_date: string
          hourly_rate: number | null
          hours: number
          id: string
          updated_at: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entered_by: string
          entry_date?: string
          hourly_rate?: number | null
          hours: number
          id?: string
          updated_at?: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entered_by?: string
          entry_date?: string
          hourly_rate?: number | null
          hours?: number
          id?: string
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      material_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_number: string | null
          ordering_mode: string
          status: Database["public"]["Enums"]["order_status"]
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string | null
          updated_at: string
          work_item_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          ordering_mode: string
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          updated_at?: string
          work_item_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          ordering_mode?: string
          status?: Database["public"]["Enums"]["order_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string | null
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_orders_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string
          body: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_read: boolean
          recipient_org_id: string
          recipient_user_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          action_url: string
          body?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_read?: boolean
          recipient_org_id: string
          recipient_user_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          action_url?: string
          body?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_read?: boolean
          recipient_org_id?: string
          recipient_user_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          catalog_item_id: string | null
          category: string | null
          computed_bf: number | null
          computed_lf: number | null
          created_at: string
          description: string
          from_pack: boolean
          id: string
          length_ft: number | null
          notes: string | null
          order_id: string
          pack_id: string | null
          pieces: number | null
          quantity: number
          supplier_sku: string | null
          thickness_in: number | null
          uom: string
          updated_at: string
          width_in: number | null
        }
        Insert: {
          catalog_item_id?: string | null
          category?: string | null
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description: string
          from_pack?: boolean
          id?: string
          length_ft?: number | null
          notes?: string | null
          order_id: string
          pack_id?: string | null
          pieces?: number | null
          quantity?: number
          supplier_sku?: string | null
          thickness_in?: number | null
          uom?: string
          updated_at?: string
          width_in?: number | null
        }
        Update: {
          catalog_item_id?: string | null
          category?: string | null
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description?: string
          from_pack?: boolean
          id?: string
          length_ft?: number | null
          notes?: string | null
          order_id?: string
          pack_id?: string | null
          pieces?: number | null
          quantity?: number
          supplier_sku?: string | null
          thickness_in?: number | null
          uom?: string
          updated_at?: string
          width_in?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "material_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "estimate_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_organization_id_fkey"
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
          id: string
          name: string
          org_code: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_code: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_code?: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      pack_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string
          id: string
          notes: string | null
          pack_id: string
          quantity: number
          supplier_sku: string | null
          uom: string
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          pack_id: string
          quantity?: number
          supplier_sku?: string | null
          uom?: string
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          pack_id?: string
          quantity?: number
          supplier_sku?: string | null
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "estimate_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      po_line_items: {
        Row: {
          computed_bf: number | null
          computed_lf: number | null
          created_at: string
          description: string
          id: string
          length_ft: number | null
          line_number: number
          notes: string | null
          pieces: number | null
          po_id: string
          quantity: number
          supplier_sku: string | null
          uom: string
        }
        Insert: {
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description: string
          id?: string
          length_ft?: number | null
          line_number: number
          notes?: string | null
          pieces?: number | null
          po_id: string
          quantity: number
          supplier_sku?: string | null
          uom?: string
        }
        Update: {
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description?: string
          id?: string
          length_ft?: number | null
          line_number?: number
          notes?: string | null
          pieces?: number | null
          po_id?: string
          quantity?: number
          supplier_sku?: string | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_estimates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          project_id: string
          status: Database["public"]["Enums"]["estimate_status"]
          submitted_at: string | null
          supplier_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["estimate_status"]
          submitted_at?: string | null
          supplier_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          submitted_at?: string | null
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_estimates_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_participants: {
        Row: {
          accepted_at: string | null
          id: string
          invite_status: string
          invited_at: string
          invited_by: string
          organization_id: string
          project_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invite_status?: string
          invited_at?: string
          invited_by: string
          organization_id: string
          project_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invite_status?: string
          invited_at?: string
          invited_by?: string
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: Json | null
          build_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mobilization_enabled: boolean | null
          name: string
          organization_id: string
          parties: Json | null
          project_type: string | null
          retainage_percent: number | null
          scope: Json | null
          status: string
          structures: Json | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          build_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mobilization_enabled?: boolean | null
          name: string
          organization_id: string
          parties?: Json | null
          project_type?: string | null
          retainage_percent?: number | null
          scope?: Json | null
          status?: string
          structures?: Json | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          build_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mobilization_enabled?: boolean | null
          name?: string
          organization_id?: string
          parties?: Json | null
          project_type?: string | null
          retainage_percent?: number | null
          scope?: Json | null
          status?: string
          structures?: Json | null
          updated_at?: string
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
      purchase_orders: {
        Row: {
          created_at: string
          download_token: string | null
          id: string
          material_order_id: string | null
          notes: string | null
          organization_id: string
          po_name: string
          po_number: string
          project_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          created_at?: string
          download_token?: string | null
          id?: string
          material_order_id?: string | null
          notes?: string | null
          organization_id: string
          po_name: string
          po_number: string
          project_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id: string
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          created_at?: string
          download_token?: string | null
          id?: string
          material_order_id?: string | null
          notes?: string | null
          organization_id?: string
          po_name?: string
          po_number?: string
          project_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_material_order_id_fkey"
            columns: ["material_order_id"]
            isOneToOne: false
            referencedRelation: "material_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number
          supplier_id: string
          tc_markup_percent: number | null
          tc_notes: string | null
          unit_cost: number
          uom: string
          updated_at: string
          work_item_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          supplier_id: string
          tc_markup_percent?: number | null
          tc_notes?: string | null
          unit_cost?: number
          uom?: string
          updated_at?: string
          work_item_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          supplier_id?: string
          tc_markup_percent?: number | null
          tc_notes?: string | null
          unit_cost?: number
          uom?: string
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_info: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          supplier_code: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          supplier_code: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          supplier_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_billable_slices: {
        Row: {
          created_at: string
          id: string
          invoice_reference: string | null
          invoiced_at: string | null
          labor_amount: number
          markup_amount: number
          material_amount: number
          period_id: string
          slice_number: number
          total_amount: number
          work_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_reference?: string | null
          invoiced_at?: string | null
          labor_amount?: number
          markup_amount?: number
          material_amount?: number
          period_id: string
          slice_number: number
          total_amount?: number
          work_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_reference?: string | null
          invoiced_at?: string | null
          labor_amount?: number
          markup_amount?: number
          material_amount?: number
          period_id?: string
          slice_number?: number
          total_amount?: number
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_billable_slices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: true
            referencedRelation: "tm_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_billable_slices_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: true
            referencedRelation: "tm_periods_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_billable_slices_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_labor_entries: {
        Row: {
          created_at: string
          description: string | null
          entered_by: string
          entry_date: string
          hourly_rate: number | null
          hours: number
          id: string
          period_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entered_by: string
          entry_date: string
          hourly_rate?: number | null
          hours: number
          id?: string
          period_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entered_by?: string
          entry_date?: string
          hourly_rate?: number | null
          hours?: number
          id?: string
          period_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_labor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_labor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods_gc"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_material_entries: {
        Row: {
          created_at: string
          description: string
          entry_date: string
          id: string
          notes: string | null
          period_id: string
          quantity: number
          supplier_id: string | null
          unit_cost: number | null
          uom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          entry_date: string
          id?: string
          notes?: string | null
          period_id: string
          quantity?: number
          supplier_id?: string | null
          unit_cost?: number | null
          uom?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          notes?: string | null
          period_id?: string
          quantity?: number
          supplier_id?: string | null
          unit_cost?: number | null
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_material_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_material_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_material_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          final_amount: number | null
          id: string
          labor_total: number | null
          markup_percent: number | null
          material_total: number | null
          period_end: string
          period_start: string
          period_type: string
          rejection_notes: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          work_item_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          final_amount?: number | null
          id?: string
          labor_total?: number | null
          markup_percent?: number | null
          material_total?: number | null
          period_end: string
          period_start: string
          period_type?: string
          rejection_notes?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          work_item_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          final_amount?: number | null
          id?: string
          labor_total?: number | null
          markup_percent?: number | null
          material_total?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          rejection_notes?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_periods_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_partners: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          partner_org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          partner_org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          partner_org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_partners_partner_org_id_fkey"
            columns: ["partner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_org_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_org_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_item_participants: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          invited_by: string
          organization_id: string
          work_item_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          organization_id: string
          work_item_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          organization_id?: string
          work_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_item_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_participants_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      work_items: {
        Row: {
          amount: number | null
          code: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          item_type: string
          location_ref: string | null
          organization_id: string
          parent_work_item_id: string | null
          project_id: string | null
          rejection_notes: string | null
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          code?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          item_type: string
          location_ref?: string | null
          organization_id: string
          parent_work_item_id?: string | null
          project_id?: string | null
          rejection_notes?: string | null
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          code?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          item_type?: string
          location_ref?: string | null
          organization_id?: string
          parent_work_item_id?: string | null
          project_id?: string | null
          rejection_notes?: string | null
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_parent_work_item_id_fkey"
            columns: ["parent_work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cost_rollups_gc: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          final_amount: number | null
          id: string | null
          notes: string | null
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          final_amount?: number | null
          id?: string | null
          notes?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          final_amount?: number | null
          id?: string | null
          notes?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_rollups_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_entries_fs: {
        Row: {
          created_at: string | null
          description: string | null
          entered_by: string | null
          entry_date: string | null
          hours: number | null
          id: string | null
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entered_by?: string | null
          entry_date?: string | null
          hours?: number | null
          id?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entered_by?: string | null
          entry_date?: string | null
          hours?: number | null
          id?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_entries_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes_public: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          notes: string | null
          quantity: number | null
          supplier_id: string | null
          unit_cost: number | null
          uom: string | null
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          quantity?: number | null
          supplier_id?: string | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          notes?: string | null
          quantity?: number | null
          supplier_id?: string | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_labor_entries_fs: {
        Row: {
          created_at: string | null
          description: string | null
          entered_by: string | null
          entry_date: string | null
          hours: number | null
          id: string | null
          period_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entered_by?: string | null
          entry_date?: string | null
          hours?: number | null
          id?: string | null
          period_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entered_by?: string | null
          entry_date?: string | null
          hours?: number | null
          id?: string | null
          period_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tm_labor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_labor_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods_gc"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_material_entries_fs: {
        Row: {
          created_at: string | null
          description: string | null
          entry_date: string | null
          id: string | null
          notes: string | null
          period_id: string | null
          quantity: number | null
          supplier_id: string | null
          uom: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entry_date?: string | null
          id?: string | null
          notes?: string | null
          period_id?: string | null
          quantity?: number | null
          supplier_id?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entry_date?: string | null
          id?: string | null
          notes?: string | null
          period_id?: string | null
          quantity?: number | null
          supplier_id?: string | null
          uom?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tm_material_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_material_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "tm_periods_gc"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tm_material_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_periods_gc: {
        Row: {
          approved_at: string | null
          created_at: string | null
          final_amount: number | null
          id: string | null
          period_end: string | null
          period_start: string | null
          period_type: string | null
          rejection_notes: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          work_item_id: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          final_amount?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          rejection_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          final_amount?: number | null
          id?: string | null
          period_end?: string | null
          period_start?: string | null
          period_type?: string | null
          rejection_notes?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tm_periods_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_project_invite: {
        Args: { _project_id: string }
        Returns: undefined
      }
      approve_tm_period: { Args: { period_id: string }; Returns: string }
      can_see_financials: { Args: { _user_id: string }; Returns: boolean }
      can_see_margins: { Args: { _user_id: string }; Returns: boolean }
      decline_project_invite: {
        Args: { _project_id: string }
        Returns: undefined
      }
      execute_change_work: {
        Args: { change_work_id: string }
        Returns: undefined
      }
      generate_change_work_code: { Args: { org_id: string }; Returns: string }
      generate_po_number: { Args: { org_id: string }; Returns: string }
      get_my_notifications: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          action_url: string
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }[]
      }
      get_unread_count: { Args: never; Returns: number }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gc_pm: { Args: { _user_id: string }; Returns: boolean }
      is_pm_role: { Args: { _user_id: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      reject_tm_period: {
        Args: { notes: string; period_id: string }
        Returns: undefined
      }
      search_catalog: {
        Args: {
          category_filter?: string
          search_query: string
          supplier_filter?: string
        }
        Returns: {
          category: Database["public"]["Enums"]["catalog_category"]
          description: string
          id: string
          rank: number
          search_keywords: string[]
          size_or_spec: string
          supplier_id: string
          supplier_sku: string
          uom_default: string
        }[]
      }
      submit_tm_period: { Args: { period_id: string }; Returns: undefined }
      user_has_read_notification: {
        Args: { _notification_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_work_item_participant: {
        Args: { _user_id: string; _work_item_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "GC_PM" | "TC_PM" | "FS" | "SUPPLIER"
      catalog_category:
        | "Dimensional"
        | "Engineered"
        | "Sheathing"
        | "Hardware"
        | "Fasteners"
        | "Other"
      estimate_status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
      notification_type:
        | "PROJECT_INVITE"
        | "WORK_ITEM_INVITE"
        | "PO_SENT"
        | "CHANGE_SUBMITTED"
        | "CHANGE_APPROVED"
        | "CHANGE_REJECTED"
      order_status:
        | "DRAFT"
        | "SUBMITTED"
        | "APPROVED"
        | "FULFILLED"
        | "CANCELLED"
      org_type: "GC" | "TC" | "SUPPLIER"
      pack_type: "LOOSE_MODIFIABLE" | "ENGINEERED_LOCKED"
      po_status: "DRAFT" | "SENT"
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
      app_role: ["GC_PM", "TC_PM", "FS", "SUPPLIER"],
      catalog_category: [
        "Dimensional",
        "Engineered",
        "Sheathing",
        "Hardware",
        "Fasteners",
        "Other",
      ],
      estimate_status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      notification_type: [
        "PROJECT_INVITE",
        "WORK_ITEM_INVITE",
        "PO_SENT",
        "CHANGE_SUBMITTED",
        "CHANGE_APPROVED",
        "CHANGE_REJECTED",
      ],
      order_status: [
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "FULFILLED",
        "CANCELLED",
      ],
      org_type: ["GC", "TC", "SUPPLIER"],
      pack_type: ["LOOSE_MODIFIABLE", "ENGINEERED_LOCKED"],
      po_status: ["DRAFT", "SENT"],
    },
  },
} as const
