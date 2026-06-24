import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChangeOrder {
  id: string;
  location: string;
  description: string | null;
  reason: string;
  pricing_type: string;
  lump_sum_amount: number | null;
  labor_cost: number | null;
  materials_cost: number | null;
  equipment_cost: number | null;
  total_amount: number;
  status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_comments: string | null;
  work_scopes: string[] | null;
  additional_locations: string[] | null;
  man_hours: number | null;
  hourly_rate: number | null;
  labor_type: string | null;
  labor_flat_price: number | null;
  needs_materials: boolean | null;
  material_description: string | null;
  needs_machinery: boolean | null;
  machinery_type: string | null;
  machinery_hours: number | null;
  machinery_rate: number | null;
  duration_value: number | null;
  duration_unit: string | null;
  has_schedule_impact: boolean | null;
  schedule_impact_notes: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { changeOrderId } = await req.json();
    console.log('Generating PDF for change order:', changeOrderId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with user's JWT to verify access
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user has access to this change order via RLS
    const { data: accessCheck, error: accessError } = await userSupabase
      .from("change_orders")
      .select("id")
      .eq("id", changeOrderId)
      .single();

    if (accessError || !accessCheck) {
      console.error("Access denied for change order:", changeOrderId);
      return new Response(
        JSON.stringify({ error: "Unauthorized - you do not have access to this change order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now use service role to fetch full data for PDF generation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch change order with project details
    const { data: changeOrder, error: coError } = await supabase
      .from('change_orders')
      .select('*')
      .eq('id', changeOrderId)
      .single();

    if (coError || !changeOrder) {
      console.error('Error fetching change order:', coError);
      throw new Error('Change order not found');
    }

    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('name, address')
      .eq('id', changeOrder.project_id)
      .single();

    if (projError || !project) {
      console.error('Error fetching project:', projError);
      throw new Error('Project not found');
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const reasonLabels: Record<string, string> = {
      owner_request: 'Owner Request',
      blueprint_change: 'Blueprint Change',
      spec_change: 'Specification Change',
      damage_by_others: 'Damage by Others',
      design_conflict: 'Design Conflict',
      scope_gap: 'Scope Gap',
      safety_issue: 'Safety Issue',
      plan_change: 'Plan Change',
      damage: 'Damage',
      conflict: 'Conflict',
      other: 'Other',
    };

    const workScopeLabels: Record<string, string> = {
      framing: 'Framing',
      siding: 'Siding',
      balconies: 'Balconies',
      stair_building: 'Stair Building',
      fascia_soffit: 'Fascia & Soffit',
      window_installation: 'Window Installation',
      patio_door_installation: 'Patio Door Installation',
      roofing: 'Roofing',
      drywall: 'Drywall',
      painting: 'Painting',
      flooring: 'Flooring',
      other: 'Other',
    };

    // Header - Title
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANGE ORDER', margin, 25);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const statusText = changeOrder.status.toUpperCase();
    doc.text(`Status: ${statusText}`, pageWidth - margin - 50, 25);

    yPos = 55;

    // Project Info Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT INFORMATION', margin, yPos);
    
    yPos += 8;
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(2);
    doc.line(margin, yPos, margin + 60, yPos);
    
    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Project Name:', margin, yPos);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(project.name, margin + 40, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Address:', margin, yPos);
    doc.setTextColor(30, 41, 59);
    doc.text(project.address, margin + 40, yPos);
    
    yPos += 8;
    doc.setTextColor(71, 85, 105);
    doc.text('Date:', margin, yPos);
    doc.setTextColor(30, 41, 59);
    doc.text(formatDate(changeOrder.created_at), margin + 40, yPos);

    yPos += 20;

    // Location & Reason Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANGE ORDER DETAILS', margin, yPos);
    
    yPos += 8;
    doc.setDrawColor(217, 119, 6);
    doc.line(margin, yPos, margin + 70, yPos);
    
    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Location:', margin, yPos);
    doc.setTextColor(30, 41, 59);
    doc.text(changeOrder.location, margin + 35, yPos);

    // Additional Locations
    if (changeOrder.additional_locations && changeOrder.additional_locations.length > 0) {
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Additional:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      const additionalText = changeOrder.additional_locations.join(', ');
      const splitAdditional = doc.splitTextToSize(additionalText, pageWidth - margin * 2 - 35);
      doc.text(splitAdditional, margin + 35, yPos);
      yPos += (splitAdditional.length - 1) * 6;
    }
    
    yPos += 8;
    doc.setTextColor(71, 85, 105);
    doc.text('Reason:', margin, yPos);
    doc.setTextColor(30, 41, 59);
    doc.text(reasonLabels[changeOrder.reason] || changeOrder.reason, margin + 35, yPos);

    // Work Scopes
    if (changeOrder.work_scopes && changeOrder.work_scopes.length > 0) {
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Work Scopes:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      const scopeText = changeOrder.work_scopes.map((s: string) => workScopeLabels[s] || s).join(', ');
      const splitScopes = doc.splitTextToSize(scopeText, pageWidth - margin * 2 - 35);
      doc.text(splitScopes, margin + 35, yPos);
      yPos += (splitScopes.length - 1) * 6;
    }

    // Description
    if (changeOrder.description) {
      yPos += 12;
      doc.setTextColor(71, 85, 105);
      doc.text('Description:', margin, yPos);
      yPos += 6;
      doc.setTextColor(30, 41, 59);
      const splitDesc = doc.splitTextToSize(changeOrder.description, pageWidth - margin * 2);
      doc.text(splitDesc, margin, yPos);
      yPos += splitDesc.length * 6;
    }

    yPos += 15;

    // Labor Section
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LABOR', margin, yPos);
    
    yPos += 8;
    doc.setDrawColor(217, 119, 6);
    doc.line(margin, yPos, margin + 25, yPos);
    
    yPos += 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    if (changeOrder.pricing_type === 'lump_sum') {
      doc.setTextColor(71, 85, 105);
      doc.text('Type:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.text('Lump Sum', margin + 35, yPos);
      
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Amount:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(changeOrder.lump_sum_amount || 0), margin + 35, yPos);
    } else {
      if (changeOrder.labor_type === 'flat') {
        doc.setTextColor(71, 85, 105);
        doc.text('Flat Price:', margin, yPos);
        doc.setTextColor(30, 41, 59);
        doc.text(formatCurrency(changeOrder.labor_flat_price || 0), margin + 35, yPos);
      } else {
        doc.setTextColor(71, 85, 105);
        doc.text('Man Hours:', margin, yPos);
        doc.setTextColor(30, 41, 59);
        doc.text(String(changeOrder.man_hours || 0), margin + 35, yPos);
        
        yPos += 8;
        doc.setTextColor(71, 85, 105);
        doc.text('Hourly Rate:', margin, yPos);
        doc.setTextColor(30, 41, 59);
        doc.text(formatCurrency(changeOrder.hourly_rate || 0), margin + 35, yPos);
      }
      
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Labor Total:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(changeOrder.labor_cost || 0), margin + 35, yPos);
    }

    yPos += 15;

    // Materials Section
    if (changeOrder.needs_materials) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MATERIALS', margin, yPos);
      
      yPos += 8;
      doc.setDrawColor(217, 119, 6);
      doc.line(margin, yPos, margin + 35, yPos);
      
      yPos += 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (changeOrder.material_description) {
        doc.setTextColor(71, 85, 105);
        doc.text('Description:', margin, yPos);
        doc.setTextColor(30, 41, 59);
        const splitMatDesc = doc.splitTextToSize(changeOrder.material_description, pageWidth - margin * 2 - 35);
        doc.text(splitMatDesc, margin + 35, yPos);
        yPos += splitMatDesc.length * 6 + 2;
      }
      
      doc.setTextColor(71, 85, 105);
      doc.text('Cost:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(changeOrder.materials_cost || 0), margin + 35, yPos);
      
      yPos += 15;
    }

    // Machinery Section
    if (changeOrder.needs_machinery) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MACHINERY / EQUIPMENT', margin, yPos);
      
      yPos += 8;
      doc.setDrawColor(217, 119, 6);
      doc.line(margin, yPos, margin + 70, yPos);
      
      yPos += 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (changeOrder.machinery_type) {
        doc.setTextColor(71, 85, 105);
        doc.text('Type:', margin, yPos);
        doc.setTextColor(30, 41, 59);
        doc.text(changeOrder.machinery_type, margin + 35, yPos);
        yPos += 8;
      }
      
      doc.setTextColor(71, 85, 105);
      doc.text('Hours:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.text(String(changeOrder.machinery_hours || 0), margin + 35, yPos);
      
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Rate:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.text(formatCurrency(changeOrder.machinery_rate || 0) + '/hr', margin + 35, yPos);
      
      yPos += 8;
      doc.setTextColor(71, 85, 105);
      doc.text('Total:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(changeOrder.equipment_cost || 0), margin + 35, yPos);
      
      yPos += 15;
    }

    // Duration Section
    if (changeOrder.duration_value && changeOrder.duration_value > 0) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DURATION & SCHEDULE', margin, yPos);
      
      yPos += 8;
      doc.setDrawColor(217, 119, 6);
      doc.line(margin, yPos, margin + 65, yPos);
      
      yPos += 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      doc.setTextColor(71, 85, 105);
      doc.text('Duration:', margin, yPos);
      doc.setTextColor(30, 41, 59);
      doc.text(`${changeOrder.duration_value} ${changeOrder.duration_unit || 'days'}`, margin + 35, yPos);
      
      if (changeOrder.has_schedule_impact) {
        yPos += 8;
        doc.setTextColor(220, 38, 38); // red-600
        doc.setFont('helvetica', 'bold');
        doc.text('⚠ Schedule Impact', margin, yPos);
        
        if (changeOrder.schedule_impact_notes) {
          yPos += 8;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          const splitImpact = doc.splitTextToSize(changeOrder.schedule_impact_notes, pageWidth - margin * 2);
          doc.text(splitImpact, margin, yPos);
          yPos += splitImpact.length * 6;
        }
      }
      
      yPos += 15;
    }

    // Total Amount Box
    doc.setFillColor(251, 191, 36); // amber-400
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 30, 3, 3, 'F');
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT', margin + 10, yPos + 12);
    
    doc.setFontSize(20);
    doc.text(formatCurrency(changeOrder.total_amount), pageWidth - margin - 10 - doc.getTextWidth(formatCurrency(changeOrder.total_amount)), yPos + 20);

    yPos += 45;

    // Signature Lines
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    
    // Contractor Signature
    doc.line(margin, yPos + 20, margin + 70, yPos + 20);
    doc.text('Contractor Signature', margin, yPos + 28);
    doc.text('Date: _______________', margin, yPos + 36);
    
    // Owner Signature
    doc.line(pageWidth - margin - 70, yPos + 20, pageWidth - margin, yPos + 20);
    doc.text('Owner/GC Signature', pageWidth - margin - 70, yPos + 28);
    doc.text('Date: _______________', pageWidth - margin - 70, yPos + 36);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY);
    doc.text('Page 1 of 1', pageWidth - margin - 20, footerY);

    // Convert to base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    const filename = `change-order-${changeOrder.location.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;

    console.log('PDF generated successfully');

    return new Response(
      JSON.stringify({ pdf: pdfBase64, filename }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
