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

## Direction change — 2026-09-13

After Phase 1 went live the user reviewed it and redirected three things:

1. **Less GitHub mirror.** The panes showed API-derived data (descriptions,
   language bytes, README excerpts, an archive list) that a GitHub link
   already provides. Replace with things GitHub cannot show: the user's own
   words on each featured project, the resume, live status of what shipped.
2. **A Linux shell, not a tabbed TUI.** Inside the computer the visitor
   types: `ls`, `cd`, `cat`, `tree`, `open`, `neofetch`, tab-completion, over
   a virtual `~`. The tab panes survive only as the touch/mobile fallback.
3. **The landing is a desk.** Dark room, desk, a retro CRT showing the live
   shell, a PC tower with one LED, a keyboard slab. Click the monitor to
   dolly in. Still built from primitives.

Phase 1 carries over almost whole: the content layer (Task 3), resume and
deployments data, the command dispatcher (Task 7) and its tests become the
shell's spine. What is demoted: panes as the primary UI, LangBar, the
archive list, API README excerpts.

### Virtual filesystem (built at module load from src/content)

```
~/
  about.txt            profile: name, title, location, bio, summary
  resume.md            the resume (same text the copy/print path uses)
  contact.txt          links, email
  projects/
    README.md          featured index + "everything else: github.com/…"
    <id>/README.md     hand-written src/content/projects/<id>.md, followed
                       by a generated footer: repo link (public repos only),
                       last push, release assets when any
  deployments/
    live.txt           curated live entries with the literal HTTP status
    releases.txt       release assets with download URLs
  .bashrc              aliases (ll, la, resume, projects); PS1
```

Deep links map to an initial command: `/tui` → MOTD + prompt,
`/tui/resume` → `cat ~/resume.md`, `/tui/projects` → `ls ~/projects`,
`/tui/deployments` → `cat ~/deployments/live.txt`. Routing stays.

### Shell commands

`help` · `ls [-l] [path]` · `cd [path]` (~, .., -) · `pwd` · `cat <path…>` ·
`tree [path]` · `open <path|url>` (repo, live site, release asset — new tab) ·
`clear` · `history` · `whoami` · `neofetch` (ASCII card: OS arch, shell,
editor nvim, languages, uptime = days since 2020-06-09) · `echo` · `date` ·
`exit`/`poweroff` (→ `/`, Task 10 wires the reverse dive) · aliases from
`.bashrc`. Unknown: `bash: <cmd>: command not found. try help.`
Keys: Tab completes commands then paths relative to cwd; ↑/↓ history;
Ctrl+L clear; Ctrl+C cancels the line; Ctrl+U clears it; click anywhere
focuses the input. `cat *.md` renders markdown-lite: `#` heading in
--primary, `status:`/`stack:` keys in --accent, URLs as real links.
Scrollback capped at 500 lines, auto-scrolls on output, prompt pinned.

# Landing scene redesign — isometric night desk (Task 8 rework)

## Context

Task 8 shipped a procedural CRT scene (`814e409`, live). At Checkpoint B the verdict was
**"the design of the monitor is very bad and low quality"** — correct. The root cause is not
the approach, it's that **I built it blind**: no browser in this environment, so ~250 lines of
geometry went from my head straight to production without anyone, including me, seeing it. Box
primitives with hard 90° corners, no bevels, no environment lighting, no post-processing, no
tone mapping — the plan itself specified "subtle bloom" and "scanlines" and neither shipped.

A reference was supplied. Instagram's CDN refused it (403, signed URLs only) so it came via a
Google thumbnail instead — 447×447, read directly.

