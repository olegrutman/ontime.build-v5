import { LegalLayout } from './LegalLayout';

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="The terms governing use of the Ontime.Build construction operations platform by contractors, trade partners, field crews, and suppliers."
      path="/terms"
      updated="May 21, 2026"
    >
      <p>
        These Terms of Service ("Terms") govern your access to and use of the Ontime.Build platform ("Service"). By creating an account or using the Service, you agree to these Terms on behalf of yourself and your organization.
      </p>

      <h2>1. Accounts and organizations</h2>
      <p>
        You must provide accurate information when creating an account. Each user belongs to one or more organizations (General Contractor, Trade Contractor, Field Crew, or Supplier). The organization owner is responsible for managing members, roles, and project access.
      </p>

      <h2>2. Acceptable use</h2>
      <ul>
        <li>Do not attempt to bypass role-based access controls or view data outside your role.</li>
        <li>Do not upload unlawful, infringing, or malicious content.</li>
        <li>Do not interfere with the Service or attempt to access it by means other than the provided interfaces.</li>
        <li>Do not use the Service to harass, defraud, or harm other users or organizations.</li>
      </ul>

      <h2>3. Subscriptions and fees</h2>
      <p>
        Paid plans are billed in advance on a monthly or annual basis. Fees are non-refundable except where required by law. We may change pricing with at least 30 days' notice for renewals.
      </p>

      <h2>4. Customer data</h2>
      <p>
        You retain all rights to data you upload (projects, scopes, invoices, change orders, documents, photos). You grant Ontime a limited license to host, process, and display that data solely to operate the Service for you and other authorized participants on your projects.
      </p>

      <h2>5. Financial records</h2>
      <p>
        Ontime helps you organize contracts, schedules of values, invoices, and change orders. We are not a party to any contract between you and other users, do not provide accounting, legal, or tax advice, and are not responsible for the financial outcomes of work performed.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        The Service may integrate with third-party providers (email delivery, file storage, AI providers). Your use of those integrations is subject to their respective terms.
      </p>

      <h2>7. Suspension and termination</h2>
      <p>
        We may suspend or terminate access for violation of these Terms, non-payment, or activity that risks the security or integrity of the Service. You may cancel at any time from account settings.
      </p>

      <h2>8. Warranty disclaimer</h2>
      <p>
        The Service is provided "as is" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Ontime's aggregate liability arising from or related to the Service will not exceed the fees you paid to Ontime in the 12 months preceding the claim. Ontime is not liable for indirect, incidental, or consequential damages.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-laws principles. Disputes shall be resolved in the state or federal courts located in Delaware.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated by email or in-product notice. Continued use of the Service after changes take effect constitutes acceptance.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions? Email <a href="mailto:hello@ontime.build">hello@ontime.build</a>.
      </p>
    </LegalLayout>
  );
}
