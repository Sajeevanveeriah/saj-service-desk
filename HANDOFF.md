# saj-service-desk handoff

Maintain the service desk for requests, jobs, quotes, invoices, payments and attachments.

## Work at 5 November 2026

Source baseline: [main at 68bc857a](https://github.com/Sajeevanveeriah/saj-service-desk/commit/68bc857a1b839d03bf733340e687c308ccfa6ae4). Use the linked revision to distinguish these changes from later work.

- Security fixes: patched dependencies, trusted rate-limit IP, sign-up off (#4) ([68bc857a](https://github.com/Sajeevanveeriah/saj-service-desk/commit/68bc857a1b839d03bf733340e687c308ccfa6ae4), 26 Oct 2026).
- Update the portfolio reference in the README (#3) ([7e1e55bf](https://github.com/Sajeevanveeriah/saj-service-desk/commit/7e1e55bf583f93c1b61515681e9d28369ead3341), 21 Sep 2026).

## Resume here

Trace changes across authentication, tenant data and payment callbacks. Use isolated fixtures for verification and avoid issuing real invoices or messages.

1 open pull request at the baseline. Recent work: [#5](https://github.com/Sajeevanveeriah/saj-service-desk/pull/5) Bump @better-auth/drizzle-adapter and better-auth. [Current list](https://github.com/Sajeevanveeriah/saj-service-desk/pulls).

## Files and checks

[README.md](README.md), [docs/workflow-diagram.md](docs/workflow-diagram.md), [package.json](package.json).

Local commands declared in [package.json](package.json): `npm run typecheck`, `npm run lint`, `npm run test:unit`. Record the command and result against the revision tested.

Start with [.github/workflows/ci.yml](.github/workflows/ci.yml) for hosted check definitions. Confirm the run belongs to the commit under review.

At the source revision, GitHub reported success across 6 check or status entries. [View checks](https://github.com/Sajeevanveeriah/saj-service-desk/commit/68bc857a1b839d03bf733340e687c308ccfa6ae4/checks).

## Next handoff

When pausing, replace the dated snapshot with the active branch or revision, what changed, the checks actually run and their results, and the first unfinished action. Record any blocker or decision the next person needs. Keep private data and credentials out of this file.
