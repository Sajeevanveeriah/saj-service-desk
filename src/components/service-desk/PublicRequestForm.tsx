'use client';

import { useState, type FormEvent } from 'react';

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; reference: string };

interface PublicRequestFormProps {
  onOwnerView: () => void;
}

export function PublicRequestForm({ onOwnerView }: PublicRequestFormProps) {
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });
  const isStaticPreview = process.env.NEXT_PUBLIC_STATIC_DEMO === 'true';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isStaticPreview) {
      setState({ kind: 'error', message: 'This GitHub Pages preview is read-only. Run the server application to save a request.' });
      return;
    }
    const form = event.currentTarget;
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        body: new FormData(form),
      });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !result.reference) {
        setState({ kind: 'error', message: result.error ?? 'The request could not be saved. Try again.' });
        return;
      }
      form.reset();
      setState({ kind: 'success', reference: result.reference });
    } catch {
      setState({ kind: 'error', message: 'The service is not reachable. Check your connection and try again.' });
    }
  };

  if (state.kind === 'success') {
    return (
      <section className="card" aria-labelledby="request-success-heading">
        <div className="status green">Request received</div>
        <h2 id="request-success-heading" style={{ marginTop: '1rem' }}>Thanks, your request is in the queue.</h2>
        <p>Reference <strong>{state.reference}</strong>. Keep this reference for follow-up. We will reply to the email address you provided.</p>
        <button className="button" type="button" onClick={() => setState({ kind: 'idle' })}>Submit another request</button>
      </section>
    );
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">Public intake</div>
          <h1>Tell us what needs attention</h1>
          <p className="muted">A request reference is created after the record is saved. We use your details only to respond to this request.</p>
        </div>
        <div className="actions"><button className="button secondary" type="button" onClick={onOwnerView}>Owner view</button></div>
      </div>
      {state.kind === 'error' && <div className="notice warning" role="alert"><strong>Request not saved.</strong> {state.message}</div>}
      <section className="card">
        <form onSubmit={submit} aria-busy={state.kind === 'loading'}>
          <div className="form-grid">
            <label>What do you need help with?
              <select name="category" required defaultValue="">
                <option value="" disabled>Select a service category</option>
                <option>Computers and networks</option>
                <option>Websites and software</option>
                <option>AI workflows and automation</option>
                <option>Robotics, electronics and prototyping</option>
              </select>
            </label>
            <label>Preferred support
              <select name="preference" required defaultValue="">
                <option value="" disabled>Choose one</option>
                <option value="remote">Remote</option>
                <option value="on_site">On-site</option>
                <option value="either">Either</option>
              </select>
            </label>
            <label className="full">Describe the problem
              <textarea name="description" required minLength={10} placeholder="What happened, what have you tried, and what outcome would help?" />
            </label>
            <label>Urgency
              <select name="urgency" required defaultValue="normal">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High - work is blocked</option>
                <option value="critical">Critical - safety or major outage</option>
              </select>
            </label>
            <label>Your name<input name="name" required autoComplete="name" /></label>
            <label>Email address<input name="email" required type="email" autoComplete="email" /></label>
            <label>Phone (optional)<input name="phone" type="tel" autoComplete="tel" /></label>
            <label className="full">Attachment (optional)
              <input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" />
              <span className="muted small">PDF, PNG, JPG or plain text up to 10 MB. Executable content is rejected.</span>
            </label>
          </div>
          <div className="actions" style={{ marginTop: '1rem' }}>
            <button className="button" type="submit" disabled={state.kind === 'loading'}>
              {state.kind === 'loading' ? 'Saving request…' : 'Send request'}
            </button>
            <span className="muted small">You will receive a reference, not an account invitation.</span>
          </div>
        </form>
      </section>
    </>
  );
}
