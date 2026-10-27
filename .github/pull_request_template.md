## Summary

<!-- What changes, and why. Link the issue if there is one. -->

## Testing

<!-- How you checked it. Delete the lines that don't apply. -->

- [ ] `pnpm format:check`, `pnpm knip` and `pnpm turbo run lint check-types test`
- [ ] Integration tests (`pnpm test:integration`)
- [ ] End-to-end smoke tests (web or organizer)
- [ ] Checked by hand in the browser

## Checklist

- [ ] Queries that count, rank or compare results apply an event scope (no hardcoded event ids)
- [ ] TypeScript and Python copies of a rule stay in sync (state records, nemesis), with parity fixtures updated
- [ ] Migrations work with both the old and the new code (expand/contract)
