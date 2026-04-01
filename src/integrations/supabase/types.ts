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
      actual_cost_entries: {
        Row: {
          cost_type: string
          created_at: string
          description: string
          entered_by: string
          entry_date: string
          hourly_rate: number | null
          hours_per_man: number | null
          id: string
          lump_amount: number | null
          men_count: number | null
          organization_id: string
          project_id: string | null
          total_amount: number
        }
        Insert: {
          cost_type?: string
          created_at?: string
          description?: string
          entered_by: string
          entry_date?: string
          hourly_rate?: number | null
          hours_per_man?: number | null
          id?: string
          lump_amount?: number | null
          men_count?: number | null
          organization_id: string
          project_id?: string | null
          total_amount?: number
        }
        Update: {
          cost_type?: string
          created_at?: string
          description?: string
          entered_by?: string
          entry_date?: string
          hourly_rate?: number | null
          hours_per_man?: number | null
          id?: string
          lump_amount?: number | null
          men_count?: number | null
          organization_id?: string
          project_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "actual_cost_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
      change_order_collaborators: {
        Row: {
          co_id: string
          collaborator_type: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          id: string
          invited_by_user_id: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          co_id: string
          collaborator_type?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          invited_by_user_id: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          co_id?: string
          collaborator_type?: string
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          id?: string
          invited_by_user_id?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_collaborators_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_collaborators_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "change_order_collaborators_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "change_order_collaborators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approved_at: string | null
          assigned_to_org_id: string | null
          closed_for_pricing_at: string | null
          co_number: string | null
          combined_at: string | null
          combined_co_id: string | null
          completed_at: string | null
          completion_acknowledged_at: string | null
          contracted_at: string | null
          created_at: string | null
          created_by_role: string
          created_by_user_id: string
          draft_shared_with_next: boolean
          equipment_needed: boolean
          equipment_responsible: string | null
          fc_input_needed: boolean
          fc_pricing_submitted_at: string | null
          id: string
          location_tag: string | null
          materials_needed: boolean
          materials_on_site: boolean
          materials_responsible: string | null
          nte_cap: number | null
          nte_increase_approved: boolean | null
          nte_increase_requested: number | null
          org_id: string
          parent_co_id: string | null
          pricing_type: string
          project_id: string
          reason: string | null
          reason_note: string | null
          rejected_at: string | null
          rejection_note: string | null
          shared_at: string | null
          status: string
          submitted_at: string | null
          tc_snapshot_hourly_rate: number | null
          tc_snapshot_markup_percent: number | null
          tc_submitted_price: number | null
          title: string | null
          updated_at: string | null
          use_fc_pricing_base: boolean | null
        }
        Insert: {
          approved_at?: string | null
          assigned_to_org_id?: string | null
          closed_for_pricing_at?: string | null
          co_number?: string | null
          combined_at?: string | null
          combined_co_id?: string | null
          completed_at?: string | null
          completion_acknowledged_at?: string | null
          contracted_at?: string | null
          created_at?: string | null
          created_by_role: string
          created_by_user_id: string
          draft_shared_with_next?: boolean
          equipment_needed?: boolean
          equipment_responsible?: string | null
          fc_input_needed?: boolean
          fc_pricing_submitted_at?: string | null
          id?: string
          location_tag?: string | null
          materials_needed?: boolean
          materials_on_site?: boolean
          materials_responsible?: string | null
          nte_cap?: number | null
          nte_increase_approved?: boolean | null
          nte_increase_requested?: number | null
          org_id: string
          parent_co_id?: string | null
          pricing_type?: string
          project_id: string
          reason?: string | null
          reason_note?: string | null
          rejected_at?: string | null
          rejection_note?: string | null
          shared_at?: string | null
          status?: string
          submitted_at?: string | null
          tc_snapshot_hourly_rate?: number | null
          tc_snapshot_markup_percent?: number | null
          tc_submitted_price?: number | null
          title?: string | null
          updated_at?: string | null
          use_fc_pricing_base?: boolean | null
        }
        Update: {
          approved_at?: string | null
          assigned_to_org_id?: string | null
          closed_for_pricing_at?: string | null
          co_number?: string | null
          combined_at?: string | null
          combined_co_id?: string | null
          completed_at?: string | null
          completion_acknowledged_at?: string | null
          contracted_at?: string | null
          created_at?: string | null
          created_by_role?: string
          created_by_user_id?: string
          draft_shared_with_next?: boolean
          equipment_needed?: boolean
          equipment_responsible?: string | null
          fc_input_needed?: boolean
          fc_pricing_submitted_at?: string | null
          id?: string
          location_tag?: string | null
          materials_needed?: boolean
          materials_on_site?: boolean
          materials_responsible?: string | null
          nte_cap?: number | null
          nte_increase_approved?: boolean | null
          nte_increase_requested?: number | null
          org_id?: string
          parent_co_id?: string | null
          pricing_type?: string
          project_id?: string
          reason?: string | null
          reason_note?: string | null
          rejected_at?: string | null
          rejection_note?: string | null
          shared_at?: string | null
          status?: string
          submitted_at?: string | null
          tc_snapshot_hourly_rate?: number | null
          tc_snapshot_markup_percent?: number | null
          tc_submitted_price?: number | null
          title?: string | null
          updated_at?: string | null
          use_fc_pricing_base?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_assigned_to_org_id_fkey"
            columns: ["assigned_to_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_combined_co_id_fkey"
            columns: ["combined_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_parent_co_id_fkey"
            columns: ["parent_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      co_activity: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          amount: number | null
          co_id: string
          created_at: string | null
          detail: string | null
          id: string
          project_id: string
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          amount?: number | null
          co_id: string
          created_at?: string | null
          detail?: string | null
          id?: string
          project_id: string
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          amount?: number | null
          co_id?: string
          created_at?: string | null
          detail?: string | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_activity_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "co_activity_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      co_combined_members: {
        Row: {
          added_at: string | null
          combined_co_id: string
          id: string
          member_co_id: string
        }
        Insert: {
          added_at?: string | null
          combined_co_id: string
          id?: string
          member_co_id: string
        }
        Update: {
          added_at?: string | null
          combined_co_id?: string
          id?: string
          member_co_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_combined_members_combined_co_id_fkey"
            columns: ["combined_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_combined_members_member_co_id_fkey"
            columns: ["member_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      co_equipment_items: {
        Row: {
          added_by_role: string
          billed_amount: number | null
          co_id: string
          cost: number
          created_at: string | null
          description: string
          duration_note: string | null
          id: string
          markup_amount: number | null
          markup_percent: number
          notes: string | null
          org_id: string
        }
        Insert: {
          added_by_role: string
          billed_amount?: number | null
          co_id: string
          cost?: number
          created_at?: string | null
          description: string
          duration_note?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number
          notes?: string | null
          org_id: string
        }
        Update: {
          added_by_role?: string
          billed_amount?: number | null
          co_id?: string
          cost?: number
          created_at?: string | null
          description?: string
          duration_note?: string | null
          id?: string
          markup_amount?: number | null
          markup_percent?: number
          notes?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_equipment_items_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_equipment_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      co_labor_entries: {
        Row: {
          actual_cost_note: string | null
          co_id: string
          co_line_item_id: string
          created_at: string | null
          description: string | null
          entered_by_role: string
          entry_date: string
          hourly_rate: number | null
          hours: number | null
          id: string
          is_actual_cost: boolean
          line_total: number | null
          lump_sum: number | null
          org_id: string
          pricing_mode: string
        }
        Insert: {
          actual_cost_note?: string | null
          co_id: string
          co_line_item_id: string
          created_at?: string | null
          description?: string | null
          entered_by_role: string
          entry_date?: string
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          is_actual_cost?: boolean
          line_total?: number | null
          lump_sum?: number | null
          org_id: string
          pricing_mode?: string
        }
        Update: {
          actual_cost_note?: string | null
          co_id?: string
          co_line_item_id?: string
          created_at?: string | null
          description?: string | null
          entered_by_role?: string
          entry_date?: string
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          is_actual_cost?: boolean
          line_total?: number | null
          lump_sum?: number | null
          org_id?: string
          pricing_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_labor_entries_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_labor_entries_co_line_item_id_fkey"
            columns: ["co_line_item_id"]
            isOneToOne: false
            referencedRelation: "co_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_labor_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      co_line_items: {
        Row: {
          catalog_item_id: string | null
          category_name: string | null
          co_id: string
          created_at: string | null
          created_by_role: string
          description: string | null
          division: string | null
          id: string
          item_name: string
          location_tag: string | null
          org_id: string
          qty: number | null
          reason: string | null
          sort_order: number | null
          unit: string
        }
        Insert: {
          catalog_item_id?: string | null
          category_name?: string | null
          co_id: string
          created_at?: string | null
          created_by_role: string
          description?: string | null
          division?: string | null
          id?: string
          item_name: string
          location_tag?: string | null
          org_id: string
          qty?: number | null
          reason?: string | null
          sort_order?: number | null
          unit: string
        }
        Update: {
          catalog_item_id?: string | null
          category_name?: string | null
          co_id?: string
          created_at?: string | null
          created_by_role?: string
          description?: string | null
          division?: string | null
          id?: string
          item_name?: string
          location_tag?: string | null
          org_id?: string
          qty?: number | null
          reason?: string | null
          sort_order?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "work_order_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_line_items_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_line_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      co_material_items: {
        Row: {
          added_by_role: string
          billed_amount: number | null
          co_id: string
          created_at: string | null
          description: string
          id: string
          is_on_site: boolean
          line_cost: number | null
          line_number: number
          markup_amount: number | null
          markup_percent: number
          notes: string | null
          org_id: string
          quantity: number
          supplier_sku: string | null
          unit_cost: number | null
          uom: string
        }
        Insert: {
          added_by_role: string
          billed_amount?: number | null
          co_id: string
          created_at?: string | null
          description: string
          id?: string
          is_on_site?: boolean
          line_cost?: number | null
          line_number?: number
          markup_amount?: number | null
          markup_percent?: number
          notes?: string | null
          org_id: string
          quantity?: number
          supplier_sku?: string | null
          unit_cost?: number | null
          uom?: string
        }
        Update: {
          added_by_role?: string
          billed_amount?: number | null
          co_id?: string
          created_at?: string | null
          description?: string
          id?: string
          is_on_site?: boolean
          line_cost?: number | null
          line_number?: number
          markup_amount?: number | null
          markup_percent?: number
          notes?: string | null
          org_id?: string
          quantity?: number
          supplier_sku?: string | null
          unit_cost?: number | null
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_material_items_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_material_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      co_nte_log: {
        Row: {
          approved_at: string | null
          approved_by_user_id: string | null
          co_id: string
          created_at: string | null
          current_cap_at_request: number
          id: string
          new_cap_after_approval: number | null
          rejected_at: string | null
          rejection_note: string | null
          requested_by_user_id: string
          requested_increase: number
          running_total_at_request: number
        }
        Insert: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          co_id: string
          created_at?: string | null
          current_cap_at_request: number
          id?: string
          new_cap_after_approval?: number | null
          rejected_at?: string | null
          rejection_note?: string | null
          requested_by_user_id: string
          requested_increase: number
          running_total_at_request: number
        }
        Update: {
          approved_at?: string | null
          approved_by_user_id?: string | null
          co_id?: string
          created_at?: string | null
          current_cap_at_request?: number
          id?: string
          new_cap_after_approval?: number | null
          rejected_at?: string | null
          rejection_note?: string | null
          requested_by_user_id?: string
          requested_increase?: number
          running_total_at_request?: number
        }
        Relationships: [
          {
            foreignKeyName: "co_nte_log_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "co_nte_log_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_nte_log_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contract_scope_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      contract_scope_details: {
        Row: {
          created_at: string
          detail_key: string
          detail_value: string
          id: string
          selection_id: string
        }
        Insert: {
          created_at?: string
          detail_key: string
          detail_value: string
          id?: string
          selection_id: string
        }
        Update: {
          created_at?: string
          detail_key?: string
          detail_value?: string
          id?: string
          selection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_scope_details_selection_id_fkey"
            columns: ["selection_id"]
            isOneToOne: false
            referencedRelation: "contract_scope_selections"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_scope_exclusions: {
        Row: {
          contract_id: string
          created_at: string
          exclusion_label: string
          id: string
          is_custom: boolean
          project_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          exclusion_label: string
          id?: string
          is_custom?: boolean
          project_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          exclusion_label?: string
          id?: string
          is_custom?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_scope_exclusions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "project_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_scope_exclusions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_scope_selections: {
        Row: {
          category_slug: string
          contract_id: string
          created_at: string
          id: string
          is_included: boolean
          project_id: string
        }
        Insert: {
          category_slug: string
          contract_id: string
          created_at?: string
          id?: string
          is_included?: boolean
          project_id: string
        }
        Update: {
          category_slug?: string
          contract_id?: string
          created_at?: string
          id?: string
          is_included?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_scope_selections_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "contract_scope_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "contract_scope_selections_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "project_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_scope_selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_delays: {
        Row: {
          cause: string
          created_at: string
          hours_lost: number
          id: string
          log_id: string
          notes: string | null
        }
        Insert: {
          cause: string
          created_at?: string
          hours_lost?: number
          id?: string
          log_id: string
          notes?: string | null
        }
        Update: {
          cause?: string
          created_at?: string
          hours_lost?: number
          id?: string
          log_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_delays_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_deliveries: {
        Row: {
          created_at: string
          id: string
          log_id: string
          notes: string | null
          po_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_id: string
          notes?: string | null
          po_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          log_id?: string
          notes?: string | null
          po_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_deliveries_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_deliveries_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_manpower: {
        Row: {
          created_at: string
          headcount: number
          id: string
          log_id: string
          org_id: string | null
          trade: string
        }
        Insert: {
          created_at?: string
          headcount?: number
          id?: string
          log_id: string
          org_id?: string | null
          trade?: string
        }
        Update: {
          created_at?: string
          headcount?: number
          id?: string
          log_id?: string
          org_id?: string | null
          trade?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_manpower_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_manpower_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          log_id: string
          storage_path: string
          tag: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          log_id: string
          storage_path: string
          tag?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          log_id?: string
          storage_path?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_photos_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string
          created_by: string
          delay_hours: number | null
          id: string
          log_date: string
          manpower_total: number | null
          notes: string | null
          project_id: string
          safety_incidents: Json | null
          status: string
          submitted_at: string | null
          updated_at: string
          weather_data: Json | null
        }
        Insert: {
          created_at?: string
          created_by: string
          delay_hours?: number | null
          id?: string
          log_date?: string
          manpower_total?: number | null
          notes?: string | null
          project_id: string
          safety_incidents?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          weather_data?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string
          delay_hours?: number | null
          id?: string
          log_date?: string
          manpower_total?: number | null
          notes?: string | null
          project_id?: string
          safety_incidents?: Json | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      field_captures: {
        Row: {
          created_at: string
          description: string | null
          device_info: Json | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          location: Json | null
          organization_id: string
          photo_url: string | null
          project_id: string
          reason_category: string | null
          status: string
          timestamp: string
          user_id: string
          video_url: string | null
          voice_note_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          device_info?: Json | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location?: Json | null
          organization_id: string
          photo_url?: string | null
          project_id: string
          reason_category?: string | null
          status?: string
          timestamp?: string
          user_id: string
          video_url?: string | null
          voice_note_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          device_info?: Json | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          location?: Json | null
          organization_id?: string
          photo_url?: string | null
          project_id?: string
          reason_category?: string | null
          status?: string
          timestamp?: string
          user_id?: string
          video_url?: string | null
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_captures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_captures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_period_end: string
          billing_period_start: string
          co_ids: string[] | null
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
          co_ids?: string[] | null
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
          co_ids?: string[] | null
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
        }
        Relationships: [
          {
            foreignKeyName: "material_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      nudge_log: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          sent_by: string
          sent_to_org: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          sent_by: string
          sent_to_org: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          sent_by?: string
          sent_to_org?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudge_log_sent_to_org_fkey"
            columns: ["sent_to_org"]
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
      org_feature_overrides: {
        Row: {
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_feature_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          use_fc_input_as_base: boolean | null
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
          use_fc_input_as_base?: boolean | null
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
          use_fc_input_as_base?: boolean | null
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
          default_equipment_markup_pct: number
          default_materials_markup_pct: number
          id: string
          insurance_expiration_date: string | null
          license_number: string | null
          name: string
          org_code: string
          phone: string | null
          subscription_plan_id: string | null
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
          default_equipment_markup_pct?: number
          default_materials_markup_pct?: number
          id?: string
          insurance_expiration_date?: string | null
          license_number?: string | null
          name: string
          org_code: string
          phone?: string | null
          subscription_plan_id?: string | null
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
          default_equipment_markup_pct?: number
          default_materials_markup_pct?: number
          id?: string
          insurance_expiration_date?: string | null
          license_number?: string | null
          name?: string
          org_code?: string
          phone?: string | null
          subscription_plan_id?: string | null
          trade?: string | null
          trade_custom?: string | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          created_at: string
          id: string
          last_impersonation_at: string | null
          platform_role: Database["public"]["Enums"]["platform_role"]
          two_factor_verified: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_impersonation_at?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          two_factor_verified?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_impersonation_at?: string | null
          platform_role?: Database["public"]["Enums"]["platform_role"]
          two_factor_verified?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      po_line_items: {
        Row: {
          adjustment_reason: string | null
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
          original_unit_price: number | null
          pieces: number | null
          po_id: string
          price_adjusted_by_supplier: boolean
          price_source: string | null
          quantity: number
          source_co_material_item_id: string | null
          source_estimate_item_id: string | null
          source_pack_name: string | null
          supplier_notes: string | null
          supplier_sku: string | null
          unit_price: number | null
          uom: string
        }
        Insert: {
          adjustment_reason?: string | null
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
          original_unit_price?: number | null
          pieces?: number | null
          po_id: string
          price_adjusted_by_supplier?: boolean
          price_source?: string | null
          quantity: number
          source_co_material_item_id?: string | null
          source_estimate_item_id?: string | null
          source_pack_name?: string | null
          supplier_notes?: string | null
          supplier_sku?: string | null
          unit_price?: number | null
          uom?: string
        }
        Update: {
          adjustment_reason?: string | null
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
          original_unit_price?: number | null
          pieces?: number | null
          po_id?: string
          price_adjusted_by_supplier?: boolean
          price_source?: string | null
          quantity?: number
          source_co_material_item_id?: string | null
          source_estimate_item_id?: string | null
          source_pack_name?: string | null
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
          {
            foreignKeyName: "po_line_items_source_co_material_item_id_fkey"
            columns: ["source_co_material_item_id"]
            isOneToOne: false
            referencedRelation: "co_material_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_source_estimate_item_id_fkey"
            columns: ["source_estimate_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_estimate_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          hourly_rate: number | null
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
          address?: Json | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
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
          address?: Json | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          hourly_rate?: number | null
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
          labor_budget: number | null
          material_estimate_total: number | null
          material_markup_type: string | null
          material_markup_value: number | null
          material_responsibility: string | null
          notes: string | null
          owner_contract_value: number | null
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
          labor_budget?: number | null
          material_estimate_total?: number | null
          material_markup_type?: string | null
          material_markup_value?: number | null
          material_responsibility?: string | null
          notes?: string | null
          owner_contract_value?: number | null
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
          labor_budget?: number | null
          material_estimate_total?: number | null
          material_markup_type?: string | null
          material_markup_value?: number | null
          material_responsibility?: string | null
          notes?: string | null
          owner_contract_value?: number | null
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
          po_email: string | null
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
          po_email?: string | null
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
          po_email?: string | null
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
      project_framing_scope: {
        Row: {
          ai_summary: string | null
          answers: Json
          created_at: string | null
          current_section: number
          generated_at: string | null
          id: string
          project_id: string
          scope_complete: boolean
          updated_at: string | null
        }
        Insert: {
          ai_summary?: string | null
          answers?: Json
          created_at?: string | null
          current_section?: number
          generated_at?: string | null
          id?: string
          project_id: string
          scope_complete?: boolean
          updated_at?: string | null
        }
        Update: {
          ai_summary?: string | null
          answers?: Json
          created_at?: string | null
          current_section?: number
          generated_at?: string | null
          id?: string
          project_id?: string
          scope_complete?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_framing_scope_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
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
      project_profiles: {
        Row: {
          basement_type: string | null
          corridor_type: string | null
          created_at: string
          deck_porch_type: string | null
          entry_type: string | null
          floor_system: string | null
          foundation_types: string[]
          framing_system: string | null
          garage_car_count: number | null
          garage_types: string[]
          has_balcony: boolean
          has_basement: boolean
          has_clubhouse: boolean
          has_commercial_spaces: boolean
          has_corridors: boolean
          has_covered_porch: boolean
          has_deck: boolean
          has_deck_balcony: boolean
          has_elevator: boolean
          has_garage: boolean
          has_pool: boolean
          has_shed: boolean
          has_stairs: boolean
          id: string
          is_complete: boolean
          number_of_buildings: number
          project_id: string
          project_type_id: string
          roof_system: string | null
          roof_type: string | null
          scope_backout: boolean | null
          scope_backout_blocking: boolean
          scope_backout_blocking_items: string[]
          scope_backout_nailer_plates: boolean
          scope_backout_pickup_framing: boolean
          scope_backout_shimming: boolean
          scope_backout_stud_repair: boolean
          scope_curtain_wall: boolean | null
          scope_deck_type: string | null
          scope_decks_railings: boolean | null
          scope_exterior_trim: boolean | null
          scope_exterior_trim_type: string | null
          scope_extras: string[] | null
          scope_fascia_type: string | null
          scope_fire_stopping: boolean | null
          scope_garage_framing: boolean | null
          scope_garage_trim_openings: boolean | null
          scope_patio_door_type: string | null
          scope_patio_doors: boolean | null
          scope_railings: boolean | null
          scope_sheathing: boolean | null
          scope_siding: boolean | null
          scope_siding_level: string | null
          scope_siding_type: string | null
          scope_soffit_fascia: boolean | null
          scope_soffit_type: string | null
          scope_stairs_scope: boolean | null
          scope_storefront_framing: boolean | null
          scope_windows_install: boolean | null
          scope_windows_type: string | null
          scope_wrb: boolean | null
          scope_wrb_type: string | null
          special_rooms: string[] | null
          stair_types: string[]
          stories: number
          stories_per_unit: number | null
          structure_type: string | null
          units_per_building: number | null
          updated_at: string
        }
        Insert: {
          basement_type?: string | null
          corridor_type?: string | null
          created_at?: string
          deck_porch_type?: string | null
          entry_type?: string | null
          floor_system?: string | null
          foundation_types?: string[]
          framing_system?: string | null
          garage_car_count?: number | null
          garage_types?: string[]
          has_balcony?: boolean
          has_basement?: boolean
          has_clubhouse?: boolean
          has_commercial_spaces?: boolean
          has_corridors?: boolean
          has_covered_porch?: boolean
          has_deck?: boolean
          has_deck_balcony?: boolean
          has_elevator?: boolean
          has_garage?: boolean
          has_pool?: boolean
          has_shed?: boolean
          has_stairs?: boolean
          id?: string
          is_complete?: boolean
          number_of_buildings?: number
          project_id: string
          project_type_id: string
          roof_system?: string | null
          roof_type?: string | null
          scope_backout?: boolean | null
          scope_backout_blocking?: boolean
          scope_backout_blocking_items?: string[]
          scope_backout_nailer_plates?: boolean
          scope_backout_pickup_framing?: boolean
          scope_backout_shimming?: boolean
          scope_backout_stud_repair?: boolean
          scope_curtain_wall?: boolean | null
          scope_deck_type?: string | null
          scope_decks_railings?: boolean | null
          scope_exterior_trim?: boolean | null
          scope_exterior_trim_type?: string | null
          scope_extras?: string[] | null
          scope_fascia_type?: string | null
          scope_fire_stopping?: boolean | null
          scope_garage_framing?: boolean | null
          scope_garage_trim_openings?: boolean | null
          scope_patio_door_type?: string | null
          scope_patio_doors?: boolean | null
          scope_railings?: boolean | null
          scope_sheathing?: boolean | null
          scope_siding?: boolean | null
          scope_siding_level?: string | null
          scope_siding_type?: string | null
          scope_soffit_fascia?: boolean | null
          scope_soffit_type?: string | null
          scope_stairs_scope?: boolean | null
          scope_storefront_framing?: boolean | null
          scope_windows_install?: boolean | null
          scope_windows_type?: string | null
          scope_wrb?: boolean | null
          scope_wrb_type?: string | null
          special_rooms?: string[] | null
          stair_types?: string[]
          stories?: number
          stories_per_unit?: number | null
          structure_type?: string | null
          units_per_building?: number | null
          updated_at?: string
        }
        Update: {
          basement_type?: string | null
          corridor_type?: string | null
          created_at?: string
          deck_porch_type?: string | null
          entry_type?: string | null
          floor_system?: string | null
          foundation_types?: string[]
          framing_system?: string | null
          garage_car_count?: number | null
          garage_types?: string[]
          has_balcony?: boolean
          has_basement?: boolean
          has_clubhouse?: boolean
          has_commercial_spaces?: boolean
          has_corridors?: boolean
          has_covered_porch?: boolean
          has_deck?: boolean
          has_deck_balcony?: boolean
          has_elevator?: boolean
          has_garage?: boolean
          has_pool?: boolean
          has_shed?: boolean
          has_stairs?: boolean
          id?: string
          is_complete?: boolean
          number_of_buildings?: number
          project_id?: string
          project_type_id?: string
          roof_system?: string | null
          roof_type?: string | null
          scope_backout?: boolean | null
          scope_backout_blocking?: boolean
          scope_backout_blocking_items?: string[]
          scope_backout_nailer_plates?: boolean
          scope_backout_pickup_framing?: boolean
          scope_backout_shimming?: boolean
          scope_backout_stud_repair?: boolean
          scope_curtain_wall?: boolean | null
          scope_deck_type?: string | null
          scope_decks_railings?: boolean | null
          scope_exterior_trim?: boolean | null
          scope_exterior_trim_type?: string | null
          scope_extras?: string[] | null
          scope_fascia_type?: string | null
          scope_fire_stopping?: boolean | null
          scope_garage_framing?: boolean | null
          scope_garage_trim_openings?: boolean | null
          scope_patio_door_type?: string | null
          scope_patio_doors?: boolean | null
          scope_railings?: boolean | null
          scope_sheathing?: boolean | null
          scope_siding?: boolean | null
          scope_siding_level?: string | null
          scope_siding_type?: string | null
          scope_soffit_fascia?: boolean | null
          scope_soffit_type?: string | null
          scope_stairs_scope?: boolean | null
          scope_storefront_framing?: boolean | null
          scope_windows_install?: boolean | null
          scope_windows_type?: string | null
          scope_wrb?: boolean | null
          scope_wrb_type?: string | null
          special_rooms?: string[] | null
          stair_types?: string[]
          stories?: number
          stories_per_unit?: number | null
          structure_type?: string | null
          units_per_building?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_profiles_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
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
      project_schedule_items: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          dependency_ids: string[] | null
          end_date: string | null
          id: string
          item_type: string
          progress: number | null
          project_id: string
          sort_order: number | null
          sov_item_id: string | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          dependency_ids?: string[] | null
          end_date?: string | null
          id?: string
          item_type?: string
          progress?: number | null
          project_id: string
          sort_order?: number | null
          sov_item_id?: string | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          dependency_ids?: string[] | null
          end_date?: string | null
          id?: string
          item_type?: string
          progress?: number | null
          project_id?: string
          sort_order?: number | null
          sov_item_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_schedule_items_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_sov_items"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scope_assignments: {
        Row: {
          assigned_role: string
          assigned_to_org_id: string
          created_at: string | null
          id: string
          project_id: string
          scope_item_id: string
        }
        Insert: {
          assigned_role: string
          assigned_to_org_id: string
          created_at?: string | null
          id?: string
          project_id: string
          scope_item_id: string
        }
        Update: {
          assigned_role?: string
          assigned_to_org_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
          scope_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_scope_assignments_assigned_to_org_id_fkey"
            columns: ["assigned_to_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scope_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scope_assignments_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
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
      project_scope_selections: {
        Row: {
          created_at: string
          id: string
          is_conflict: boolean
          is_new: boolean
          is_on: boolean
          profile_id: string
          project_id: string
          scope_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_conflict?: boolean
          is_new?: boolean
          is_on?: boolean
          profile_id: string
          project_id: string
          scope_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_conflict?: boolean
          is_new?: boolean
          is_on?: boolean
          profile_id?: string
          project_id?: string
          scope_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_scope_selections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "project_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scope_selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scope_selections_scope_item_id_fkey"
            columns: ["scope_item_id"]
            isOneToOne: false
            referencedRelation: "scope_items"
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
          previous_version_id: string | null
          project_id: string
          project_profile_id: string | null
          scope_snapshot: Json | null
          sov_name: string | null
          version: number
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          created_from_template_key?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          previous_version_id?: string | null
          project_id: string
          project_profile_id?: string | null
          scope_snapshot?: Json | null
          sov_name?: string | null
          version?: number
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          created_from_template_key?: string | null
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          previous_version_id?: string | null
          project_id?: string
          project_profile_id?: string | null
          scope_snapshot?: Json | null
          sov_name?: string | null
          version?: number
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
            foreignKeyName: "project_sov_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "project_sov"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sov_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sov_project_profile_id_fkey"
            columns: ["project_profile_id"]
            isOneToOne: false
            referencedRelation: "project_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sov_items: {
        Row: {
          ai_original_pct: number | null
          billed_to_date: number | null
          billing_status: string
          created_at: string
          default_enabled: boolean
          floor_label: string | null
          id: string
          is_locked: boolean
          item_group: string | null
          item_name: string
          percent_of_contract: number | null
          project_id: string
          remaining_amount: number
          scheduled_value: number | null
          scope_section_slug: string | null
          sort_order: number
          source: string
          sov_id: string | null
          total_billed_amount: number | null
          total_completion_percent: number | null
          updated_at: string | null
          value_amount: number | null
        }
        Insert: {
          ai_original_pct?: number | null
          billed_to_date?: number | null
          billing_status?: string
          created_at?: string
          default_enabled?: boolean
          floor_label?: string | null
          id?: string
          is_locked?: boolean
          item_group?: string | null
          item_name: string
          percent_of_contract?: number | null
          project_id: string
          remaining_amount?: number
          scheduled_value?: number | null
          scope_section_slug?: string | null
          sort_order?: number
          source?: string
          sov_id?: string | null
          total_billed_amount?: number | null
          total_completion_percent?: number | null
          updated_at?: string | null
          value_amount?: number | null
        }
        Update: {
          ai_original_pct?: number | null
          billed_to_date?: number | null
          billing_status?: string
          created_at?: string
          default_enabled?: boolean
          floor_label?: string | null
          id?: string
          is_locked?: boolean
          item_group?: string | null
          item_name?: string
          percent_of_contract?: number | null
          project_id?: string
          remaining_amount?: number
          scheduled_value?: number | null
          scope_section_slug?: string | null
          sort_order?: number
          source?: string
          sov_id?: string | null
          total_billed_amount?: number | null
          total_completion_percent?: number | null
          updated_at?: string | null
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
          is_self_performing: boolean
          labor_rate: number | null
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
          is_self_performing?: boolean
          labor_rate?: number | null
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
          is_self_performing?: boolean
          labor_rate?: number | null
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
      project_types: {
        Row: {
          created_at: string
          default_number_of_buildings: number
          default_stories: number
          default_units_per_building: number | null
          id: string
          is_commercial: boolean
          is_multifamily: boolean
          is_single_family: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          default_number_of_buildings?: number
          default_stories?: number
          default_units_per_building?: number | null
          id?: string
          is_commercial?: boolean
          is_multifamily?: boolean
          is_single_family?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          default_number_of_buildings?: number
          default_stories?: number
          default_units_per_building?: number | null
          id?: string
          is_commercial?: boolean
          is_multifamily?: boolean
          is_single_family?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
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
          approved_at: string | null
          approved_by: string | null
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
          po_subtotal_estimate_items: number | null
          po_subtotal_non_estimate_items: number | null
          po_subtotal_total: number | null
          po_tax_total: number | null
          po_total: number | null
          priced_at: string | null
          priced_by: string | null
          pricing_owner_org_id: string | null
          project_id: string | null
          ready_for_delivery_at: string | null
          sales_tax_percent: number | null
          sent_at: string | null
          sent_by: string | null
          source_change_order_id: string | null
          source_change_order_material_request: boolean
          source_estimate_id: string | null
          source_pack_name: string | null
          status: Database["public"]["Enums"]["po_status"]
          submitted_at: string | null
          submitted_by: string | null
          supplier_id: string
          tax_percent_applied: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
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
          po_subtotal_estimate_items?: number | null
          po_subtotal_non_estimate_items?: number | null
          po_subtotal_total?: number | null
          po_tax_total?: number | null
          po_total?: number | null
          priced_at?: string | null
          priced_by?: string | null
          pricing_owner_org_id?: string | null
          project_id?: string | null
          ready_for_delivery_at?: string | null
          sales_tax_percent?: number | null
          sent_at?: string | null
          sent_by?: string | null
          source_change_order_id?: string | null
          source_change_order_material_request?: boolean
          source_estimate_id?: string | null
          source_pack_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id: string
          tax_percent_applied?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
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
          po_subtotal_estimate_items?: number | null
          po_subtotal_non_estimate_items?: number | null
          po_subtotal_total?: number | null
          po_tax_total?: number | null
          po_total?: number | null
          priced_at?: string | null
          priced_by?: string | null
          pricing_owner_org_id?: string | null
          project_id?: string | null
          ready_for_delivery_at?: string | null
          sales_tax_percent?: number | null
          sent_at?: string | null
          sent_by?: string | null
          source_change_order_id?: string | null
          source_change_order_material_request?: boolean
          source_estimate_id?: string | null
          source_pack_name?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          supplier_id?: string
          tax_percent_applied?: number | null
          updated_at?: string
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
            foreignKeyName: "purchase_orders_source_change_order_id_fkey"
            columns: ["source_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
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
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          accepted_qty: number | null
          condition: string
          condition_notes: string | null
          created_at: string
          credit_line_total: number | null
          credit_unit_price: number | null
          description_snapshot: string
          id: string
          nonreturnable_reason: string | null
          original_unit_price: number | null
          po_id: string
          po_line_item_id: string
          qty_requested: number
          reason: string | null
          reason_notes: string | null
          return_id: string
          returnable_flag: string
          uom: string
        }
        Insert: {
          accepted_qty?: number | null
          condition?: string
          condition_notes?: string | null
          created_at?: string
          credit_line_total?: number | null
          credit_unit_price?: number | null
          description_snapshot: string
          id?: string
          nonreturnable_reason?: string | null
          original_unit_price?: number | null
          po_id: string
          po_line_item_id: string
          qty_requested?: number
          reason?: string | null
          reason_notes?: string | null
          return_id: string
          returnable_flag?: string
          uom?: string
        }
        Update: {
          accepted_qty?: number | null
          condition?: string
          condition_notes?: string | null
          created_at?: string
          credit_line_total?: number | null
          credit_unit_price?: number | null
          description_snapshot?: string
          id?: string
          nonreturnable_reason?: string | null
          original_unit_price?: number | null
          po_id?: string
          po_line_item_id?: string
          qty_requested?: number
          reason?: string | null
          reason_notes?: string | null
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
      scope_items: {
        Row: {
          created_at: string
          default_on: boolean
          display_order: number
          excluded_project_types: string[]
          id: string
          item_type: string
          label: string
          min_stories: number | null
          only_project_types: string[] | null
          required_feature: string | null
          section_id: string
        }
        Insert: {
          created_at?: string
          default_on?: boolean
          display_order?: number
          excluded_project_types?: string[]
          id?: string
          item_type?: string
          label: string
          min_stories?: number | null
          only_project_types?: string[] | null
          required_feature?: string | null
          section_id: string
        }
        Update: {
          created_at?: string
          default_on?: boolean
          display_order?: number
          excluded_project_types?: string[]
          id?: string
          item_type?: string
          label?: string
          min_stories?: number | null
          only_project_types?: string[] | null
          required_feature?: string | null
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "scope_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      scope_sections: {
        Row: {
          always_visible: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          label: string
          required_feature: string | null
          slug: string
        }
        Insert: {
          always_visible?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          label: string
          required_feature?: string | null
          slug: string
        }
        Update: {
          always_visible?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          label?: string
          required_feature?: string | null
          slug?: string
        }
        Relationships: []
      }
      sov_invoice_lines: {
        Row: {
          amount_billed: number
          created_at: string
          id: string
          invoice_id: string
          sov_item_id: string
        }
        Insert: {
          amount_billed: number
          created_at?: string
          id?: string
          invoice_id: string
          sov_item_id: string
        }
        Update: {
          amount_billed?: number
          created_at?: string
          id?: string
          invoice_id?: string
          sov_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_invoice_lines_sov_item_id_fkey"
            columns: ["sov_item_id"]
            isOneToOne: false
            referencedRelation: "project_sov_items"
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
      subscription_plans: {
        Row: {
          annual_price: number | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          monthly_price: number | null
          name: string
          sort_order: number
        }
        Insert: {
          annual_price?: number | null
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          name: string
          sort_order?: number
        }
        Update: {
          annual_price?: number | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          monthly_price?: number | null
          name?: string
          sort_order?: number
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
          sales_tax_percent: number | null
          status: string
          submitted_at: string | null
          supplier_org_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          sales_tax_percent?: number | null
          status?: string
          submitted_at?: string | null
          supplier_org_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          sales_tax_percent?: number | null
          status?: string
          submitted_at?: string | null
          supplier_org_id?: string
          total_amount?: number | null
          updated_at?: string | null
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
      support_actions_log: {
        Row: {
          action_summary: string | null
          action_type: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          created_at: string
          created_by_email: string | null
          created_by_name: string | null
          created_by_user_id: string
          id: string
          reason: string
          target_org_id: string | null
          target_org_name: string | null
          target_project_id: string | null
          target_project_name: string | null
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action_summary?: string | null
          action_type: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_user_id: string
          id?: string
          reason: string
          target_org_id?: string | null
          target_org_name?: string | null
          target_project_id?: string | null
          target_project_name?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_summary?: string | null
          action_type?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          created_by_email?: string | null
          created_by_name?: string | null
          created_by_user_id?: string
          id?: string
          reason?: string
          target_org_id?: string | null
          target_org_name?: string | null
          target_project_id?: string | null
          target_project_name?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
      user_notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          overdue_invoices: boolean | null
          pending_approvals: boolean | null
          push_enabled: boolean | null
          push_frequency: string | null
          push_quiet_hours_end: string | null
          push_quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
          work_order_updates: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          overdue_invoices?: boolean | null
          pending_approvals?: boolean | null
          push_enabled?: boolean | null
          push_frequency?: string | null
          push_quiet_hours_end?: string | null
          push_quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
          work_order_updates?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          overdue_invoices?: boolean | null
          pending_approvals?: boolean | null
          push_enabled?: boolean | null
          push_frequency?: string | null
          push_quiet_hours_end?: string | null
          push_quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
          work_order_updates?: boolean | null
        }
        Relationships: []
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
      work_order_catalog: {
        Row: {
          category_bg: string
          category_color: string
          category_icon: string
          category_id: string
          category_name: string
          created_at: string | null
          division: string
          group_id: string
          group_label: string
          id: string
          item_name: string
          org_id: string | null
          sort_order: number | null
          unit: string
        }
        Insert: {
          category_bg?: string
          category_color?: string
          category_icon?: string
          category_id: string
          category_name: string
          created_at?: string | null
          division: string
          group_id: string
          group_label: string
          id?: string
          item_name: string
          org_id?: string | null
          sort_order?: number | null
          unit: string
        }
        Update: {
          category_bg?: string
          category_color?: string
          category_icon?: string
          category_id?: string
          category_name?: string
          created_at?: string | null
          division?: string
          group_id?: string
          group_label?: string
          id?: string
          item_name?: string
          org_id?: string | null
          sort_order?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_catalog_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
      can_accept_project_invite: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_access_change_order: {
        Args: { _co_id: string; _user_id?: string }
        Returns: boolean
      }
      can_request_fc_change_order_input: {
        Args: { _co_id: string; _fc_org_id: string; _user_id?: string }
        Returns: boolean
      }
      can_see_financials: { Args: { _user_id: string }; Returns: boolean }
      can_see_margins: { Args: { _user_id: string }; Returns: boolean }
      can_supplier_edit_po_pricing: {
        Args: { _po_id: string; _user_id?: string }
        Returns: boolean
      }
      can_view_po_pricing: { Args: { po_id: string }; Returns: boolean }
      change_org_member_role: {
        Args: { p_member_role_id: string; p_new_role: string }
        Returns: undefined
      }
      check_org_setup_needed: { Args: never; Returns: Json }
      complete_fc_change_order_input: {
        Args: { _co_id: string }
        Returns: {
          co_id: string
          collaborator_type: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          id: string
          invited_by_user_id: string
          organization_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_order_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_signup:
        | {
            Args: {
              _first_name: string
              _last_name: string
              _org_name?: string
              _org_type?: Database["public"]["Enums"]["org_type"]
              _phone?: string
              _trade?: string
              _trade_custom?: string
            }
            Returns: Json
          }
        | {
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
      forward_change_order_to_upstream_gc: {
        Args: { _co_id: string }
        Returns: {
          approved_at: string | null
          assigned_to_org_id: string | null
          closed_for_pricing_at: string | null
          co_number: string | null
          combined_at: string | null
          combined_co_id: string | null
          completed_at: string | null
          completion_acknowledged_at: string | null
          contracted_at: string | null
          created_at: string | null
          created_by_role: string
          created_by_user_id: string
          draft_shared_with_next: boolean
          equipment_needed: boolean
          equipment_responsible: string | null
          fc_input_needed: boolean
          fc_pricing_submitted_at: string | null
          id: string
          location_tag: string | null
          materials_needed: boolean
          materials_on_site: boolean
          materials_responsible: string | null
          nte_cap: number | null
          nte_increase_approved: boolean | null
          nte_increase_requested: number | null
          org_id: string
          parent_co_id: string | null
          pricing_type: string
          project_id: string
          reason: string | null
          reason_note: string | null
          rejected_at: string | null
          rejection_note: string | null
          shared_at: string | null
          status: string
          submitted_at: string | null
          tc_snapshot_hourly_rate: number | null
          tc_snapshot_markup_percent: number | null
          tc_submitted_price: number | null
          title: string | null
          updated_at: string | null
          use_fc_pricing_base: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "change_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      get_org_features: {
        Args: { p_org_id: string }
        Returns: {
          enabled: boolean
          feature_key: string
          limit_value: number
          source: string
        }[]
      }
      get_platform_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["platform_role"]
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
      is_platform_staff: { Args: { _user_id: string }; Returns: boolean }
      is_platform_user: { Args: { _user_id: string }; Returns: boolean }
      is_pm_role: { Args: { _user_id: string }; Returns: boolean }
      is_supplier_for_purchase_order: {
        Args: { _po_id: string; _user_id?: string }
        Returns: boolean
      }
      log_support_action: {
        Args: {
          p_action_summary?: string
          p_action_type?: string
          p_after_snapshot?: Json
          p_before_snapshot?: Json
          p_reason?: string
          p_target_org_id?: string
          p_target_org_name?: string
          p_target_project_id?: string
          p_target_project_name?: string
          p_target_user_email?: string
          p_target_user_id?: string
        }
        Returns: string
      }
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
      remove_org_member: {
        Args: { _target_role_id: string }
        Returns: undefined
      }
      request_fc_change_order_input: {
        Args: { _co_id: string; _fc_org_id: string }
        Returns: {
          co_id: string
          collaborator_type: string
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string
          id: string
          invited_by_user_id: string
          organization_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "change_order_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
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
      send_nudge: {
        Args: { _entity_id: string; _entity_type: string }
        Returns: Json
      }
      send_work_order_assignment_notification: {
        Args: {
          _change_order_id: string
          _recipient_org_id: string
          _work_order_title: string
        }
        Returns: undefined
      }
      transfer_admin: { Args: { _target_role_id: string }; Returns: undefined }
      update_member_job_title: {
        Args: { _job_title: string; _target_user_id: string }
        Returns: undefined
      }
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
      update_sov_line_percentages: {
        Args: {
          p_contract_value: number
          p_retainage_pct: number
          p_updates: Json
        }
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
        | "NUDGE"
        | "NTE_REQUESTED"
        | "NTE_APPROVED"
        | "NTE_REJECTED"
        | "CO_SHARED"
        | "CO_RECALLED"
        | "CO_CLOSED_FOR_PRICING"
        | "CO_COMPLETED"
        | "CO_ACKNOWLEDGED"
        | "CO_SCOPE_ADDED"
        | "NTE_WARNING_80"
        | "NTE_BLOCKED_100"
        | "FC_PRICING_SUBMITTED"
      order_status:
        | "DRAFT"
        | "SUBMITTED"
        | "APPROVED"
        | "FULFILLED"
        | "CANCELLED"
      org_type: "GC" | "TC" | "SUPPLIER" | "FC"
      pack_type: "LOOSE_MODIFIABLE" | "ENGINEERED_LOCKED"
      platform_role:
        | "NONE"
        | "PLATFORM_OWNER"
        | "PLATFORM_ADMIN"
        | "SUPPORT_AGENT"
      po_status:
        | "DRAFT"
        | "SENT"
        | "ACTIVE"
        | "PENDING_APPROVAL"
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
        "NUDGE",
        "NTE_REQUESTED",
        "NTE_APPROVED",
        "NTE_REJECTED",
        "CO_SHARED",
        "CO_RECALLED",
        "CO_CLOSED_FOR_PRICING",
        "CO_COMPLETED",
        "CO_ACKNOWLEDGED",
        "CO_SCOPE_ADDED",
        "NTE_WARNING_80",
        "NTE_BLOCKED_100",
        "FC_PRICING_SUBMITTED",
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
      platform_role: [
        "NONE",
        "PLATFORM_OWNER",
        "PLATFORM_ADMIN",
        "SUPPORT_AGENT",
      ],
      po_status: [
        "DRAFT",
        "SENT",
        "ACTIVE",
        "PENDING_APPROVAL",
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
