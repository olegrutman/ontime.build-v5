# Company-branded invoice PDF

## Outcome
Replace the simplified Ontime.Build invoice PDF with the established construction invoice format, branded by the company sending the invoice.

## Changes
- Resolve the sending company from the invoice contract and use its logo, name, address, phone, and email where available.
- Match the existing invoice layout: project and billing-period panels, sender/recipient details, full Schedule of Values columns, billing totals, and authorization areas.
- Remove visible Ontime.Build branding. If no company logo exists, use a clean company-name treatment.
- Generate the PDF after the invoice is submitted so its final status and submission date are accurate.
- Keep the existing private storage and 14-day shareable download link used by email notifications.

## Verification
- Compare the result visually against the uploaded existing invoice.
- Check one-line and multi-page invoices, retainage, long names, and missing company details.
- Send one real test email after confirming the requested recipient address.

## Technical details
- Update the existing invoice PDF function rather than creating a second document path.
- Reuse organization and project data already stored in Lovable Cloud.
- Redeploy the PDF and notification functions, then confirm the email delivery record.
