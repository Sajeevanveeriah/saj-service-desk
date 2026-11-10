@AGENTS.md

## Verify

Run these from the project root before calling a change done. They are the scripts package.json defines.

- Test: `npm test` (runs `vitest run`)
- Typecheck: `npm run typecheck` (runs `tsc --noEmit`)
- Lint: `npm run lint` (runs `eslint . --max-warnings=0`)
- Build: `npm run build` (runs `next build`)
- End-to-end test: `npm run test:e2e` (runs `playwright test`)
