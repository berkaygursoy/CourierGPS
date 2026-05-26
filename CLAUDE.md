# CourierGPS

Real-time courier dispatch dashboard. Greenfield portfolio project demonstrating WebSocket fan-out, Redis GEO queries, and React surgical re-renders.

Stack: Next.js 16 (App Router, Tailwind v4) frontend + Express/Socket.io/Redis/Postgres backend. See `docs/superpowers/specs/2026-05-26-dispatcher-dashboard-design.md` for the spec.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
