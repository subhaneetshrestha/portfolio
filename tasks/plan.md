# Implementation Plan: Portfolio — 3D CRT landing → TUI resume

## Context

Building a personal portfolio for **Subhaneet Shrestha** (GitHub `subhaneetshrestha`, handle `hyzii`),
Software Engineer at Maitri Services, Lalitpur Nepal. Visitors land on a dark room containing a 3D CRT
computer, click it to "get inside", and drop into a TUI where they browse a resume, projects, and
shipped deployments. Hosted free on Cloudflare Pages.

**Why a terminal, specifically.** The concept is earned by the GitHub evidence, not picked as a theme:

- Bio: *"Javscript user and a hater. Go supremacy. Arch and neovim enjoyer."*
- The language arc is real: JS (2021) → TS (2022–25) → **Go (2026)**. ~2.75 MB Go vs ~1.4 MB TS.
- `atomic-launcher` — "a **text-only**, minimalist Android home launcher", 2.5 MiB APK budget,
  no third-party UI or DI libraries.
- `space-z` — LÖVE/Lua roguelite, "neon-vector, generated **procedurally in code (no external art assets)**".
- READMEs carry ADRs, determinism gates, golden tests, and unusually honest status lines:
  *"blocked, under-evidenced"*, *"too young for a track record"*, and the best one —
  ***"A 200 response is not success; row counts are."***

Text-dense, keyboard-driven, no decoration. The interface argues the same thing the work does.

**The gap this closes.** The current GitHub profile README is a generated wall of ~50 tech logos,
profile-view counters and streak badges. It reads like everyone else's and contradicts the actual work.

## Decisions locked with the user

| | |
|---|---|
| Brand name | **Subhaneet Shrestha** leads; `hyzii` is the shell username flavour |
| Deployments pane | Live URLs **+** release binaries **+** honest retired list |
| Resume content | Typed data file, pre-filled from evidence, TODOs for employment history |
| Hosting | **Cloudflare Workers static assets** (git-push deploys via Workers Builds; `wrangler.jsonc`), live at https://portfolio.subhaneetshrestha.com.np — chosen as Pages, connected as a Worker; functionally identical for a static SPA |

---

## Brand

### Positioning
> **Subhaneet Shrestha is the engineer who writes down what is actually true.**
> Ships lean things in Go, states their real status, and distrusts hype — including his own.

Unlike portfolios that list 50 logos, this one shows shipped artifacts with live status and honest gaps.

### Voice chart

| Trait | Do | Don't |
|---|---|---|
| **Precise** | "2.5 MiB APK budget, platform APIs only" | "Highly optimized, best practices" |
| **Honest** | "blocked, under-evidenced" · "pokerivia — retired, 404" | Hiding dead links, inflating scope |
| **Dry** | "Javascript user and a hater" | Snark at other people's tools |
| **Lean** | One binary, no deps | "Enterprise-grade scalable solution" |

**Copy rule:** every claim on the site is checkable. Status dots reflect a real HTTP check,
never a hardcoded green.

### Palette — grounded in identity, not generic neon

The design-system tool proposed neon red/blue/matrix-green. Rejected: matrix-green terminal is a
cliché and the red/blue has nothing to do with him. Grounded in his actual stack instead:

| Role | Hex | Source | Use |
|---|---|---|---|
| `--bg` | `#0B0D10` | near-black | page ground |
| `--fg` | `#C9D1D9` | | body text |
| `--primary` | `#00ADD8` | **Go brand cyan** — "Go supremacy", literally | prompt, links, focus ring |
| `--accent` | `#FFB454` | CRT phosphor amber | cursor, highlights, CTA |
| `--secondary` | `#1793D1` | Arch Linux blue | secondary chrome |
| `--ok` | `#3FB950` | | live status |
| `--dead` | `#6E7681` | | retired status |
| `--muted-fg` | `#8B949E` | | meta, timestamps |

`#00ADD8` on `#0B0D10` computes to **7.38:1** — passes WCAG AA (4.5:1) with margin.
Every other pair gets measured in Task 13.

### Type

