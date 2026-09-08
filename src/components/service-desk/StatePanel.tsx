import type { ServiceDeskState } from './types';

export function StatePanel({ state, onRetry, onSignIn }: { state: ServiceDeskState; onRetry?: () => void; onSignIn?: () => void }) {
  const copy = { loading: ['Loading saved records', 'Fetching from the service desk API...'], empty: ['Nothing here yet', 'When a matching record exists, it will appear here.'], error: ['We could not load this view', 'The API returned an error. Your saved records were not changed.'], success: ['Saved successfully', 'The server confirmed this change.'], expired: ['Your session expired', 'Sign in again to continue. Your draft has not been sent.'] }[state];
  return <section className={`state-panel state-${state}`} role={state === 'error' || state === 'expired' ? 'alert' : 'status'} aria-live="polite"><h2>{copy[0]}</h2><p>{copy[1]}</p>{state === 'error' && onRetry && <button className="button secondary" onClick={onRetry}>Try again</button>}{state === 'expired' && onSignIn && <button className="button" onClick={onSignIn}>Sign in</button>}</section>;
}
