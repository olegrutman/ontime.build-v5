/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Img, Section, Text } from 'npm:@react-email/components@0.0.22'

export const LOGO_URL = 'https://ontime.build/ontime-logo-email.png'

export const brandColors = {
  navy: '#0f172a',
  orange: '#f97316',
  body: '#475569',
  muted: '#64748b',
  border: '#e2e8f0',
}

export const Masthead = ({ heading }: { heading: string }) => (
  <Section style={masthead}>
    <table role="presentation" cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td style={{ paddingRight: '10px' }} valign="middle">
            <Img
              src={LOGO_URL}
              width="34"
              height="34"
              alt="Ontime.Build"
              style={{ display: 'block', border: 0, width: '34px', height: '34px' }}
            />
          </td>
          <td valign="middle">
            <span style={wordmark}>
              Ontime<span style={{ color: brandColors.orange }}>.Build</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <div style={rule} />
    <Text style={mastheadHeading}>{heading}</Text>
  </Section>
)

export const BrandFooter = () => (
  <Section style={footerSection}>
    <Text style={footerText}>
      Ontime.Build — construction project, change order and billing management.
    </Text>
  </Section>
)

const masthead = {
  backgroundColor: brandColors.navy,
  padding: '20px 24px',
  borderRadius: '12px 12px 0 0',
}
const wordmark = {
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 700 as const,
  letterSpacing: '0.3px',
}
const rule = {
  height: '2px',
  width: '52px',
  backgroundColor: brandColors.orange,
  margin: '16px 0 10px',
}
const mastheadHeading = {
  color: '#ffffff',
  fontSize: '19px',
  fontWeight: 700 as const,
  margin: 0,
}
const footerSection = {
  backgroundColor: '#f8fafc',
  borderTop: `1px solid ${brandColors.border}`,
  padding: '14px 24px',
  borderRadius: '0 0 12px 12px',
}
const footerText = {
  color: brandColors.muted,
  fontSize: '11px',
  lineHeight: '1.5',
  margin: 0,
}
