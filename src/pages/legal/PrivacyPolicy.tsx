import { LegalLayout } from './LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Ontime.Build collects, uses, stores, and protects information across the multi-party construction operations platform."
      path="/privacy"
      updated="May 21, 2026"
    >
      <p>
        This Privacy Policy explains how Ontime.Build ("Ontime", "we", "us") collects, uses, and protects information when you use our construction operations platform connecting General Contractors, Trade Contractors, Field Crews, and Suppliers.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email, phone, organization, role, and profile details you provide.</li>
        <li><strong>Project data:</strong> schedules, scopes of work, invoices, change orders, purchase orders, photos, and related documents you upload or generate.</li>
        <li><strong>Usage data:</strong> log data, device info, IP address, and product analytics used to operate and improve the service.</li>
        <li><strong>Communications:</strong> messages you send to support or other users on the platform.</li>
      </ul>

      <h2>2. How we use information</h2>
      <ul>
        <li>Provide, maintain, and improve the platform and its features.</li>
        <li>Enforce role-based access between General Contractors, Trade Contractors, Field Crews, and Suppliers.</li>
        <li>Send transactional notifications (invoice approvals, change order routing, RFI updates).</li>
        <li>Detect, investigate, and prevent fraud, abuse, or security incidents.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2>3. Multi-party privacy model</h2>
      <p>
        Ontime is designed around a strict privacy hierarchy. By default:
      </p>
      <ul>
        <li>General Contractors cannot see Trade Contractor labor margins.</li>
        <li>Trade Contractors cannot see Supplier pricing when materials are procured by the GC.</li>
        <li>Field Crews see only the work assigned to them and their own time and expenses.</li>
      </ul>
      <p>
        These rules are enforced at the database layer through Row-Level Security policies, not only in the UI.
      </p>

      <h2>4. Sharing information</h2>
      <p>
        We do not sell personal information. We share data only:
      </p>
      <ul>
        <li>With other participants on a project, as required by your role and the project's configuration.</li>
        <li>With service providers that host infrastructure, send email, or process payments under contract.</li>
        <li>When required by law or to protect rights, safety, and the integrity of the platform.</li>
      </ul>

      <h2>5. Data retention</h2>
      <p>
        Project records (invoices, change orders, contracts, exports) are retained while your organization remains active and for a reasonable period afterward to satisfy legal, accounting, and audit requirements. You may request deletion of personal account data subject to those obligations.
      </p>

      <h2>6. Your choices</h2>
      <ul>
        <li>Access, update, or correct your profile from account settings.</li>
        <li>Request export or deletion of your personal data by contacting us.</li>
        <li>Unsubscribe from non-essential email notifications via your notification preferences.</li>
      </ul>

      <h2>7. Security</h2>
      <p>
        We use encryption in transit, private storage buckets with signed URLs, and database-level access controls. See our <a href="/security">Security</a> page for details.
      </p>

      <h2>8. Children</h2>
      <p>
        Ontime is a business product and is not directed to children under 16. We do not knowingly collect personal information from children.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be communicated by email or in-product notice.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy? Email <a href="mailto:hello@ontime.build">hello@ontime.build</a>.
      </p>
    </LegalLayout>
  );
}
