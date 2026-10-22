<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

GitHub Issues on `YoussefSanad/theworldtarot-frontend`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, label strings unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Verification

- Unit tests: `npm test` (Node's built-in runner, `src/**/*.test.ts`). One file: `node --test --experimental-strip-types --import=./scripts/test-register.mjs src/path/file.test.ts`
- Lint: `npm run lint`
- Browser checks: `npm run build && npm run check:<name>`. Each `scripts/check-*.mjs` serves `out/` and fakes the API itself, so none needs staging or a real customer. Use these to verify layout and flow criteria that unit tests cannot see.
- Plans live in `docs/plans/`. The API contract is owned by the backend repo (`../theworldtarot-backend/API_CONTRACT.md`); never change it from here.
