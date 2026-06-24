import { supabase } from '@/integrations/supabase/client';

export type NotificationType = 
  | 'project_invite' 
  | 'invoice_submitted' 
  | 'invoice_approved' 
  | 'invoice_rejected' 
  | 'change_order_submitted' 
  | 'change_order_approved' 
  | 'change_order_rejected'
  | 'change_order_pdf';

interface SendNotificationParams {
  type: NotificationType;
  recipientEmail: string;
  projectName: string;
  projectId?: string;
  invoiceNumber?: number;
  changeOrderLocation?: string;
  amount?: number;
  rejectionReason?: string;
  senderName?: string;
  pdfBase64?: string;
  pdfFilename?: string;
}

export const sendNotificationEmail = async (params: SendNotificationParams): Promise<boolean> => {
  try {
    console.log('Sending notification email:', params.type, 'to', params.recipientEmail);
    
    const { data, error } = await supabase.functions.invoke('send-notification-email', {
      body: params
    });

    if (error) {
      console.error('Error sending notification email:', error);
      return false;
    }

    console.log('Notification email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return false;
  }
};

export const useNotificationEmail = () => {
  return { sendNotificationEmail };
};
