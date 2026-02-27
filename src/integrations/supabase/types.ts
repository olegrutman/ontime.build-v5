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
          attributes: Json | null
          bundle_qty: number | null
          bundle_type: string | null
          category: Database["public"]["Enums"]["catalog_category"]
          color: string | null
          created_at: string
          depth: string | null
          description: string
          diameter: string | null
          dimension: string | null
          edge_type: string | null
          finish: string | null
          id: string
          length: string | null
          length_increment: number | null
          length_unit: string | null
          manufacturer: string | null
          max_length: number | null
          min_length: number | null
          name: string | null
          product_type: string | null
          search_keywords: string[] | null
          search_vector: unknown
          secondary_category: string | null
          size_or_spec: string | null
          supplier_id: string
          supplier_sku: string
          thickness: string | null
          uom_default: string
          updated_at: string
          use_type: string | null
          width: string | null
          wood_species: string | null
        }
        Insert: {
          attributes?: Json | null
          bundle_qty?: number | null
          bundle_type?: string | null
          category?: Database["public"]["Enums"]["catalog_category"]
          color?: string | null
          created_at?: string
          depth?: string | null
          description: string
          diameter?: string | null
          dimension?: string | null
          edge_type?: string | null
          finish?: string | null
          id?: string
          length?: string | null
          length_increment?: number | null
          length_unit?: string | null
          manufacturer?: string | null
          max_length?: number | null
          min_length?: number | null
          name?: string | null
          product_type?: string | null
          search_keywords?: string[] | null
          search_vector?: unknown
          secondary_category?: string | null
          size_or_spec?: string | null
          supplier_id: string
          supplier_sku: string
          thickness?: string | null
          uom_default?: string
          updated_at?: string
          use_type?: string | null
          width?: string | null
          wood_species?: string | null
        }
        Update: {
          attributes?: Json | null
          bundle_qty?: number | null
          bundle_type?: string | null
          category?: Database["public"]["Enums"]["catalog_category"]
          color?: string | null
          created_at?: string
          depth?: string | null
          description?: string
          diameter?: string | null
          dimension?: string | null
          edge_type?: string | null
          finish?: string | null
          id?: string
          length?: string | null
          length_increment?: number | null
          length_unit?: string | null
          manufacturer?: string | null
          max_length?: number | null
          min_length?: number | null
          name?: string | null
          product_type?: string | null
          search_keywords?: string[] | null
          search_vector?: unknown
          secondary_category?: string | null
          size_or_spec?: string | null
          supplier_id?: string
          supplier_sku?: string
          thickness?: string | null
          uom_default?: string
          updated_at?: string
          use_type?: string | null
          width?: string | null
          wood_species?: string | null
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
      change_order_checklist: {
        Row: {
          change_order_id: string
          equipment_priced: boolean | null
          fc_hours_locked: boolean | null
          id: string
          location_complete: boolean | null
          materials_priced: boolean | null
          scope_complete: boolean | null
          tc_pricing_complete: boolean | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          equipment_priced?: boolean | null
          fc_hours_locked?: boolean | null
          id?: string
          location_complete?: boolean | null
          materials_priced?: boolean | null
          scope_complete?: boolean | null
          tc_pricing_complete?: boolean | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          equipment_priced?: boolean | null
          fc_hours_locked?: boolean | null
          id?: string
          location_complete?: boolean | null
          materials_priced?: boolean | null
          scope_complete?: boolean | null
          tc_pricing_complete?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_checklist_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: true
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_equipment: {
        Row: {
          change_order_id: string
          created_at: string
          daily_rate: number | null
          days: number | null
          description: string
          flat_cost: number | null
          id: string
          notes: string | null
          pricing_type: string | null
          sort_order: number | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          daily_rate?: number | null
          days?: number | null
          description: string
          flat_cost?: number | null
          id?: string
          notes?: string | null
          pricing_type?: string | null
          sort_order?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          daily_rate?: number | null
          days?: number | null
          description?: string
          flat_cost?: number | null
          id?: string
          notes?: string | null
          pricing_type?: string | null
          sort_order?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_equipment_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_fc_hours: {
        Row: {
          change_order_id: string
          created_at: string
          description: string | null
          entered_by: string | null
          hourly_rate: number | null
          hours: number
          id: string
          is_locked: boolean | null
          labor_total: number | null
          locked_at: string | null
          locked_by: string | null
          lump_sum: number | null
          pricing_type: string | null
          unlock_requested: boolean | null
          unlock_requested_at: string | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          description?: string | null
          entered_by?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          is_locked?: boolean | null
          labor_total?: number | null
          locked_at?: string | null
          locked_by?: string | null
          lump_sum?: number | null
          pricing_type?: string | null
          unlock_requested?: boolean | null
          unlock_requested_at?: string | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          description?: string | null
          entered_by?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          is_locked?: boolean | null
          labor_total?: number | null
          locked_at?: string | null
          locked_by?: string | null
          lump_sum?: number | null
          pricing_type?: string | null
          unlock_requested?: boolean | null
          unlock_requested_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_fc_hours_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_materials: {
        Row: {
          change_order_id: string
          created_at: string
          description: string
          final_price: number | null
          id: string
          line_total: number | null
          markup_percent: number | null
          notes: string | null
          quantity: number
          sent_to_supplier: boolean | null
          sort_order: number | null
          supplier_id: string | null
          supplier_locked: boolean | null
          supplier_locked_at: string | null
          supplier_price: number | null
          supplier_priced: boolean | null
          unit_cost: number | null
          uom: string | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          description: string
          final_price?: number | null
          id?: string
          line_total?: number | null
          markup_percent?: number | null
          notes?: string | null
          quantity?: number
          sent_to_supplier?: boolean | null
          sort_order?: number | null
          supplier_id?: string | null
          supplier_locked?: boolean | null
          supplier_locked_at?: string | null
          supplier_price?: number | null
          supplier_priced?: boolean | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          description?: string
          final_price?: number | null
          id?: string
          line_total?: number | null
          markup_percent?: number | null
          notes?: string | null
          quantity?: number
          sent_to_supplier?: boolean | null
          sort_order?: number | null
          supplier_id?: string | null
          supplier_locked?: boolean | null
          supplier_locked_at?: string | null
          supplier_price?: number | null
          supplier_priced?: boolean | null
          unit_cost?: number | null
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_materials_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_participants: {
        Row: {
          accepted_at: string | null
          change_order_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          organization_id: string
          role: string
        }
        Insert: {
          accepted_at?: string | null
          change_order_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          organization_id: string
          role: string
        }
        Update: {
          accepted_at?: string | null
          change_order_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_participants_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_projects: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_role: string | null
          description: string | null
          equipment_cost_responsibility: string | null
          equipment_total: number | null
          fc_hourly_rate: number | null
          final_price: number | null
          fixing_trade_notes: string | null
          id: string
          labor_total: number | null
          linked_po_id: string | null
          location_data: Json | null
          material_cost_responsibility: string | null
          material_markup_amount: number | null
          material_markup_percent: number | null
          material_markup_type: string | null
          material_total: number | null
          materials_locked_at: string | null
          materials_pricing_locked: boolean | null
          pricing_mode: string
          project_id: string
          reason: string | null
          rejection_notes: string | null
          requires_equipment: boolean | null
          requires_materials: boolean | null
          status: string
          tc_hourly_rate: number | null
          title: string
          updated_at: string
          work_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          description?: string | null
          equipment_cost_responsibility?: string | null
          equipment_total?: number | null
          fc_hourly_rate?: number | null
          final_price?: number | null
          fixing_trade_notes?: string | null
          id?: string
          labor_total?: number | null
          linked_po_id?: string | null
          location_data?: Json | null
          material_cost_responsibility?: string | null
          material_markup_amount?: number | null
          material_markup_percent?: number | null
          material_markup_type?: string | null
          material_total?: number | null
          materials_locked_at?: string | null
          materials_pricing_locked?: boolean | null
          pricing_mode?: string
          project_id: string
          reason?: string | null
          rejection_notes?: string | null
          requires_equipment?: boolean | null
          requires_materials?: boolean | null
          status?: string
          tc_hourly_rate?: number | null
          title: string
          updated_at?: string
          work_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_role?: string | null
          description?: string | null
          equipment_cost_responsibility?: string | null
          equipment_total?: number | null
          fc_hourly_rate?: number | null
          final_price?: number | null
          fixing_trade_notes?: string | null
          id?: string
          labor_total?: number | null
          linked_po_id?: string | null
          location_data?: Json | null
          material_cost_responsibility?: string | null
          material_markup_amount?: number | null
          material_markup_percent?: number | null
          material_markup_type?: string | null
          material_total?: number | null
          materials_locked_at?: string | null
          materials_pricing_locked?: boolean | null
          pricing_mode?: string
          project_id?: string
          reason?: string | null
          rejection_notes?: string | null
          requires_equipment?: boolean | null
          requires_materials?: boolean | null
          status?: string
          tc_hourly_rate?: number | null
          title?: string
          updated_at?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_projects_linked_po_id_fkey"
            columns: ["linked_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_tc_labor: {
        Row: {
          change_order_id: string
          created_at: string
          description: string | null
          entered_by: string | null
          hourly_rate: number | null
          hours: number
          id: string
          labor_total: number | null
          lump_sum: number | null
          pricing_type: string | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          description?: string | null
          entered_by?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          labor_total?: number | null
          lump_sum?: number | null
          pricing_type?: string | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          description?: string | null
          entered_by?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          labor_total?: number | null
          lump_sum?: number | null
          pricing_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_tc_labor_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
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
      estimate_catalog_mapping: {
        Row: {
          catalog_item_id: string
          created_at: string
          estimate_id: string
          id: string
          line_item_id: string
          project_id: string
        }
        Insert: {
          catalog_item_id: string
          created_at?: string
          estimate_id: string
          id?: string
          line_item_id: string
          project_id: string
        }
        Update: {
          catalog_item_id?: string
          created_at?: string
          estimate_id?: string
          id?: string
          line_item_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_catalog_mapping_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_catalog_mapping_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_catalog_mapping_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "estimate_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_catalog_mapping_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string
          estimate_id: string
          id: string
          pack_name: string
          quantity: number | null
          raw_text_line: string | null
          sort_order: number
          status: string
          uom: string | null
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          pack_name?: string
          quantity?: number | null
          raw_text_line?: string | null
          sort_order?: number
          status?: string
          uom?: string | null
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          pack_name?: string
          quantity?: number | null
          raw_text_line?: string | null
          sort_order?: number
          status?: string
          uom?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimates"
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
      estimate_pdf_uploads: {
        Row: {
          estimate_id: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          estimate_id: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          estimate_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_pdf_uploads_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          billed_percent: number | null
          created_at: string
          current_billed: number
          description: string
          id: string
          invoice_id: string
          previous_billed: number
          retainage_amount: number
          retainage_percent: number
          scheduled_value: number
          sort_order: number
          sov_item_id: string | null
          total_billed: number
          work_item_id: string | null
        }
        Insert: {
          billed_percent?: number | null
          created_at?: string
          current_billed?: number
          description: string
          id?: string
          invoice_id: string
          previous_billed?: number
          retainage_amount?: number
          retainage_percent?: number
          scheduled_value?: number
          sort_order?: number
          sov_item_id?: string | null
          total_billed?: number
          work_item_id?: string | null
        }
        Update: {
          billed_percent?: number | null
          created_at?: string
          current_billed?: number
          description?: string
          id?: string
          invoice_id?: string
          previous_billed?: number
          retainage_amount?: number
          retainage_percent?: number
          scheduled_value?: number
          sort_order?: number
          sov_item_id?: string | null
          total_billed?: number
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_sov_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_work_item_id_fkey"
            columns: ["work_item_id"]
            isOneToOne: false
            referencedRelation: "work_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_period_end: string
          billing_period_start: string
          contract_id: string | null
          created_at: string
          created_by: string
          id: string
          invoice_number: string
          notes: string | null
          paid_at: string | null
          po_id: string | null
          project_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          retainage_amount: number
          revision_count: number
          sov_id: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period_end: string
          billing_period_start: string
          contract_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          invoice_number: string
          notes?: string | null
          paid_at?: string | null
          po_id?: string | null
          project_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          retainage_amount?: number
          revision_count?: number
          sov_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_period_end?: string
          billing_period_start?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          invoice_number?: string
          notes?: string | null
          paid_at?: string | null
          po_id?: string | null
          project_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          retainage_amount?: number
          revision_count?: number
          sov_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "project_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "project_sov"
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
      member_permissions: {
        Row: {
          can_approve_invoices: boolean
          can_create_pos: boolean
          can_create_rfis: boolean
          can_create_work_orders: boolean
          can_manage_team: boolean
          can_submit_time: boolean
          can_view_financials: boolean
          id: string
          updated_at: string
          user_org_role_id: string
        }
        Insert: {
          can_approve_invoices?: boolean
          can_create_pos?: boolean
          can_create_rfis?: boolean
          can_create_work_orders?: boolean
          can_manage_team?: boolean
          can_submit_time?: boolean
          can_view_financials?: boolean
          id?: string
          updated_at?: string
          user_org_role_id: string
        }
        Update: {
          can_approve_invoices?: boolean
          can_create_pos?: boolean
          can_create_rfis?: boolean
          can_create_work_orders?: boolean
          can_manage_team?: boolean
          can_submit_time?: boolean
          can_view_financials?: boolean
          id?: string
          updated_at?: string
          user_org_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_user_org_role_id_fkey"
            columns: ["user_org_role_id"]
            isOneToOne: true
            referencedRelation: "user_org_roles"
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
      org_join_requests: {
        Row: {
          created_at: string
          id: string
          job_title: string | null
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_title?: string | null
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_title?: string | null
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_join_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          created_at: string
          default_crew_size: number | null
          default_hourly_rate: number | null
          default_workday_hours: number | null
          id: string
          labor_markup_percent: number | null
          minimum_service_charge: number | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_crew_size?: number | null
          default_hourly_rate?: number | null
          default_workday_hours?: number | null
          id?: string
          labor_markup_percent?: number | null
          minimum_service_charge?: number | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_crew_size?: number | null
          default_hourly_rate?: number | null
          default_workday_hours?: number | null
          id?: string
          labor_markup_percent?: number | null
          minimum_service_charge?: number | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          allow_join_requests: boolean
          created_at: string
          created_by: string | null
          id: string
          insurance_expiration_date: string | null
          license_number: string | null
          name: string
          org_code: string
          phone: string | null
          trade: string | null
          trade_custom: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          address?: Json | null
          allow_join_requests?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_expiration_date?: string | null
          license_number?: string | null
          name: string
          org_code: string
          phone?: string | null
          trade?: string | null
          trade_custom?: string | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          address?: Json | null
          allow_join_requests?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_expiration_date?: string | null
          license_number?: string | null
          name?: string
          org_code?: string
          phone?: string | null
          trade?: string | null
          trade_custom?: string | null
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
          lead_time_days: number | null
          length_ft: number | null
          line_number: number
          line_total: number | null
          notes: string | null
          pieces: number | null
          po_id: string
          quantity: number
          supplier_notes: string | null
          supplier_sku: string | null
          unit_price: number | null
          uom: string
        }
        Insert: {
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description: string
          id?: string
          lead_time_days?: number | null
          length_ft?: number | null
          line_number: number
          line_total?: number | null
          notes?: string | null
          pieces?: number | null
          po_id: string
          quantity: number
          supplier_notes?: string | null
          supplier_sku?: string | null
          unit_price?: number | null
          uom?: string
        }
        Update: {
          computed_bf?: number | null
          computed_lf?: number | null
          created_at?: string
          description?: string
          id?: string
          lead_time_days?: number | null
          length_ft?: number | null
          line_number?: number
          line_total?: number | null
          notes?: string | null
          pieces?: number | null
          po_id?: string
          quantity?: number
          supplier_notes?: string | null
          supplier_sku?: string | null
          unit_price?: number | null
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
          first_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          language: string | null
          last_name: string | null
          phone: string | null
          preferred_contact_method: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          view_preference: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          view_preference?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          view_preference?: string | null
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          activity_type: string
          actor_company: string | null
          actor_name: string | null
          actor_user_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          activity_type: string
          actor_company?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          activity_type?: string
          actor_company?: string | null
          actor_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contracts: {
        Row: {
          allow_mobilization_line_item: boolean | null
          contract_sum: number | null
          created_at: string
          created_by_user_id: string | null
          from_org_id: string | null
          from_role: string
          id: string
          material_estimate_total: number | null
          material_responsibility: string | null
          notes: string | null
          project_id: string
          retainage_percent: number | null
          status: string | null
          to_org_id: string | null
          to_project_team_id: string | null
          to_role: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          allow_mobilization_line_item?: boolean | null
          contract_sum?: number | null
          created_at?: string
          created_by_user_id?: string | null
          from_org_id?: string | null
          from_role: string
          id?: string
          material_estimate_total?: number | null
          material_responsibility?: string | null
          notes?: string | null
          project_id: string
          retainage_percent?: number | null
          status?: string | null
          to_org_id?: string | null
          to_project_team_id?: string | null
          to_role: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          allow_mobilization_line_item?: boolean | null
          contract_sum?: number | null
          created_at?: string
          created_by_user_id?: string | null
          from_org_id?: string | null
          from_role?: string
          id?: string
          material_estimate_total?: number | null
          material_responsibility?: string | null
          notes?: string | null
          project_id?: string
          retainage_percent?: number | null
          status?: string | null
          to_org_id?: string | null
          to_project_team_id?: string | null
          to_role?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_contracts_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_to_project_team_id_fkey"
            columns: ["to_project_team_id"]
            isOneToOne: false
            referencedRelation: "project_team"
            referencedColumns: ["id"]
          },
        ]
      }
      project_designated_suppliers: {
        Row: {
          created_at: string
          designated_by: string
          id: string
          invited_email: string | null
          invited_name: string | null
          project_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          designated_by: string
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          project_id: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          designated_by?: string
          id?: string
          invited_email?: string | null
          invited_name?: string | null
          project_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_designated_suppliers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      project_guests: {
        Row: {
          accepted_at: string | null
          access_level: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          project_id: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          project_id: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_guests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          id: string
          invited_by_user_id: string | null
          invited_email: string
          invited_name: string | null
          invited_org_name: string | null
          project_id: string
          project_team_id: string | null
          role: string
          status: string
          token: string
          trade: string | null
          trade_custom: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          invited_email: string
          invited_name?: string | null
          invited_org_name?: string | null
          project_id: string
          project_team_id?: string | null
          role: string
          status?: string
          token?: string
          trade?: string | null
          trade_custom?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string | null
          invited_email?: string
          invited_name?: string | null
          invited_org_name?: string | null
          project_id?: string
          project_team_id?: string | null
          role?: string
          status?: string
          token?: string
          trade?: string | null
          trade_custom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_team_id_fkey"
            columns: ["project_team_id"]
            isOneToOne: false
            referencedRelation: "project_team"
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
          material_responsibility: string | null
          no_estimate_confirmed: boolean | null
          organization_id: string
          po_requires_approval: boolean | null
          project_id: string
          role: Database["public"]["Enums"]["org_type"] | null
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invite_status?: string
          invited_at?: string
          invited_by: string
          material_responsibility?: string | null
          no_estimate_confirmed?: boolean | null
          organization_id: string
          po_requires_approval?: boolean | null
          project_id: string
          role?: Database["public"]["Enums"]["org_type"] | null
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invite_status?: string
          invited_at?: string
          invited_by?: string
          material_responsibility?: string | null
          no_estimate_confirmed?: boolean | null
          organization_id?: string
          po_requires_approval?: boolean | null
          project_id?: string
          role?: Database["public"]["Enums"]["org_type"] | null
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
      project_relationships: {
        Row: {
          billing_direction: string
          created_at: string
          downstream_participant_id: string
          id: string
          material_responsibility: string | null
          po_requires_upstream_approval: boolean
          project_id: string
          relationship_type: string
          upstream_participant_id: string
        }
        Insert: {
          billing_direction?: string
          created_at?: string
          downstream_participant_id: string
          id?: string
          material_responsibility?: string | null
          po_requires_upstream_approval?: boolean
          project_id: string
          relationship_type: string
          upstream_participant_id: string
        }
        Update: {
          billing_direction?: string
          created_at?: string
          downstream_participant_id?: string
          id?: string
          material_responsibility?: string | null
          po_requires_upstream_approval?: boolean
          project_id?: string
          relationship_type?: string
          upstream_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_relationships_downstream_participant_id_fkey"
            columns: ["downstream_participant_id"]
            isOneToOne: false
            referencedRelation: "project_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_relationships_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_relationships_upstream_participant_id_fkey"
            columns: ["upstream_participant_id"]
            isOneToOne: false
            referencedRelation: "project_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_rfis: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by_user_id: string | null
          assigned_to_org_id: string
          created_at: string
          due_date: string | null
          id: string
          location_data: Json | null
          priority: string
          project_id: string
          question: string
          reference_area: string | null
          rfi_number: number
          status: string
          subject: string
          submitted_by_org_id: string
          submitted_by_user_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by_user_id?: string | null
          assigned_to_org_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          location_data?: Json | null
          priority?: string
          project_id: string
          question: string
          reference_area?: string | null
          rfi_number?: number
          status?: string
          subject: string
          submitted_by_org_id: string
          submitted_by_user_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by_user_id?: string | null
          assigned_to_org_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          location_data?: Json | null
          priority?: string
          project_id?: string
          question?: string
          reference_area?: string | null
          rfi_number?: number
          status?: string
          subject?: string
          submitted_by_org_id?: string
          submitted_by_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_rfis_assigned_to_org_id_fkey"
            columns: ["assigned_to_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_rfis_submitted_by_org_id_fkey"
            columns: ["submitted_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scope_details: {
        Row: {
          balcony_type: string | null
          basement_finish: string | null
          basement_type: string | null
          bathrooms: number | null
          bedrooms: number | null
          construction_type: string | null
          construction_type_other: string | null
          created_at: string
          decking_included: boolean | null
          decking_type: string | null
          decking_type_other: string | null
          decorative_included: boolean | null
          decorative_item_other: string | null
          decorative_items: Json | null
          ext_doors_included: boolean | null
          fascia_included: boolean | null
          fascia_soffit_material: string | null
          fascia_soffit_material_other: string | null
          floors: number | null
          foundation_type: string | null
          framing_method: string | null
          garage_cars: number | null
          garage_type: string | null
          has_balconies: boolean | null
          has_covered_porches: boolean | null
          has_elevator: boolean | null
          has_roof_deck: boolean | null
          has_shared_walls: boolean | null
          home_type: string | null
          id: string
          lot_size_acres: number | null
          num_buildings: number | null
          num_units: number | null
          project_id: string
          roof_deck_type: string | null
          roof_type: string | null
          scope_description: string | null
          shaft_type: string | null
          shaft_type_notes: string | null
          siding_included: boolean | null
          siding_material_other: string | null
          siding_materials: Json | null
          soffit_included: boolean | null
          stairs_type: string | null
          stories: number | null
          stories_per_unit: number | null
          total_sqft: number | null
          updated_at: string
          windows_included: boolean | null
          wrb_included: boolean | null
        }
        Insert: {
          balcony_type?: string | null
          basement_finish?: string | null
          basement_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          construction_type?: string | null
          construction_type_other?: string | null
          created_at?: string
          decking_included?: boolean | null
          decking_type?: string | null
          decking_type_other?: string | null
          decorative_included?: boolean | null
          decorative_item_other?: string | null
          decorative_items?: Json | null
          ext_doors_included?: boolean | null
          fascia_included?: boolean | null
          fascia_soffit_material?: string | null
          fascia_soffit_material_other?: string | null
          floors?: number | null
          foundation_type?: string | null
          framing_method?: string | null
          garage_cars?: number | null
          garage_type?: string | null
          has_balconies?: boolean | null
          has_covered_porches?: boolean | null
          has_elevator?: boolean | null
          has_roof_deck?: boolean | null
          has_shared_walls?: boolean | null
          home_type?: string | null
          id?: string
          lot_size_acres?: number | null
          num_buildings?: number | null
          num_units?: number | null
          project_id: string
          roof_deck_type?: string | null
          roof_type?: string | null
          scope_description?: string | null
          shaft_type?: string | null
          shaft_type_notes?: string | null
          siding_included?: boolean | null
          siding_material_other?: string | null
          siding_materials?: Json | null
          soffit_included?: boolean | null
          stairs_type?: string | null
          stories?: number | null
          stories_per_unit?: number | null
          total_sqft?: number | null
          updated_at?: string
          windows_included?: boolean | null
          wrb_included?: boolean | null
        }
        Update: {
          balcony_type?: string | null
          basement_finish?: string | null
          basement_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          construction_type?: string | null
          construction_type_other?: string | null
          created_at?: string
          decking_included?: boolean | null
          decking_type?: string | null
          decking_type_other?: string | null
          decorative_included?: boolean | null
          decorative_item_other?: string | null
          decorative_items?: Json | null
          ext_doors_included?: boolean | null
          fascia_included?: boolean | null
          fascia_soffit_material?: string | null
          fascia_soffit_material_other?: string | null
          floors?: number | null
          foundation_type?: string | null
          framing_method?: string | null
          garage_cars?: number | null
          garage_type?: string | null
          has_balconies?: boolean | null
          has_covered_porches?: boolean | null
          has_elevator?: boolean | null
          has_roof_deck?: boolean | null
          has_shared_walls?: boolean | null
          home_type?: string | null
          id?: string
          lot_size_acres?: number | null
          num_buildings?: number | null
          num_units?: number | null
          project_id?: string
          roof_deck_type?: string | null
          roof_type?: string | null
          scope_description?: string | null
          shaft_type?: string | null
          shaft_type_notes?: string | null
          siding_included?: boolean | null
          siding_material_other?: string | null
          siding_materials?: Json | null
          soffit_included?: boolean | null
          stairs_type?: string | null
          stories?: number | null
          stories_per_unit?: number | null
          total_sqft?: number | null
          updated_at?: string
          windows_included?: boolean | null
          wrb_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_scope_details_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sov: {
        Row: {
          contract_id: string | null
          created_at: string
          created_from_template_key: string | null
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          project_id: string
          sov_name: string | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_from_template_key?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          project_id: string
          sov_name?: string | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_from_template_key?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          project_id?: string
          sov_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sov_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "project_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sov_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sov_items: {
        Row: {
          billed_to_date: number | null
          created_at: string
          default_enabled: boolean
          id: string
          item_group: string | null
          item_name: string
          percent_of_contract: number | null
          project_id: string
          scheduled_value: number | null
          sort_order: number
          source: string
          sov_id: string | null
          total_billed_amount: number | null
          total_completion_percent: number | null
          value_amount: number | null
        }
        Insert: {
          billed_to_date?: number | null
          created_at?: string
          default_enabled?: boolean
          id?: string
          item_group?: string | null
          item_name: string
          percent_of_contract?: number | null
          project_id: string
          scheduled_value?: number | null
          sort_order?: number
          source?: string
          sov_id?: string | null
          total_billed_amount?: number | null
          total_completion_percent?: number | null
          value_amount?: number | null
        }
        Update: {
          billed_to_date?: number | null
          created_at?: string
          default_enabled?: boolean
          id?: string
          item_group?: string | null
          item_name?: string
          percent_of_contract?: number | null
          project_id?: string
          scheduled_value?: number | null
          sort_order?: number
          source?: string
          sov_id?: string | null
          total_billed_amount?: number | null
          total_completion_percent?: number | null
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sov_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sov_items_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "project_sov"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team: {
        Row: {
          accepted_at: string | null
          access_level: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by_user_id: string | null
          invited_email: string | null
          invited_name: string | null
          invited_org_name: string | null
          org_id: string | null
          project_id: string
          role: string
          status: string
          trade: string | null
          trade_custom: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by_user_id?: string | null
          invited_email?: string | null
          invited_name?: string | null
          invited_org_name?: string | null
          org_id?: string | null
          project_id: string
          role: string
          status?: string
          trade?: string | null
          trade_custom?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_level?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by_user_id?: string | null
          invited_email?: string | null
          invited_name?: string | null
          invited_org_name?: string | null
          org_id?: string | null
          project_id?: string
          role?: string
          status?: string
          trade?: string | null
          trade_custom?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_project_id_fkey"
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
          city: string | null
          created_at: string
          created_by: string | null
          created_by_org_id: string | null
          description: string | null
          id: string
          mobilization_enabled: boolean | null
          name: string
          organization_id: string
          parties: Json | null
          project_type: string | null
          retainage_percent: number | null
          scope: Json | null
          start_date: string | null
          state: string | null
          status: string
          structures: Json | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: Json | null
          build_type?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_org_id?: string | null
          description?: string | null
          id?: string
          mobilization_enabled?: boolean | null
          name: string
          organization_id: string
          parties?: Json | null
          project_type?: string | null
          retainage_percent?: number | null
          scope?: Json | null
          start_date?: string | null
          state?: string | null
          status?: string
          structures?: Json | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: Json | null
          build_type?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_org_id?: string | null
          description?: string | null
          id?: string
          mobilization_enabled?: boolean | null
          name?: string
          organization_id?: string
          parties?: Json | null
          project_type?: string | null
          retainage_percent?: number | null
          scope?: Json | null
          start_date?: string | null
          state?: string | null
          status?: string
          structures?: Json | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          created_by_org_id: string | null
          delivered_at: string | null
          download_count: number | null
          download_token: string | null
          download_token_expires_at: string | null
          id: string
          material_order_id: string | null
          notes: string | null
          ordered_at: string | null
          organization_id: string
          pack_modified: boolean | null
          po_name: string
          po_number: string
          priced_at: string | null
          priced_by: string | null
          pricing_owner_org_id: string | null
          project_id: string | null
          ready_for_delivery_at: string | null
          sales_tax_percent: number | null
          sent_at: string | null
          sent_by: string | null
          source_estimate_id: string | null
          source_pack_name: string | null
          status: Database["public"]["Enums"]["po_status"]
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string
          updated_at: string
          work_item_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_org_id?: string | null
          delivered_at?: string | null
          download_count?: number | null
          download_token?: string | null
          download_token_expires_at?: string | null
          id?: string
          material_order_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          organization_id: string
          pack_modified?: boolean | null
          po_name: string
          po_number: string
          priced_at?: string | null
          priced_by?: string | null
          pricing_owner_org_id?: string | null
          project_id?: string | null
          ready_for_delivery_at?: string | null
          sales_tax_percent?: number | null
          sent_at?: string | null
          sent_by?: string | null
          source_estimate_id?: string | null
          source_pack_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id: string
          updated_at?: string
          work_item_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_org_id?: string | null
          delivered_at?: string | null
          download_count?: number | null
          download_token?: string | null
          download_token_expires_at?: string | null
          id?: string
          material_order_id?: string | null
          notes?: string | null
          ordered_at?: string | null
          organization_id?: string
          pack_modified?: boolean | null
          po_name?: string
          po_number?: string
          priced_at?: string | null
          priced_by?: string | null
          pricing_owner_org_id?: string | null
          project_id?: string | null
          ready_for_delivery_at?: string | null
          sales_tax_percent?: number | null
          sent_at?: string | null
          sent_by?: string | null
          source_estimate_id?: string | null
          source_pack_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string
          updated_at?: string
          work_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "purchase_orders_pricing_owner_org_id_fkey"
            columns: ["pricing_owner_org_id"]
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
            foreignKeyName: "purchase_orders_source_estimate_id_fkey"
            columns: ["source_estimate_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimates"
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
      reminders: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          org_id: string
          project_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          org_id: string
          project_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          org_id?: string
          project_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: string
          condition_notes: string | null
          created_at: string
          credit_line_total: number | null
          credit_unit_price: number | null
          description_snapshot: string
          id: string
          nonreturnable_reason: string | null
          po_id: string
          po_line_item_id: string
          qty_requested: number
          return_id: string
          returnable_flag: string
          uom: string
        }
        Insert: {
          condition?: string
          condition_notes?: string | null
          created_at?: string
          credit_line_total?: number | null
          credit_unit_price?: number | null
          description_snapshot: string
          id?: string
          nonreturnable_reason?: string | null
          po_id: string
          po_line_item_id: string
          qty_requested?: number
          return_id: string
          returnable_flag?: string
          uom?: string
        }
        Update: {
          condition?: string
          condition_notes?: string | null
          created_at?: string
          credit_line_total?: number | null
          credit_unit_price?: number | null
          description_snapshot?: string
          id?: string
          nonreturnable_reason?: string | null
          po_id?: string
          po_line_item_id?: string
          qty_requested?: number
          return_id?: string
          returnable_flag?: string
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_po_line_item_id_fkey"
            columns: ["po_line_item_id"]
            isOneToOne: false
            referencedRelation: "po_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          closed_at: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by_org_id: string
          created_by_user_id: string
          credit_subtotal: number | null
          id: string
          instructions: string | null
          net_credit_total: number | null
          pickup_date: string | null
          pickup_type: string | null
          pricing_owner_org_id: string | null
          project_id: string
          reason: string
          reason_notes: string | null
          restocking_total: number | null
          restocking_type: string | null
          restocking_value: number | null
          return_number: string | null
          status: string
          supplier_org_id: string
          urgency: string | null
          wrong_type: string | null
        }
        Insert: {
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by_org_id: string
          created_by_user_id: string
          credit_subtotal?: number | null
          id?: string
          instructions?: string | null
          net_credit_total?: number | null
          pickup_date?: string | null
          pickup_type?: string | null
          pricing_owner_org_id?: string | null
          project_id: string
          reason: string
          reason_notes?: string | null
          restocking_total?: number | null
          restocking_type?: string | null
          restocking_value?: number | null
          return_number?: string | null
          status?: string
          supplier_org_id: string
          urgency?: string | null
          wrong_type?: string | null
        }
        Update: {
          closed_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by_org_id?: string
          created_by_user_id?: string
          credit_subtotal?: number | null
          id?: string
          instructions?: string | null
          net_credit_total?: number | null
          pickup_date?: string | null
          pickup_type?: string | null
          pricing_owner_org_id?: string | null
          project_id?: string
          reason?: string
          reason_notes?: string | null
          restocking_total?: number | null
          restocking_type?: string | null
          restocking_value?: number | null
          return_number?: string | null
          status?: string
          supplier_org_id?: string
          urgency?: string | null
          wrong_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_pricing_owner_org_id_fkey"
            columns: ["pricing_owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_templates: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          generator_rules: Json
          id: string
          template_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          generator_rules?: Json
          id?: string
          template_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          generator_rules?: Json
          id?: string
          template_key?: string
        }
        Relationships: []
      }
      supplier_estimate_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          line_total: number | null
          notes: string | null
          pack_name: string | null
          pieces_per_unit: number | null
          quantity: number
          supplier_sku: string | null
          unit_price: number
          uom: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          line_total?: number | null
          notes?: string | null
          pack_name?: string | null
          pieces_per_unit?: number | null
          quantity?: number
          supplier_sku?: string | null
          unit_price?: number
          uom?: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          pack_name?: string | null
          pieces_per_unit?: number | null
          quantity?: number
          supplier_sku?: string | null
          unit_price?: number
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_estimate_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_estimates: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          status: string
          submitted_at: string | null
          supplier_org_id: string
          total_amount: number | null
          updated_at: string | null
          work_order_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          status?: string
          submitted_at?: string | null
          supplier_org_id: string
          total_amount?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          status?: string
          submitted_at?: string | null
          supplier_org_id?: string
          total_amount?: number | null
          updated_at?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_estimates_supplier_org_id_fkey"
            columns: ["supplier_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_estimates_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
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
          is_system: boolean
          name: string
          organization_id: string
          supplier_code: string
          updated_at: string
        }
        Insert: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          supplier_code: string
          updated_at?: string
        }
        Update: {
          contact_info?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
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
      tm_time_cards: {
        Row: {
          change_order_id: string
          created_at: string
          entry_date: string
          fc_description: string | null
          fc_entered_by: string | null
          fc_hours_per_man: number | null
          fc_man_hours: number | null
          fc_men_count: number | null
          fc_submitted_at: string | null
          gc_acknowledged: boolean
          gc_acknowledged_at: string | null
          gc_acknowledged_by: string | null
          id: string
          tc_approved: boolean
          tc_approved_at: string | null
          tc_approved_by: string | null
          tc_hourly_rate: number | null
          tc_own_hours: number | null
          tc_rejection_notes: string | null
          tc_submitted_at: string | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          entry_date: string
          fc_description?: string | null
          fc_entered_by?: string | null
          fc_hours_per_man?: number | null
          fc_man_hours?: number | null
          fc_men_count?: number | null
          fc_submitted_at?: string | null
          gc_acknowledged?: boolean
          gc_acknowledged_at?: string | null
          gc_acknowledged_by?: string | null
          id?: string
          tc_approved?: boolean
          tc_approved_at?: string | null
          tc_approved_by?: string | null
          tc_hourly_rate?: number | null
          tc_own_hours?: number | null
          tc_rejection_notes?: string | null
          tc_submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          entry_date?: string
          fc_description?: string | null
          fc_entered_by?: string | null
          fc_hours_per_man?: number | null
          fc_man_hours?: number | null
          fc_men_count?: number | null
          fc_submitted_at?: string | null
          gc_acknowledged?: boolean
          gc_acknowledged_at?: string | null
          gc_acknowledged_by?: string | null
          id?: string
          tc_approved?: boolean
          tc_approved_at?: string | null
          tc_approved_by?: string | null
          tc_hourly_rate?: number | null
          tc_own_hours?: number | null
          tc_rejection_notes?: string | null
          tc_submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_time_cards_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_order_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
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
          is_admin: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
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
          {
            foreignKeyName: "user_org_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          email_digest_frequency: string
          id: string
          notify_change_orders: boolean | null
          notify_email: boolean | null
          notify_inv_approved: boolean
          notify_inv_rejected: boolean
          notify_inv_submitted: boolean
          notify_invites: boolean | null
          notify_invoices: boolean | null
          notify_project_invite: boolean
          notify_sms: boolean | null
          notify_wo_approved: boolean
          notify_wo_assigned: boolean
          notify_wo_rejected: boolean
          onboarding_dismissed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_digest_frequency?: string
          id?: string
          notify_change_orders?: boolean | null
          notify_email?: boolean | null
          notify_inv_approved?: boolean
          notify_inv_rejected?: boolean
          notify_inv_submitted?: boolean
          notify_invites?: boolean | null
          notify_invoices?: boolean | null
          notify_project_invite?: boolean
          notify_sms?: boolean | null
          notify_wo_approved?: boolean
          notify_wo_assigned?: boolean
          notify_wo_rejected?: boolean
          onboarding_dismissed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_digest_frequency?: string
          id?: string
          notify_change_orders?: boolean | null
          notify_email?: boolean | null
          notify_inv_approved?: boolean
          notify_inv_rejected?: boolean
          notify_inv_submitted?: boolean
          notify_invites?: boolean | null
          notify_invoices?: boolean | null
          notify_project_invite?: boolean
          notify_sms?: boolean | null
          notify_wo_approved?: boolean
          notify_wo_assigned?: boolean
          notify_wo_rejected?: boolean
          onboarding_dismissed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      accept_org_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      accept_project_invite: {
        Args: { _project_id: string }
        Returns: undefined
      }
      accept_project_invite_v2: {
        Args: {
          _org_address?: Json
          _org_id?: string
          _org_name?: string
          _token: string
          _user_id: string
        }
        Returns: Json
      }
      approve_join_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      approve_tm_period: { Args: { period_id: string }; Returns: string }
      can_accept_project_invite: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_see_financials: { Args: { _user_id: string }; Returns: boolean }
      can_see_margins: { Args: { _user_id: string }; Returns: boolean }
      can_view_po_pricing: { Args: { po_id: string }; Returns: boolean }
      change_org_member_role: {
        Args: { p_member_role_id: string; p_new_role: string }
        Returns: undefined
      }
      check_org_setup_needed: { Args: never; Returns: Json }
      complete_signup: {
        Args: {
          _first_name: string
          _job_title?: string
          _last_name: string
          _org_address?: Json
          _org_name?: string
          _org_phone?: string
          _org_type?: Database["public"]["Enums"]["org_type"]
          _trade?: string
          _trade_custom?: string
          _user_phone?: string
        }
        Returns: Json
      }
      create_organization_and_set_admin:
        | {
            Args: {
              _address?: Json
              _org_name: string
              _org_phone?: string
              _org_type: Database["public"]["Enums"]["org_type"]
              _user_first_name?: string
              _user_last_name?: string
              _user_phone?: string
            }
            Returns: Json
          }
        | {
            Args: {
              _address: Json
              _org_name: string
              _org_phone: string
              _org_type: Database["public"]["Enums"]["org_type"]
              _user_first_name: string
              _user_last_name: string
              _user_phone?: string
            }
            Returns: Json
          }
      decline_org_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      decline_project_invite: {
        Args: { _project_id: string }
        Returns: undefined
      }
      execute_change_work: {
        Args: { change_work_id: string }
        Returns: undefined
      }
      finalize_tm_work_order: {
        Args: {
          p_change_order_id: string
          p_fc_hours: number
          p_fc_rate: number
          p_tc_hours: number
          p_tc_rate: number
          p_user_id: string
        }
        Returns: undefined
      }
      generate_change_work_code: { Args: { org_id: string }; Returns: string }
      generate_po_number: { Args: { org_id: string }; Returns: string }
      get_actor_info: { Args: never; Returns: Record<string, unknown> }
      get_invite_by_token_v2: { Args: { _token: string }; Returns: Json }
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
      get_project_access_level: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      get_project_relationships: {
        Args: { _project_id: string }
        Returns: {
          downstream_org_code: string
          downstream_org_name: string
          downstream_role: Database["public"]["Enums"]["org_type"]
          id: string
          material_responsibility: string
          po_requires_upstream_approval: boolean
          relationship_type: string
          upstream_org_code: string
          upstream_org_name: string
          upstream_role: Database["public"]["Enums"]["org_type"]
        }[]
      }
      get_unread_count: { Args: never; Returns: number }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_org_to_project:
        | {
            Args: { _org_code: string; _project_id: string; _role: string }
            Returns: string
          }
        | {
            Args: {
              _material_responsibility?: string
              _org_code: string
              _po_requires_approval?: boolean
              _project_id: string
              _role: string
            }
            Returns: string
          }
      invite_org_to_project_by_id: {
        Args: {
          _material_responsibility?: string
          _org_id: string
          _po_requires_approval?: boolean
          _project_id: string
          _role: string
        }
        Returns: string
      }
      is_gc_or_tc_pm: { Args: { _user_id: string }; Returns: boolean }
      is_gc_pm: { Args: { _user_id: string }; Returns: boolean }
      is_pm_role: { Args: { _user_id: string }; Returns: boolean }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: undefined
      }
      normalize_phone: { Args: { phone: string }; Returns: string }
      org_shares_project_with_user: {
        Args: { _org_id: string }
        Returns: boolean
      }
      reject_join_request: { Args: { _request_id: string }; Returns: undefined }
      reject_tm_period: {
        Args: { notes?: string; period_id: string }
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
      search_catalog_v2: {
        Args: {
          category_filter?: string
          manufacturer_filter?: string
          max_results?: number
          search_query?: string
          secondary_category_filter?: string
        }
        Returns: {
          bundle_qty: number
          bundle_type: string
          category: string
          color: string
          description: string
          dimension: string
          id: string
          length: string
          manufacturer: string
          name: string
          rank: number
          secondary_category: string
          size_or_spec: string
          supplier_sku: string
          thickness: string
          uom_default: string
          wood_species: string
        }[]
      }
      search_existing_team_targets: {
        Args: { _limit?: number; _project_id: string; _query: string }
        Returns: {
          city_state: string
          contact_email: string
          contact_name: string
          contact_user_id: string
          org_id: string
          org_name: string
          org_trade: string
          org_type: string
          result_type: string
        }[]
      }
      search_invite_targets: {
        Args: { _limit?: number; _query: string }
        Returns: {
          city_state: string
          display_name: string
          email: string
          id: string
          org_type: Database["public"]["Enums"]["org_type"]
          organization_name: string
          result_type: string
        }[]
      }
      search_organizations_for_join:
        | {
            Args: { _limit?: number; _query: string }
            Returns: {
              admin_name: string
              city: string
              id: string
              name: string
              org_type: Database["public"]["Enums"]["org_type"]
              state: string
              trade: string
            }[]
          }
        | {
            Args: {
              _limit?: number
              _query?: string
              _state?: string
              _trade?: string
            }
            Returns: {
              admin_name: string
              allow_join_requests: boolean
              org_address: Json
              org_id: string
              org_name: string
              org_trade: string
              org_type: string
            }[]
          }
      send_work_order_assignment_notification: {
        Args: {
          _change_order_id: string
          _recipient_org_id: string
          _work_order_title: string
        }
        Returns: undefined
      }
      submit_tm_period: { Args: { period_id: string }; Returns: undefined }
      transfer_admin: { Args: { _target_role_id: string }; Returns: undefined }
      update_member_permissions: {
        Args: {
          _can_approve_invoices?: boolean
          _can_create_pos?: boolean
          _can_create_work_orders?: boolean
          _can_manage_team?: boolean
          _can_submit_time?: boolean
          _can_view_financials?: boolean
          _target_role_id: string
        }
        Returns: undefined
      }
      update_sov_billing_totals: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      user_has_active_projects: { Args: { _user_id: string }; Returns: boolean }
      user_has_read_notification: {
        Args: { _notification_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_project_participant: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_is_work_item_participant: {
        Args: { _user_id: string; _work_item_id: string }
        Returns: boolean
      }
      validate_sov_percent_total: {
        Args: { p_sov_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "GC_PM" | "TC_PM" | "FS" | "SUPPLIER" | "FC_PM"
      catalog_category:
        | "Dimensional"
        | "Engineered"
        | "Sheathing"
        | "Hardware"
        | "Fasteners"
        | "Other"
        | "Decking"
        | "Exterior"
        | "Interior"
        | "Roofing"
        | "Structural"
        | "Adhesives"
        | "Insulation"
        | "Concrete"
        | "FramingLumber"
        | "Drywall"
        | "FramingAccessories"
      estimate_status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED"
      notification_type:
        | "PROJECT_INVITE"
        | "WORK_ITEM_INVITE"
        | "PO_SENT"
        | "CHANGE_SUBMITTED"
        | "CHANGE_APPROVED"
        | "CHANGE_REJECTED"
        | "PROJECT_ADDED"
        | "WORK_ORDER_ASSIGNED"
        | "INVOICE_SUBMITTED"
        | "INVOICE_APPROVED"
        | "INVOICE_REJECTED"
        | "RFI_SUBMITTED"
        | "RFI_ANSWERED"
        | "JOIN_REQUEST"
      order_status:
        | "DRAFT"
        | "SUBMITTED"
        | "APPROVED"
        | "FULFILLED"
        | "CANCELLED"
      org_type: "GC" | "TC" | "SUPPLIER" | "FC"
      pack_type: "LOOSE_MODIFIABLE" | "ENGINEERED_LOCKED"
      po_status:
        | "DRAFT"
        | "SENT"
        | "ACTIVE"
        | "SUBMITTED"
        | "PRICED"
        | "ORDERED"
        | "DELIVERED"
        | "FINALIZED"
        | "READY_FOR_DELIVERY"
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
      app_role: ["GC_PM", "TC_PM", "FS", "SUPPLIER", "FC_PM"],
      catalog_category: [
        "Dimensional",
        "Engineered",
        "Sheathing",
        "Hardware",
        "Fasteners",
        "Other",
        "Decking",
        "Exterior",
        "Interior",
        "Roofing",
        "Structural",
        "Adhesives",
        "Insulation",
        "Concrete",
        "FramingLumber",
        "Drywall",
        "FramingAccessories",
      ],
      estimate_status: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      notification_type: [
        "PROJECT_INVITE",
        "WORK_ITEM_INVITE",
        "PO_SENT",
        "CHANGE_SUBMITTED",
        "CHANGE_APPROVED",
        "CHANGE_REJECTED",
        "PROJECT_ADDED",
        "WORK_ORDER_ASSIGNED",
        "INVOICE_SUBMITTED",
        "INVOICE_APPROVED",
        "INVOICE_REJECTED",
        "RFI_SUBMITTED",
        "RFI_ANSWERED",
        "JOIN_REQUEST",
      ],
      order_status: [
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "FULFILLED",
        "CANCELLED",
      ],
      org_type: ["GC", "TC", "SUPPLIER", "FC"],
      pack_type: ["LOOSE_MODIFIABLE", "ENGINEERED_LOCKED"],
      po_status: [
        "DRAFT",
        "SENT",
        "ACTIVE",
        "SUBMITTED",
        "PRICED",
        "ORDERED",
        "DELIVERED",
        "FINALIZED",
        "READY_FOR_DELIVERY",
      ],
    },
  },
} as const