**What the reference is:** a bright isometric desk vignette. White walls, warm oak floor,
daylight from a right-hand window. Modern thin-bezel widescreen monitor, white PC tower with
magenta RGB, open laptop on a stand, tablet, mech keyboard, mousepad. Heavily dressed — monstera
in a white pot, succulent, floating shelf with books and a cactus, two framed posters ("Stay
Hungry, Stay Foolish"), pen cup, mug, bin, slippers, orange shag rug, ergonomic chair. Soft
shadows, rounded bevels on everything, stylised "toy-like" Blender-render look.

### Decisions taken with the user
| | |
|---|---|
| Checkpoint B | **Invest in the procedural pipeline** — no sourced model, zero 3D assets stands |
| Scope | **Whole scene**, adopting the reference's form language **in the dark brand palette** |
| "Fluid 3D models" | **Smooth, high-quality geometry** — moulded, not built from boxes |
| Sequencing | **Quality pipeline first**, then props in reviewable batches |

### What changes from the shipped scene
| shipped | becomes |
|---|---|
| Dark room, moody | Dark **isometric** room — same darkness, new framing |
| Retro CRT | Modern thin-bezel flat panel |
| Perspective camera + drift | **Orthographic** isometric camera |
| 5 objects | ~25 props |
| 3 lights, no IBL, no post | IBL + key/fill/rim + bloom + ACES tone mapping |
| `BoxGeometry` | `RoundedBoxGeometry`, `LatheGeometry`, bevelled extrudes |

### The night version of the reference
The reference is daylight; the brand is near-black. Translating rather than copying:
walls dark charcoal · desk dark walnut · window a cool night glow (`--secondary`, Arch blue)
· desk lamp a warm amber pool (`--accent`) · tower glow Go cyan (`--primary`) instead of
magenta · rug muted with an amber undertone · plants deep green, rim-lit only.

**The monitor becomes the scene's hero light source.** That is the point: the glow defines the
composition and draws the eye exactly where the click goes, so "click the monitor to get inside"
becomes visually inevitable rather than a caption. Bright-outside → dark-terminal also stops
being a jarring jump.

---

## Feasibility: verified, and easier than photoreal

Stylised isometric is the *sweet spot* for hand-coded geometry — all rounded boxes, cylinders,
lathes and flat colours, no textures, which is exactly what the zero-assets rule wants. Every
addon needed **already ships inside the installed `three@0.186`** — nothing new to add but
`three/addons` imports:

| Need | Module (already present) | gzip |
|---|---|---|
| Studio IBL with **no HDR file** | `environments/RoomEnvironment` + `PMREMGenerator` | 1.7 KB |
| Kill the "boxy" look | `geometries/RoundedBoxGeometry` (`w,h,d,segments,radius`) | 2.0 KB |
| Post-processing chain | `EffectComposer` + `RenderPass` + `OutputPass` | 5.2 KB |
| Screen / RGB glow | `UnrealBloomPass` | 3.9 KB |
| Contact shadows *(deferred)* | `GTAOPass` | 4.3 KB |

≈13 KB gzipped onto a chunk already at 132 KB gz, all of it lazy — `/tui` still loads none of it.
`SMAAPass` is **rejected at 35.6 KB gz**; renderer `antialias: true` is enough at this DPR.

Built into core, no import cost: `OrthographicCamera`, `ACESFilmicToneMapping`,
`PCFSoftShadowMap`, `MeshPhysicalMaterial` (clearcoat for glass/screen).

**`RoomEnvironment` is the single biggest lever** — it generates a studio environment map from a
procedural scene, giving real reflections and soft ambient light for zero asset bytes. Most of
the "cheap WebGL" feeling comes from its absence.

### Scene colours
The brand has 8 tokens; a dressed room needs wood, wall, foliage, fabric. `tokens.css` is the one
sanctioned home for hex (`tests/no-raw-hex.test.ts` excludes only that file), so scene colours land
there as a clearly separated `--scene-*` group, read through the existing `readPalette()`
(`src/three/palette.ts`) — no hex ever enters `src/three/*.ts`. Variations come from colour maths
off those tokens, so the whole scene stays palette-coherent.

---

## The real risk, and the fix

**I still cannot see what I build.** That produced the current scene and will produce another one
unless it changes. The machine has 144 GB free and Mesa EGL present, so a headless browser is
viable — and it converts blind shipping into an iterative loop where I catch bad proportions
before you do. This is **Task 8.0 and it gates everything after it**; it is a `devDependency`,
so it adds **zero bytes** to what visitors download.

---

## Tasks

Each is one complete vertical path — geometry + materials + lighting + tests + a visible result.
On approval these are written into `tasks/plan.md` and `tasks/todo.md` (Task 8 is reopened;
Tasks 9–11 shift to sit on the new scene).

### Task 8.0 — Headless screenshot harness · S · deps: none
Playwright chromium as a devDependency; `scripts/shoot.ts` boots `vite preview`, screenshots `/`
at 1440×900 and 390×844 into a gitignored `shots/`, exits. `npm run shoot`.
- [ ] `npm run shoot` writes both PNGs from a real WebGL render
- [ ] `shots/` is gitignored; the dependency is dev-only and absent from `dist/`
- **Verify:** run it, open the PNGs, confirm the current scene is recognisably in them
- **Files:** `package.json`, `scripts/shoot.ts`, `.gitignore`

> Everything below is checked against a screenshot before it is pushed.

### Task 8a — Rendering pipeline · M · deps: 8.0
The quality jump, applied to the objects already there. Orthographic isometric camera;
`RoomEnvironment` IBL via `PMREMGenerator`; `ACESFilmicToneMapping`; `PCFSoftShadowMap` with one
shadow-casting key light; `EffectComposer` → `RenderPass` → `UnrealBloomPass` (subtle, half-res)
→ `OutputPass`; `RoundedBoxGeometry` and `MeshPhysicalMaterial` (clearcoat on glass) replacing
the current boxes and `MeshStandardMaterial`; `--scene-*` tokens added.
- [ ] Camera is orthographic at a true isometric angle; no perspective divergence
- [ ] `scene.environment` is a PMREM from `RoomEnvironment` — no HDR file in the repo
- [ ] Every visible edge is bevelled; no hard 90° corner survives
- [ ] Bloom affects the screen/glow only, not the whole frame
- **Verify:** `npm run shoot` — side-by-side against the current screenshot; `npx vitest run`; `npm run build`
- **Files:** `src/three/scene.ts`, `src/three/renderer.ts` *(new)*, `src/landing/Landing.tsx`, `src/styles/tokens.css`, tests

> **Checkpoint B1 — is the quality jump real?** Five objects, properly lit. If this doesn't
> convince on a small scene, more props won't save it. **Stop for review.**

### Task 8b — The desk hero · M · deps: 8a
`crt.ts` → `monitor.ts`: thin-bezel flat panel, slim neck, weighted base, slight screen tilt,
clearcoat glass, emissive panel driving the scene's key light. Tower with a Go-cyan side glow,
mech keyboard (key grid via instancing), mousepad, mouse.
- [ ] The monitor reads as a modern flat panel, not a box with a screen decal
- [ ] The screen mesh stays named and a real child of the group (Task 10 raycasts it recursively)
- [ ] Keyboard keys are instanced, not 80 draw calls
- **Verify:** screenshot; `npx vitest run`
- **Files:** `src/three/monitor.ts`, `src/three/desk.ts`, `src/three/scene.ts`, tests

> **Checkpoint B2 — is the monitor right now?** This is the object that was called bad. **Stop for review.**

### Task 8c — Desk companions · M · deps: 8b
Laptop open on a stand, tablet flat on the desk, mug, pen cup with pens, small succulent.
- [ ] Each prop is bevelled and palette-derived; none introduces a texture or hex literal
- **Verify:** screenshot; `npx vitest run`; `npm run build` (chunk delta recorded)
- **Files:** `src/three/props/*.ts`, `src/three/scene.ts`, tests

### Task 8d — Room shell and furniture · M · deps: 8a
Walls, floor, skirting, window throwing a cool night rim light, round rug, ergonomic chair
(seat, back, arms, gas post, five-star base).
- [ ] Window light reads as the cool counterpoint to the monitor's glow
- [ ] Chair silhouette is recognisable at isometric framing
- **Verify:** screenshot; `npx vitest run`
- **Files:** `src/three/room.ts`, `src/three/props/chair.ts`, `src/three/scene.ts`, tests

### Task 8e — Dressing · M · deps: 8c, 8d
Floating shelf with books and a cactus, two wall posters (one carries the `▊` mark), monstera in
a pot, bin, slippers, a desk cable or two.
- [ ] Scene reads as lived-in at a glance, matching the reference's density
- **Verify:** screenshot at both sizes; `npx vitest run`
- **Files:** `src/three/props/*.ts`, `src/three/room.ts`, tests

### Task 8f — Polish and perf gate · M · deps: 8e
Final lighting and material pass. Measure frame time; decide `GTAOPass` in or out on evidence.
Confirm reduced-motion still renders one static frame and the chunk stays lazy.
- [ ] 60fps at 1440×900 on desktop, measured not assumed
- [ ] Landing chunk growth recorded; entry chunk still contains zero `WebGLRenderer`
- [ ] `prefers-reduced-motion` renders one still frame, no rAF loop
- **Verify:** DevTools trace via the harness; `npm run build`; `npx vitest run`
- **Files:** `src/three/*.ts`, `src/landing/Landing.tsx`, `tasks/todo.md`

> **Checkpoint B-final — whole scene against the reference.** Then Tasks 9–11 (screen texture,
> dive, fallbacks) resume on top of it.

---

## Tests

Existing structure holds; these break by design and get rewritten with each task:
`src/three/scene.test.ts` pins `['desk','crt','tower','keyboard','room']` and
`PerspectiveCamera` — both change in 8a/8b. `src/landing/Landing.test.tsx` mocks only
`WebGLRenderer`; it gains an `EffectComposer` mock. Everything else — geometry, materials,
lights, the drift/parallax maths — keeps running for real in jsdom, no GPU needed.
`tests/no-3d-assets.test.ts`, `tests/no-raw-hex.test.ts` and `tests/build.test.ts`'s chunk-split
assertions are unchanged and keep guarding the invariants.

## Risks
| Risk | Mitigation |
|---|---|
| Building blind again | Task 8.0 gates everything; every push is screenshot-checked first |
| Bright reference vs dark brand | Translate, don't copy — night palette, monitor as hero light |
| Scope: 5 → ~25 props | Batched into 8b–8e, each independently reviewable |
| Perf: shadows + bloom + 25 props | One shadow-caster, half-res bloom, instanced keys, 8f measures |
| Chunk growth | ~13 KB gz for addons; lazy, so `/tui` unaffected; recorded per task |
| Stylised ≠ reference exactly | Checkpoints B1/B2 catch drift early, before the dressing lands |

## Verification (end to end)
```bash
npm run shoot        # screenshots / at 1440×900 and 390×844
npx vitest run       # unit + structural guards
npm run build        # chunk split: three.js stays out of the entry
```
1. Screenshots match the reference's form language in the brand's night palette
2. `/tui` requests zero three.js (`tests/build.test.ts`)
3. Reduced-motion → one static frame, no animation loop
4. 60fps at 1440×900, measured in 8f
5. Live at portfolio.subhaneetshrestha.com.np after push

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

### Phase 1.5: Direction change — shell-first, curated content
- [ ] Task 17: Curated project content — M
- [ ] Task 16a: Virtual filesystem + path resolution — S
- [ ] Task 16b: Shell commands + completion — M
- [ ] Task 16c: Terminal UI + deep-link initial command — M

### Checkpoint A′: shell-first portfolio
- [ ] Keyboard-only shell session end to end; live; READMEs edited or accepted

### Phase 2: The 3D landing
- [ ] Task 8: Procedural desk scene — CRT, tower, keyboard on a desk — M
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
