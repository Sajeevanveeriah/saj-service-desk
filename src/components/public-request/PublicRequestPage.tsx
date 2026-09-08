'use client';

import Image from 'next/image';
import { useState, type FormEvent } from 'react';

const requestUrl = 'https://sajeevanveeriah.github.io/saj-service-desk/request/';
const requestEmail = 'sajeevanveeriah@gmail.com';
const qrFilename = '20260909-Saj-Service-Desk-Request-QR-Rev00.png';
const siteBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? '';

interface RequestDetails {
  category: string;
  description: string;
  preference: string;
  urgency: string;
  name: string;
  email: string;
  phone: string;
}

export const buildRequestEmail = (details: RequestDetails): { href: string; body: string } => {
  const body = [
    'Saj Service Desk - new service request',
    '',
    `Name: ${details.name}`,
    `Email: ${details.email}`,
    `Phone: ${details.phone || 'Not supplied'}`,
    `Service category: ${details.category}`,
    `Support preference: ${details.preference}`,
    `Urgency: ${details.urgency}`,
    '',
    'Problem description:',
    details.description,
    '',
    'Attachments: Add any relevant files to this email before sending.',
  ].join('\r\n');
  const subject = `Service request - ${details.category} - ${details.name}`;
  return {
    body,
    href: `mailto:${requestEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
};

export function PublicRequestPage() {
  const [prepared, setPrepared] = useState<{ href: string; body: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState('');

  const prepareRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (name: string) => String(values.get(name) ?? '').trim();
    setPrepared(buildRequestEmail({
      category: text('category'),
      description: text('description'),
      preference: text('preference'),
      urgency: text('urgency'),
      name: text('name'),
      email: text('email'),
      phone: text('phone'),
    }));
  };

  const copyText = async (value: string, success: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(success);
    } catch {
      setCopyStatus('Copy was blocked. Select the visible text and copy it manually.');
    }
  };

  return (
    <main className="public-request-page" id="main-content">
      <a className="skip-link" href="#request-form">Skip to request form</a>
      <section className="public-request-intro" aria-labelledby="request-heading">
        <div className="public-brand"><span aria-hidden="true">SV</span><strong>Saj Service Desk</strong></div>
        <p className="eyebrow">Technical service requests</p>
        <h1 id="request-heading">Tell Saj what needs attention.</h1>
        <p className="public-lead">Computers, networks, websites, software, AI workflows, automation, robotics, electronics and prototyping.</p>
        <div className="public-steps" aria-label="How this works">
          <p><strong>1.</strong> Complete the form.</p>
          <p><strong>2.</strong> Prepare an email draft.</p>
          <p><strong>3.</strong> Review and send it from your email app.</p>
        </div>
        <aside className="qr-panel" aria-labelledby="qr-heading">
          <Image
            src={`${siteBasePath}/${qrFilename}`}
            width={512}
            height={512}
            alt="QR code for the Saj Service Desk public request form"
            priority
          />
          <div>
            <h2 id="qr-heading">Share this request form</h2>
            <p>Scan the QR code or copy the public link.</p>
            <p className="public-url">{requestUrl}</p>
            <div className="actions">
              <button className="button secondary" type="button" onClick={() => copyText(requestUrl, 'Public link copied.')}>Copy link</button>
              <a className="button secondary" href={`${siteBasePath}/${qrFilename}`} download={qrFilename}>Download QR</a>
            </div>
          </div>
        </aside>
      </section>

      <section className="public-request-form-card" aria-labelledby="form-heading">
        <p className="eyebrow">Request details</p>
        <h2 id="form-heading">What can Saj help with?</h2>
        <p className="form-note">No account or database is used. Preparing this request does not send it. Your email app opens only after you choose the email link.</p>
        <form id="request-form" onSubmit={prepareRequest}>
          <div className="form-grid">
            <label>Service category
              <select name="category" required defaultValue="">
                <option value="" disabled>Choose a category</option>
                <option>Computers and networks</option>
                <option>Websites and software</option>
                <option>AI workflows and automation</option>
                <option>Robotics, electronics and prototyping</option>
                <option>Other technical service</option>
              </select>
            </label>
            <label>Support preference
              <select name="preference" required defaultValue="">
                <option value="" disabled>Choose one</option>
                <option>Remote</option>
                <option>On-site</option>
                <option>Either</option>
              </select>
            </label>
            <label>Urgency
              <select name="urgency" required defaultValue="Normal">
                <option>Low</option>
                <option>Normal</option>
                <option>High - work is blocked</option>
                <option>Critical - safety issue or major outage</option>
              </select>
            </label>
            <label>Your name<input name="name" required autoComplete="name" maxLength={200} /></label>
            <label>Email address<input name="email" type="email" required autoComplete="email" maxLength={254} /></label>
            <label>Phone number (optional)<input name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
            <label className="full">Describe the problem
              <textarea name="description" required minLength={10} maxLength={1200} placeholder="What happened, what have you tried, and what outcome would help?" />
              <span className="muted small">10 to 1,200 characters. Do not include passwords, payment card details or device login credentials.</span>
            </label>
          </div>
          <button className="button prepare-button" type="submit">Prepare email request</button>
        </form>

        {prepared && (
          <section className="prepared-request" aria-labelledby="prepared-heading">
            <h3 id="prepared-heading">Your request is ready</h3>
            <p>Choose <strong>Open email draft</strong>, add any attachments, review the details and press Send in your email app.</p>
            <div className="actions">
              <a className="button" href={prepared.href}>Open email draft</a>
              <button className="button secondary" type="button" onClick={() => copyText(prepared.body, 'Request details copied.')}>Copy request details</button>
            </div>
            <p className="small muted">If no email app opens, copy the details and email them to {requestEmail}.</p>
          </section>
        )}
        <p className="copy-status" role="status" aria-live="polite">{copyStatus}</p>
      </section>
    </main>
  );
}
