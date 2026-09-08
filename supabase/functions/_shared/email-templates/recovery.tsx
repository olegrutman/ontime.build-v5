/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandFooter, Masthead } from './branding.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Masthead heading="Reset your password" />
        <Section style={content}>
          <Text style={text}>
            We received a request to reset your password for {siteName}. Click
            the button below to choose a new password.
          </Text>
          <Button className="dm-btn" style={button} href={confirmationUrl}>
            Reset Password
          </Button>
          <Text style={footer}>
            If you didn't request a password reset, you can safely ignore this
            email. Your password will not be changed.
          </Text>
        </Section>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#f1f5f9', padding: '24px 0', fontFamily: "'DM Sans', -apple-system, Segoe UI, Helvetica, Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' as const }
const content = { padding: '24px' }
const text = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#f97316',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #f97316',
  borderRadius: '10px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#64748b', margin: '26px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #f97316 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #f97316 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #f97316 !important; color: #ffffff !important; }
`
