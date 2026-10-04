# MSJ Design System — Signal

MSJ is infrastructure, not entertainment. The interface must communicate control,
latency, state and authority. The design system is called **Signal**.

## Palette

- Obsidian 950 — `#101417`: navigation, authority, primary actions.
- Carbon 800 — `#252B2F`: secondary dark surfaces.
- Limestone 50 — `#F4F3EF`: page background.
- Paper 0 — `#FFFFFF`: operational panels.
- Graphite 600 — `#687076`: secondary text.
- Signal Lime — `#E7FF63`: active decisions and primary conversion.
- Operational Green — `#2B7A54`: healthy state.
- Warning Amber — `#A46E12`: degraded state.
- Incident Red — `#A83A3A`: security/failure state.

Signal Lime is intentionally scarce. Use it only for the primary conversion,
the current high-value action, or a critical active state.

## Typography

The product uses the system sans stack for speed and zero external font dependency.

- Marketing display: 48–68 px / 700–800 / tracking -0.04 to -0.06em.
- Product H1: 30–36 px.
- H2: 18–24 px.
- Body: 13–16 px.
- Operational labels: 9–11 px uppercase / tracking .1–.16em / 800.
- IDs, timestamps and technical values may use monospace.

## Geometry

- Standard radius: 12 px.
- Large cards: 16–18 px.
- Pills: 999 px.
- Neutral border: 1 px.
- Shadows remain low contrast. Hierarchy comes from density and contrast.

## States

Every asynchronous object exposes text plus color:
- HEALTHY / green
- PENDING / neutral
- DEGRADED / amber
- FAILED / red
- PAUSED / neutral dark

Never communicate state using color alone.

## Product surfaces

Marketing uses larger type and whitespace.
Workspace Console is compact and operational.
Platform Control is denser and may expose IDs, timestamps and failure metadata.
