/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandFooter, Masthead } from './branding.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Masthead heading="Confirm reauthentication" />
        <Section style={content}>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code will expire shortly. If you didn't request this, you can
            safely ignore this email.
          </Text>
        </Section>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f1f5f9', padding: '24px 0', fontFamily: "'DM Sans', -apple-system, Segoe UI, Helvetica, Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' as const }
const content = { padding: '24px' }
const text = {
  fontSize: '14px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const codeStyle = {
  fontFamily: "'IBM Plex Mono', Courier, monospace",
  fontSize: '30px',
  letterSpacing: '6px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 18px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '20px 0 0' }
