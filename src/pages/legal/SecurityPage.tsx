import { LegalLayout } from './LegalLayout';

export default function SecurityPage() {
  return (
    <LegalLayout
      title="Security"
      description="How Ontime.Build protects multi-party construction data with database-level access controls, encryption, and private storage."
      path="/security"
      updated="May 21, 2026"
    >
      <p>
        Ontime.Build connects multiple organizations on the same project — General Contractors, Trade Contractors, Field Crews, and Suppliers. Keeping each party's data private from every other party is a core requirement, not an afterthought. This page describes how we do it.
      </p>

      <h2>1. Row-Level Security on every table</h2>
      <p>
        Every database table is gated by Row-Level Security (RLS) policies. Access is resolved against the authoritative <code>project_participants</code> table through a security-definer helper that prevents recursion and cross-org leakage. Nothing is returned to the client without first being filtered at the database layer.
      </p>

      <h2>2. Multi-party privacy by default</h2>
      <ul>
        <li><strong>GCs don't see TC labor margins.</strong> Trade Contractor cost breakdowns and labor markup are invisible to the GC by default. Per-project markup disclosure can be set to hidden, summary, or detailed.</li>
        <li><strong>TCs don't see supplier pricing when the GC procures materials.</strong> Supplier estimates and PO pricing are masked from downstream Trade Contractors.</li>
        <li><strong>Field Crews see only their assigned work.</strong> Their dashboards never expose upstream contract values or supplier negotiations.</li>
      </ul>

      <h2>3. Authentication</h2>
      <ul>
        <li>Email and password authentication with leaked-password protection (HIBP) enabled.</li>
        <li>Google OAuth supported.</li>
        <li>Email verification required before sign-in.</li>
        <li>Session tokens stored in secure, HTTP-only contexts managed by our auth provider.</li>
      </ul>

      <h2>4. Private storage</h2>
      <p>
        Field photos, change orders, invoices, exports, and other attachments live in private storage buckets. Files are served only through short-lived signed URLs scoped to the requesting organization. There are no public links unless you explicitly publish.
      </p>

      <h2>5. Encryption</h2>
      <ul>
        <li>TLS 1.2+ for all traffic in transit.</li>
        <li>Encryption at rest for the database and storage layer.</li>
        <li>Secrets and API keys managed in a dedicated secret store and never exposed to the client.</li>
      </ul>

      <h2>6. Operational security</h2>
      <ul>
        <li>Principle of least privilege for staff access.</li>
        <li>Audit logging on sensitive operations (impersonation, role changes, contract edits).</li>
        <li>Automated security scanning on schema and policy changes.</li>
      </ul>

      <h2>7. Reporting a vulnerability</h2>
      <p>
        If you believe you've found a security issue, please email <a href="mailto:security@ontime.build">security@ontime.build</a> with a description and steps to reproduce. We'll acknowledge within two business days and keep you updated as we investigate.
      </p>

      <h2>8. Related documents</h2>
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
      </ul>
    </LegalLayout>
  );
}
