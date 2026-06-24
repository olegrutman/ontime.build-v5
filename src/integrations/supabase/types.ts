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
      activity_events: {
        Row: {
          actor_user_id: string
          contract_context_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          project_id: string
        }
        Insert: {
          actor_user_id: string
          contract_context_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          project_id: string
        }
        Update: {
          actor_user_id?: string
          contract_context_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_contract_context_id_fkey"
            columns: ["contract_context_id"]
            isOneToOne: false
            referencedRelation: "contract_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_cost_layers: {
        Row: {
          change_order_id: string
          created_at: string
          equipment_cost: number | null
          id: string
          labor_cost: number | null
          labor_hours: number | null
          labor_rate: number | null
          layer_role: Database["public"]["Enums"]["app_role"]
          materials_cost: number | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          change_order_id: string
          created_at?: string
          equipment_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          layer_role: Database["public"]["Enums"]["app_role"]
          materials_cost?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          change_order_id?: string
          created_at?: string
          equipment_cost?: number | null
          id?: string
          labor_cost?: number | null
          labor_hours?: number | null
          labor_rate?: number | null
          layer_role?: Database["public"]["Enums"]["app_role"]
          materials_cost?: number | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_cost_layers_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_requests: {
        Row: {
          contract_context_id: string | null
          converted_at: string | null
          converted_by_user_id: string | null
          converted_to_co_id: string | null
          created_at: string
          created_by_user_id: string
          description: string
          draft_co_id: string | null
          equipment_cost: number | null
          fc_notes: string | null
          hours_submitted_at: string | null
          hours_submitted_by_user_id: string | null
          id: string
          labor_cost: number | null
          labor_rate: number | null
          location: Json
          man_hours: number | null
          markup_percent: number | null
          materials_cost: number | null
          opened_at: string | null
          originated_by_role: string | null
          parent_cor_id: string | null
          parent_cor_ref: string | null
          priced_at: string | null
          priced_by_user_id: string | null
          project_id: string
          reason: Database["public"]["Enums"]["cor_reason"]
          recipient_user_id: string | null
          reference_number: number
          scope_type: Database["public"]["Enums"]["cor_scope_type"]
          sent_at: string | null
          status: Database["public"]["Enums"]["cor_status"]
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          contract_context_id?: string | null
          converted_at?: string | null
          converted_by_user_id?: string | null
          converted_to_co_id?: string | null
          created_at?: string
          created_by_user_id: string
          description: string
          draft_co_id?: string | null
          equipment_cost?: number | null
          fc_notes?: string | null
          hours_submitted_at?: string | null
          hours_submitted_by_user_id?: string | null
          id?: string
          labor_cost?: number | null
          labor_rate?: number | null
          location?: Json
          man_hours?: number | null
          markup_percent?: number | null
          materials_cost?: number | null
          opened_at?: string | null
          originated_by_role?: string | null
          parent_cor_id?: string | null
          parent_cor_ref?: string | null
          priced_at?: string | null
          priced_by_user_id?: string | null
          project_id: string
          reason: Database["public"]["Enums"]["cor_reason"]
          recipient_user_id?: string | null
          reference_number?: number
          scope_type: Database["public"]["Enums"]["cor_scope_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cor_status"]
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          contract_context_id?: string | null
          converted_at?: string | null
          converted_by_user_id?: string | null
          converted_to_co_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string
          draft_co_id?: string | null
          equipment_cost?: number | null
          fc_notes?: string | null
          hours_submitted_at?: string | null
          hours_submitted_by_user_id?: string | null
          id?: string
          labor_cost?: number | null
          labor_rate?: number | null
          location?: Json
          man_hours?: number | null
          markup_percent?: number | null
          materials_cost?: number | null
          opened_at?: string | null
          originated_by_role?: string | null
          parent_cor_id?: string | null
          parent_cor_ref?: string | null
          priced_at?: string | null
          priced_by_user_id?: string | null
          project_id?: string
          reason?: Database["public"]["Enums"]["cor_reason"]
          recipient_user_id?: string | null
          reference_number?: number
          scope_type?: Database["public"]["Enums"]["cor_scope_type"]
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cor_status"]
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_order_requests_contract_context_id_fkey"
            columns: ["contract_context_id"]
            isOneToOne: false
            referencedRelation: "contract_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_converted_by_user_id_fkey"
            columns: ["converted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_converted_to_co_id_fkey"
            columns: ["converted_to_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_hours_submitted_by_user_id_fkey"
            columns: ["hours_submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_parent_cor_id_fkey"
            columns: ["parent_cor_id"]
            isOneToOne: false
            referencedRelation: "change_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_priced_by_user_id_fkey"
            columns: ["priced_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by_user_id: string | null
          contract_context_id: string
          converted_at: string | null
          created_at: string
          created_by_user_id: string
          description: string
          id: string
          location: string
          opened_at: string | null
          reference_number: number
          rejected_at: string | null
          rejected_by_user_id: string | null
          rejection_comments: string | null
          requested_at: string | null
          requested_by_role: string | null
          requested_by_user_id: string | null
          scope_type: Database["public"]["Enums"]["co_scope_type"]
          source_cor_id: string | null
          source_cor_ref: string | null
          source_fc_change_order_id: string | null
          submitted_at: string | null
          submitted_to_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at: string
          work_status: Database["public"]["Enums"]["work_status"]
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          contract_context_id: string
          converted_at?: string | null
          created_at?: string
          created_by_user_id: string
          description: string
          id?: string
          location: string
          opened_at?: string | null
          reference_number?: number
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_comments?: string | null
          requested_at?: string | null
          requested_by_role?: string | null
          requested_by_user_id?: string | null
          scope_type: Database["public"]["Enums"]["co_scope_type"]
          source_cor_id?: string | null
          source_cor_ref?: string | null
          source_fc_change_order_id?: string | null
          submitted_at?: string | null
          submitted_to_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          updated_at?: string
          work_status?: Database["public"]["Enums"]["work_status"]
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          contract_context_id?: string
          converted_at?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string
          id?: string
          location?: string
          opened_at?: string | null
          reference_number?: number
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_comments?: string | null
          requested_at?: string | null
          requested_by_role?: string | null
          requested_by_user_id?: string | null
          scope_type?: Database["public"]["Enums"]["co_scope_type"]
          source_cor_id?: string | null
          source_cor_ref?: string | null
          source_fc_change_order_id?: string | null
          submitted_at?: string | null
          submitted_to_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          updated_at?: string
          work_status?: Database["public"]["Enums"]["work_status"]
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_contract_context_id_fkey"
            columns: ["contract_context_id"]
            isOneToOne: false
            referencedRelation: "contract_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_rejected_by_user_id_fkey"
            columns: ["rejected_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_source_cor_id_fkey"
            columns: ["source_cor_id"]
            isOneToOne: false
            referencedRelation: "change_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_source_fc_change_order_id_fkey"
            columns: ["source_fc_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      co_line_items: {
        Row: {
          amount: number
          co_id: string
          created_at: string
          created_by_user_id: string
          description: string
          id: string
          qty: number | null
          type: Database["public"]["Enums"]["line_item_type"]
          unit: Database["public"]["Enums"]["unit_type"] | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          co_id: string
          created_at?: string
          created_by_user_id: string
          description: string
          id?: string
          qty?: number | null
          type: Database["public"]["Enums"]["line_item_type"]
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          co_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string
          id?: string
          qty?: number | null
          type?: Database["public"]["Enums"]["line_item_type"]
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_line_items_co_id_fkey"
            columns: ["co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "co_line_items_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_contexts: {
        Row: {
          counterparty_company_id: string
          created_at: string
          id: string
          project_id: string
          tc_company_id: string
          type: Database["public"]["Enums"]["contract_context_type"]
        }
        Insert: {
          counterparty_company_id: string
          created_at?: string
          id?: string
          project_id: string
          tc_company_id: string
          type: Database["public"]["Enums"]["contract_context_type"]
        }
        Update: {
          counterparty_company_id?: string
          created_at?: string
          id?: string
          project_id?: string
          tc_company_id?: string
          type?: Database["public"]["Enums"]["contract_context_type"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_contexts_counterparty_company_id_fkey"
            columns: ["counterparty_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_contexts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_contexts_tc_company_id_fkey"
            columns: ["tc_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          qty: number | null
          source_co_id: string | null
          source_co_line_item_id: string | null
          unit: Database["public"]["Enums"]["unit_type"] | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          qty?: number | null
          source_co_id?: string | null
          source_co_line_item_id?: string | null
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          qty?: number | null
          source_co_id?: string | null
          source_co_line_item_id?: string | null
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
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
            foreignKeyName: "invoice_line_items_source_co_id_fkey"
            columns: ["source_co_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_source_co_line_item_id_fkey"
            columns: ["source_co_line_item_id"]
            isOneToOne: false
            referencedRelation: "co_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by_user_id: string | null
          approver_role: Database["public"]["Enums"]["app_role"] | null
          contract_context_id: string
          created_at: string
          created_by_user_id: string
          id: string
          invoice_number: number
          paid_at: string | null
          rejected_at: string | null
          rejected_by_user_id: string | null
          rejection_comments: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          contract_context_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          invoice_number: number
          paid_at?: string | null
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_comments?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by_user_id?: string | null
          approver_role?: Database["public"]["Enums"]["app_role"] | null
          contract_context_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          invoice_number?: number
          paid_at?: string | null
          rejected_at?: string | null
          rejected_by_user_id?: string | null
          rejection_comments?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_context_id_fkey"
            columns: ["contract_context_id"]
            isOneToOne: false
            referencedRelation: "contract_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_rejected_by_user_id_fkey"
            columns: ["rejected_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          project_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          project_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          project_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          email: string
          hourly_rate: number | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email: string
          hourly_rate?: number | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email?: string
          hourly_rate?: number | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          created_at: string
          id: string
          invitee_user_id: string
          inviter_user_id: string
          project_id: string
          project_role: Database["public"]["Enums"]["app_role"]
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitee_user_id: string
          inviter_user_id: string
          project_id: string
          project_role: Database["public"]["Enums"]["app_role"]
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitee_user_id?: string
          inviter_user_id?: string
          project_id?: string
          project_role?: Database["public"]["Enums"]["app_role"]
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_inviter_user_id_fkey"
            columns: ["inviter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_by_user_id: string
          created_at: string
          id: string
          project_id: string
          role_on_project: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          added_by_user_id: string
          created_at?: string
          id?: string
          project_id: string
          role_on_project: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          added_by_user_id?: string
          created_at?: string
          id?: string
          project_id?: string
          role_on_project?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          contract_mode: Database["public"]["Enums"]["contract_mode"]
          created_at: string
          creator_user_id: string
          floors: number
          id: string
          is_archived: boolean
          last_activity_at: string
          name: string
          retainage_percent: number | null
          scope_flags: Json
          structure_type: Database["public"]["Enums"]["structure_type"]
          updated_at: string
        }
        Insert: {
          address: string
          contract_mode?: Database["public"]["Enums"]["contract_mode"]
          created_at?: string
          creator_user_id: string
          floors: number
          id?: string
          is_archived?: boolean
          last_activity_at?: string
          name: string
          retainage_percent?: number | null
          scope_flags?: Json
          structure_type: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Update: {
          address?: string
          contract_mode?: Database["public"]["Enums"]["contract_mode"]
          created_at?: string
          creator_user_id?: string
          floors?: number
          id?: string
          is_archived?: boolean
          last_activity_at?: string
          name?: string
          retainage_percent?: number | null
          scope_flags?: Json
          structure_type?: Database["public"]["Enums"]["structure_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_line_items: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          is_from_change_order: boolean | null
          name: string
          percent: number | null
          quantity: number | null
          sort_order: number
          source_change_order_id: string | null
          sov_id: string
          unit: Database["public"]["Enums"]["unit_type"] | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          is_from_change_order?: boolean | null
          name: string
          percent?: number | null
          quantity?: number | null
          sort_order?: number
          source_change_order_id?: string | null
          sov_id: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          is_from_change_order?: boolean | null
          name?: string
          percent?: number | null
          quantity?: number | null
          sort_order?: number
          source_change_order_id?: string | null
          sov_id?: string
          unit?: Database["public"]["Enums"]["unit_type"] | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_line_items_source_change_order_id_fkey"
            columns: ["source_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_line_items_sov_id_fkey"
            columns: ["sov_id"]
            isOneToOne: false
            referencedRelation: "sovs"
            referencedColumns: ["id"]
          },
        ]
      }
      sovs: {
        Row: {
          contract_context_id: string
          contract_value: number | null
          created_at: string
          created_by_user_id: string
          id: string
          status: Database["public"]["Enums"]["sov_status"]
          updated_at: string
          updated_by_user_id: string
        }
        Insert: {
          contract_context_id: string
          contract_value?: number | null
          created_at?: string
          created_by_user_id: string
          id?: string
          status?: Database["public"]["Enums"]["sov_status"]
          updated_at?: string
          updated_by_user_id: string
        }
        Update: {
          contract_context_id?: string
          contract_value?: number | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          status?: Database["public"]["Enums"]["sov_status"]
          updated_at?: string
          updated_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sovs_contract_context_id_fkey"
            columns: ["contract_context_id"]
            isOneToOne: false
            referencedRelation: "contract_contexts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sovs_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_action_rates: {
        Row: {
          action_count: number
          action_type: string
          user_id: string
          window_start: string
        }
        Insert: {
          action_count?: number
          action_type: string
          user_id: string
          window_start?: string
        }
        Update: {
          action_count?: number
          action_type?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_project_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      approve_change_order: { Args: { _co_id: string }; Returns: undefined }
      can_access_context: {
        Args: { _context_id: string; _user_id: string }
        Returns: boolean
      }
      check_project_permission: {
        Args: { _permission: string; _project_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _action_type: string; _max_per_hour?: number; _user_id: string }
        Returns: boolean
      }
      create_notification:
        | {
            Args: {
              _body: string
              _project_id?: string
              _title: string
              _type: string
              _user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _data?: Json
              _message?: string
              _title: string
              _type: string
              _user_id: string
            }
            Returns: string
          }
      create_project:
        | {
            Args: {
              _address: string
              _floors: number
              _name: string
              _scope_flags?: Json
              _structure_type: Database["public"]["Enums"]["structure_type"]
            }
            Returns: string
          }
        | {
            Args: {
              _address: string
              _contract_mode?: Database["public"]["Enums"]["contract_mode"]
              _fc_user_id?: string
              _floors: number
              _gc_user_id?: string
              _name: string
              _scope_flags?: Json
              _structure_type: Database["public"]["Enums"]["structure_type"]
            }
            Returns: string
          }
        | {
            Args: {
              _address: string
              _contract_mode?: Database["public"]["Enums"]["contract_mode"]
              _fc_user_id?: string
              _floors: number
              _gc_user_id?: string
              _name: string
              _scope_flags: Json
              _sov_items?: Json
              _structure_type: Database["public"]["Enums"]["structure_type"]
            }
            Returns: string
          }
      decline_project_invitation: {
        Args: { _invitation_id: string }
        Returns: undefined
      }
      get_available_users_for_project: {
        Args: never
        Returns: {
          company_id: string
          company_name: string
          email: string
          user_id: string
        }[]
      }
      get_change_order_approver: {
        Args: { _project_id: string; _submitter_id: string }
        Returns: string
      }
      get_pending_approvals_for_user: {
        Args: never
        Returns: {
          created_by_role: Database["public"]["Enums"]["app_role"]
          description: string
          item_id: string
          item_type: string
          project_id: string
          project_name: string
          submitted_at: string
        }[]
      }
      get_pending_invoice_count_for_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: number
      }
      get_profile_for_project_add: {
        Args: { _project_id: string; _user_id: string }
        Returns: {
          company_name: string
          email: string
          id: string
        }[]
      }
      get_project_id_for_context: {
        Args: { _context_id: string }
        Returns: string
      }
      get_project_member_profile: {
        Args: { _project_id: string; _user_id: string }
        Returns: {
          company_name: string
          email: string
          id: string
        }[]
      }
      get_project_members_with_profiles: {
        Args: { _project_id: string }
        Returns: {
          added_at: string
          company_name: string
          email: string
          member_id: string
          project_role: string
          source: string
          user_id: string
          user_role: string
        }[]
      }
      get_project_pending_counts: {
        Args: { _project_id: string }
        Returns: {
          pending_cos: number
          pending_invoices: number
        }[]
      }
      get_project_permissions: {
        Args: { _project_id: string; _user_id: string }
        Returns: Json
      }
      get_user_id_by_email: { Args: { lookup_email: string }; Returns: string }
      get_user_project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role_for_project: {
        Args: { _project_id: string; _target_user_id: string }
        Returns: string
      }
      get_visible_cost_layers: {
        Args: { _change_order_id: string; _viewer_user_id: string }
        Returns: {
          equipment_cost: number
          labor_cost: number
          labor_hours: number
          labor_rate: number
          layer_role: Database["public"]["Enums"]["app_role"]
          materials_cost: number
          total_cost: number
        }[]
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_party: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      reject_change_order: {
        Args: { _co_id: string; _rejection_comments: string }
        Returns: undefined
      }
      send_project_invitation: {
        Args: {
          _invitee_user_id: string
          _project_id: string
          _project_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      shares_project_with: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      submit_change_order: { Args: { _co_id: string }; Returns: undefined }
      submit_invoice: { Args: { _invoice_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "FIELD_CREW" | "TRADE_CONTRACTOR" | "GC"
      approval_status: "DRAFT" | "NEEDS_APPROVAL" | "APPROVED" | "REJECTED"
      change_order_pricing: "lump_sum" | "labor_materials_equipment"
      co_scope_type:
        | "RE_FRAME"
        | "ADDITION"
        | "FIXING"
        | "RE_INSTALL"
        | "ADJUST"
      contract_context_type: "DOWNSTREAM" | "UPSTREAM"
      contract_mode: "TWO_PARTY" | "THREE_PARTY"
      cor_reason:
        | "OWNER_REQUEST"
        | "MISSING_SCOPE"
        | "DESIGN_CONFLICT"
        | "DAMAGE_BY_OTHERS"
      cor_scope_type:
        | "RE-FRAME"
        | "ADDITION"
        | "FIXING"
        | "RE-INSTALL"
        | "ADJUST"
      cor_status:
        | "REQUESTED"
        | "SENT_TO_TC"
        | "SENT_TO_FIELD_CREW"
        | "HOURS_SUBMITTED"
        | "PRICED_BY_TC"
        | "CONVERTED"
      invoice_status: "DRAFT" | "SUBMITTED" | "PAID"
      line_item_type: "LABOR" | "MATERIAL" | "EQUIPMENT"
      sov_status: "DRAFT" | "ACTIVE"
      structure_type: "APARTMENT" | "TOWNHOME" | "SINGLE_FAMILY" | "HOTEL"
      unit_type: "HR" | "EA" | "LF" | "SF" | "SY" | "DAY" | "LS"
      user_role: "gc" | "sub" | "trade_contractor" | "field_crew"
      work_status: "STARTED" | "IN_PROGRESS" | "COMPLETED"
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
      app_role: ["FIELD_CREW", "TRADE_CONTRACTOR", "GC"],
      approval_status: ["DRAFT", "NEEDS_APPROVAL", "APPROVED", "REJECTED"],
      change_order_pricing: ["lump_sum", "labor_materials_equipment"],
      co_scope_type: ["RE_FRAME", "ADDITION", "FIXING", "RE_INSTALL", "ADJUST"],
      contract_context_type: ["DOWNSTREAM", "UPSTREAM"],
      contract_mode: ["TWO_PARTY", "THREE_PARTY"],
      cor_reason: [
        "OWNER_REQUEST",
        "MISSING_SCOPE",
        "DESIGN_CONFLICT",
        "DAMAGE_BY_OTHERS",
      ],
      cor_scope_type: [
        "RE-FRAME",
        "ADDITION",
        "FIXING",
        "RE-INSTALL",
        "ADJUST",
      ],
      cor_status: [
        "REQUESTED",
        "SENT_TO_TC",
        "SENT_TO_FIELD_CREW",
        "HOURS_SUBMITTED",
        "PRICED_BY_TC",
        "CONVERTED",
      ],
      invoice_status: ["DRAFT", "SUBMITTED", "PAID"],
      line_item_type: ["LABOR", "MATERIAL", "EQUIPMENT"],
      sov_status: ["DRAFT", "ACTIVE"],
      structure_type: ["APARTMENT", "TOWNHOME", "SINGLE_FAMILY", "HOTEL"],
      unit_type: ["HR", "EA", "LF", "SF", "SY", "DAY", "LS"],
      user_role: ["gc", "sub", "trade_contractor", "field_crew"],
      work_status: ["STARTED", "IN_PROGRESS", "COMPLETED"],
    },
  },
} as const