**JetBrains Mono, single family** — the `Terminal CLI Monospace` pairing, best-for
*"developer tools, hacker aesthetic, geek-culture portfolios"*. Its rules followed literally:

- Sizes **12 / 14 / 16 only** — no in-between
- Weight **400** — bold ruins mono character; use color and `--accent` for emphasis
- Line-height **1.2** for information density
- **Self-hosted woff2 subset**, not a Google Fonts request — one less third-party

### Mark

No logo illustration. For a terminal person the mark **is the prompt**:

```
subhaneet@arch:~$ ▊
```

The blinking block cursor `▊` is the reusable icon — favicon, loading state, 404.
Zero bytes, renders in text, unmistakably his.

---

## Architecture Decisions

### Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + React 19 + TypeScript** | Fully static, no SSR need. Next.js would add framework weight and pull hosting toward Vercel. Vite output deploys anywhere. |
| 3D | **Three.js, plain** (no react-three-fiber) | One scene, ~250 lines. R3F + drei costs ~100 KB for ergonomics a single scene doesn't need. Upgrade path noted if the scene grows. |
| Motion | **GSAP core** | Three.js guidance is explicit: **GSAP camera rig, not OrbitControls**, for a scripted reveal. No plugins needed. |
| Styling | **Plain CSS + custom properties**, CSS Modules | The visual language is a `ch`-based monospace grid with 7 colors. Tailwind would fight the grid. |
| Package manager | **npm** (ships with node 24.21) | `pnpm` is not installed here (Volta errors on it). `bun 1.4.0` also works. |

**Deliberately not used: `xterm.js`.** It is a terminal *emulator* for real PTY streams — ~250 KB to
solve a problem this site doesn't have. The TUI here is simulated: real DOM text, which is lighter,
selectable, zoomable, and screen-reader readable.

### The decision that matters most: route-split the 3D from the content

```
/            → Landing. Lazy-loads the three.js chunk.
/tui         → The TUI. Loads ZERO three.js. Direct-linkable.
/tui/resume  → deep-linked panes
/tui/projects
/tui/deployments
```

The resume is the payload; the 3D is a lazy-loaded enhancement. A recruiter on a slow mobile
connection, a reduced-motion user, a device without WebGL, and a crawler all reach the content
without downloading a megabyte of 3D. This also makes Task 11's fallbacks trivial — they are
a redirect to a route that already exists.

### The CRT is built procedurally, not downloaded

No GLTF asset. The monitor is Three.js primitives — bevelled box shell, inset screen plane with
curved vertex displacement, emissive material. Reasons in order:

1. **It is his own philosophy.** `space-z` generates all art procedurally with no external assets;
   `atomic-launcher` bans third-party UI libs. A downloaded model would contradict the brand
   the site argues for.
2. Zero asset bytes vs a 1–5 MB GLB.
3. No model sourcing, licensing, or attribution task.
4. Fully themeable from the same custom properties as the TUI.

The one Three.js guideline that still applies is critical and easy to get wrong:

```js
// Severity: High — geometry lives on child meshes.
// Without recursive:true the screen is never clickable.
const hits = raycaster.intersectObjects(crtGroup.children, true);
```

### The dive transition

1. **Idle** — CRT in a dark room. Screen shows a live boot log drawn to a `CanvasTexture`.
   Slow camera drift + damped pointer parallax (hand-rolled rig, *not* `OrbitControls` —
   users can orbit away mid-reveal).
2. **Click** — raycast hit on the screen mesh → GSAP timeline: camera dollies to the screen plane,
   room lights fall, bloom and scanlines rise, boot log accelerates.
3. **Handoff** — when the screen plane fills the viewport, cross-fade to the real DOM TUI sized to
   match the screen's projected rect. Scale-matching is what makes it read as continuous, not a cut.
4. **Teardown** — `renderer.setAnimationLoop(null)`, dispose geometries/materials, release the
   context. The TUI must not pay for an idle WebGL loop.
5. **Reverse** — `poweroff` / `logout` pulls back out.

`CanvasTexture` (2D canvas → texture) is chosen over a `WebGLRenderTarget` render-to-texture:
crisper text, a fraction of the cost, far simpler.

### Content pipeline — generated, not hand-maintained

