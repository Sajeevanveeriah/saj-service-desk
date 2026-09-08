# Saj Service Desk visual specification

## Intent

Saj Service Desk is a calm operational workbench for an Australian technical-services sole trader. The interface keeps the next decision visible: what needs attention, what a customer can see, and which financial actions are guarded.

## Visual language

- Light-first canvas (`#f4f7f8`) with white work surfaces and a dark navy navigation rail.
- Blue is reserved for actionable links and active work; amber marks an explicit hold (such as unconfirmed GST); green marks a recorded success, not an estimate.
- Bahnschrift SemiCondensed gives headings and data labels a technical-instrument character; Aptos carries longer operational text with generous line-height. Corners stay within 6-9 px and shadows remain restrained.
- Dense tables for queue work; cards are used only to group a decision or workflow, never as decorative metrics.
- Copy uses en-AU dates, AUD amounts, and plain Australian business language. No invented rates, guarantees, qualifications or contact details.

## Responsive and accessibility rules

At 900px the rail becomes a horizontal navigation strip; at 560px forms become one column and actions wrap. The skip link is available on every view, the current navigation item uses `aria-current`, controls have visible labels, and focus uses a high-contrast amber outline. Motion is reduced with `prefers-reduced-motion`. Tables remain horizontally scrollable rather than collapsing away information.

## State inventory

The UI demonstrates dashboard attention, filtered and reset job queues, job history, guarded draft invoice issuance, quote preview, public-form validation, persisted success and visible server failure, setup incomplete state, disconnected PayPal health, and customer portal document boundaries. Sample operational records remain deterministic and are labelled as demonstration data; the public request form is connected to its durable PostgreSQL route.