257 contributions in the last window, and repos pushed the same day this was planned.
A hand-written project list goes stale in a fortnight.

```
scripts/fetch-github.ts   → build-time fetch (no runtime API calls, no visitor rate limits)
  └→ src/content/github.generated.json
src/content/resume.ts        hand-authored, typed, TODOs marked
src/content/deployments.ts   curated list; liveness checked at build
```

A scheduled GitHub Action re-runs the fetch and redeploys, so the site tracks his GitHub
without him touching it.

---

## Task List

Full acceptance criteria and verification steps for each task live in [`todo.md`](./todo.md).

### Phase 0: Foundation
- [ ] Task 1: Live skeleton on Cloudflare Pages — S

### Checkpoint: Foundation
- [ ] Builds clean, public URL renders, fonts self-hosted

### Phase 1: The TUI (the actual portfolio)
- [ ] Task 2: TUI shell — M
- [ ] Task 3: Typed content layer + GitHub fetch — M
- [ ] Task 4: `resume` pane — S
- [ ] Task 5: `projects` pane — M
- [ ] Task 6: `deployments` pane — M
- [ ] Task 7: Command line — S

### Checkpoint A: Shippable portfolio, no 3D
- [ ] All four panes work keyboard-only, live on Cloudflare Pages, resume printable
- [ ] **Everything after this point is enhancement. Review with human before proceeding.**

### Phase 2: The 3D landing
- [ ] Task 8: Procedural CRT scene — M
- [ ] **Checkpoint B: does the procedural CRT look good enough?** (decide: invest or source a model)
- [ ] Task 9: Live screen texture — S
- [ ] Task 10: The dive — M
- [ ] Task 11: Fallbacks — S

### Checkpoint C: Full experience end to end
- [ ] Every fallback exercised (reduced-motion, no-WebGL, slow 3G, skip)

### Phase 3: Polish
- [ ] Task 12: Touch + mobile TUI — M
- [ ] Task 13: Accessibility + performance pass — M
- [ ] Task 14: Metadata + share — S
- [ ] Task 15: CI + scheduled refresh — S

### Checkpoint D: Complete
- [ ] All acceptance criteria met, live, self-updating

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 3D gates the content | **High** | Route split — `/tui` never loads three.js. Structural in Task 1, not retrofitted. |
| Procedural CRT looks cheap | **High** | Checkpoint B decides early: invest in materials or source a model. |
| CRT effects break contrast (style rated a11y risk HIGH) | **High** | Task 13 measures every pair; effects behind a persisted toggle. |
| Handoff seam looks like a cut | Med | Scale-match DOM to the screen's projected rect; tune frame-by-frame. |
| Mobile TUI unusable | Med | Task 12 replaces the command line with touch nav under 768px. |
| Resume TODOs ship blank | Med | Placeholders render visibly; Task 4 criterion forbids silent blanks. |
| Content goes stale | Low | Build-time generation + weekly Action. |
| Scope creep | Med | Checkpoint A is a complete portfolio. Phases 2–3 are optional from there. |

## Open Questions

- **Employment history** for `resume.ts` — roles, dates, responsibilities, education.
  Needed to fill Task 3's TODOs. Nothing before it is blocked.
- **Custom domain?** Cloudflare Pages gives a free `*.pages.dev`. If a domain exists,
  it is one DNS step in Task 1.
- `space-z`, `karya`, `flavique` have **no GitHub description**. Worth adding upstream —
  Task 5 surfaces them prominently and they would otherwise render empty.

## Verification (end to end)

```bash
npm run content        # regenerate GitHub-derived content
npm run typecheck      # tsc --noEmit
npm run build          # verify three.js lands in its own lazy chunk
npm run preview
```

1. `/tui` with JS-heavy assets blocked → resume still readable
2. Keyboard-only: reach all four panes, run three commands, print the resume
3. `/` → click the CRT → seamless handoff; DevTools Memory shows the WebGL context released
4. Reduced-motion emulation → lands on `/tui`, three chunk never requested
5. Real phone at 375px → one-thumb navigation, no horizontal scroll
6. Lighthouse both routes → a11y ≥95, perf ≥90
