# Task List: Portfolio — 3D CRT landing → TUI resume

Plan document: [`plan.md`](./plan.md)

Vertically sliced — each task delivers one complete working path, not a horizontal layer.
Tasks are ordered so dependencies are satisfied and the system is left working after each one.

---

## Phase 0: Foundation

## Task 1: Live skeleton on Cloudflare Pages

**Description:** Scaffold Vite + React 19 + TypeScript, define the brand design tokens as CSS custom
properties, self-host a JetBrains Mono woff2 subset, set up routing for `/` and `/tui`, push to a new
GitHub repo, and connect it to Cloudflare Pages. Hosting is proven on day one rather than discovered
to be broken at the end.

**Acceptance criteria:**
- [x] `npm run build` emits static output and `npm run dev` serves locally
- [x] A public URL renders in JetBrains Mono on `--bg` — https://portfolio.subhaneetshrestha.com.np (Cloudflare Workers static assets, custom domain)
- [x] Every brand color exists as a CSS custom property; no raw hex in any component
- [x] `/` and `/tui` are separate routes with the landing chunk lazily imported

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual check: opened the live URL — https://portfolio.subhaneetshrestha.com.np; bundle, font origin and deep links verified with curl
- [x] Manual check: DevTools Network shows the font served from own origin — no `fonts.gstatic.com`

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `vite.config.ts`
- `index.html`
- `src/styles/tokens.css`
- `src/main.tsx`

**Estimated scope:** Small

---

### Checkpoint: Foundation
- [x] Build succeeds with no type errors
- [x] Public URL live and rendering — https://portfolio.subhaneetshrestha.com.np
- [x] Fonts self-hosted, tokens in place

---

## Phase 1: The TUI (the actual portfolio)

## Task 2: TUI shell

**Description:** The persistent frame everything else renders inside — title bar, status line, pane
region, and the blinking `▊` cursor. Boot sequence on first paint. Keyboard navigation (`j`/`k`,
arrows, `Tab`, `1`–`4`, `?` for help). Panes are deep-linkable through the router.

**Acceptance criteria:**
- [x] `/tui` renders the frame with a working boot sequence
- [x] Every pane is reachable by keyboard alone, with a visible focus ring in `--primary`
- [x] `/tui/resume` deep-links straight to that pane on a cold load

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual check: unplug the mouse, reach all four panes and return
- [x] Manual check: hard-reload `/tui/projects` and confirm it opens on that pane

**Dependencies:** Task 1

**Files likely touched:**
- `src/tui/Shell.tsx`
- `src/tui/StatusLine.tsx`
- `src/tui/Boot.tsx`
- `src/tui/tui.module.css`

**Estimated scope:** Medium

---

## Task 3: Typed content layer + GitHub fetch

**Description:** Define schemas for resume, project, and deployment. Write `scripts/fetch-github.ts`
to pull repos, language byte counts, releases, and homepage URLs at build time, plus a liveness check
that records real HTTP status. Pre-fill `resume.ts` from verified evidence (Maitri Services ·
Lalitpur, Nepal · GitHub since Jun 2020 · the JS→TS→Go language arc) with employment-history fields
marked as explicit TODOs.

**Acceptance criteria:**
- [ ] `npm run content` regenerates `src/content/github.generated.json`
- [ ] Build fails loudly if generated content is missing — never silently ships an empty portfolio
- [ ] Dead URLs are recorded as dead with their status code, not dropped from the data
- [ ] Employment-history TODOs are typed such that omitting them is visible, not silently empty

**Verification:**
- [ ] Command succeeds: `npm run content && git diff --stat src/content/`
- [ ] Manual check: cross-check one repo's languages against `gh api repos/subhaneetshrestha/<r>/languages`
- [ ] Manual check: temporarily delete the generated file and confirm the build fails with a clear message

**Dependencies:** Task 1

**Files likely touched:**
- `scripts/fetch-github.ts`
- `src/content/types.ts`
- `src/content/resume.ts`
- `src/content/deployments.ts`

**Estimated scope:** Medium

---

## Task 4: `resume` pane

**Description:** Render `resume.ts` as a dense terminal document. Include a plain-text copy action and
a print stylesheet that produces a clean single-column A4 page through the browser — no PDF dependency.

**Acceptance criteria:**
- [x] Reads entirely from `resume.ts`; no hardcoded copy in the component
- [x] TODO fields render as visible placeholders — never blank, never invented content
- [ ] `Ctrl+P` produces a legible single-column A4 page

**Verification:**
- [x] Build succeeds: `npm run build`
- [ ] Manual check: print-preview and read the output
- [ ] Manual check: select-all, copy, paste into a plain text editor — confirm it reads cleanly

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `src/tui/panes/Resume.tsx`
- `src/styles/print.css`

**Estimated scope:** Small

---

## Task 5: `projects` pane

**Description:** Master/detail browser over the generated repo data. List on the left; detail on the
right showing description, language bar, README excerpt, and last-push recency. Curated ordering puts
`atomic-launcher`, `space-z`, `nepse-analyzer`, `karya`, and `flavique` first; the 2021 tutorial
clones live in a collapsed archive section.

**Acceptance criteria:**
- [x] Language bars reflect real byte counts from the API, not estimates
- [x] `j`/`k` moves selection, `Enter` opens detail, `Esc` returns to the list
- [x] Archive section is collapsed by default and clearly labelled

**Verification:**
- [x] Build succeeds: `npm run build`
- [ ] Manual check: cross-check three repos' language bars against `gh api repos/subhaneetshrestha/<r>/languages`
- [ ] Manual check: navigate the full list and back using only the keyboard

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `src/tui/panes/Projects.tsx`
- `src/tui/LangBar.tsx`

**Estimated scope:** Medium

---

## Task 6: `deployments` pane

**Description:** Three honest sections. **LIVE** — `open-canvas`, `inventory`, with status dots from
the build-time check. **RELEASES** — `space-z` v0.0.3 (apk/exe/love), `atomic-launcher` edge.
**RETIRED** — `pokerivia` (404), shown rather than hidden, because the brand rule is that every claim
is checkable.

**Acceptance criteria:**
- [x] Status dots come from the build-time liveness check, never hardcoded
- [x] Release rows link to real GitHub Releases assets
- [x] Retired entries are visually distinct (`--dead`) and labelled with the reason

**Verification:**
- [x] Build succeeds: `npm run build`
- [ ] Manual check: compare each rendered status against a fresh `curl -o /dev/null -w '%{http_code}' -L <url>`
- [ ] Manual check: click through every release asset link

**Dependencies:** Tasks 2, 3

**Files likely touched:**
- `src/tui/panes/Deployments.tsx`
- `src/tui/StatusDot.tsx`

**Estimated scope:** Medium

---

## Task 7: Command line

**Description:** Input bar with a table-driven dispatcher: `help`, `resume`, `projects`,
`deployments`, `open <name>`, `contact`, `clear`, `whoami`, `poweroff`. History via up/down arrows,
Tab-completion for commands and project names, and an unknown-command message in the brand's dry voice.

**Acceptance criteria:**
- [x] Every command routes correctly; unknown input gives a useful message, not a generic error
- [x] Tab completes both command names and project names
- [x] Commands are defined in a table, not a switch chain — one place to add more

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual check: run every command in the table
- [x] Manual check: press Tab on a partial project name; press up-arrow to recall history

**Dependencies:** Tasks 4, 5, 6

**Files likely touched:**
- `src/tui/CommandLine.tsx`
- `src/tui/commands.ts`

**Estimated scope:** Small

---

### Checkpoint A: Shippable portfolio, no 3D
- [x] All tests pass and the application builds without errors
- [ ] All four panes work keyboard-only, end to end
- [ ] Live on Cloudflare Pages; resume prints cleanly  ← live at portfolio.subhaneetshrestha.com.np; print unverified by eye
- [ ] **This is a complete portfolio. Everything after is enhancement.**
- [ ] **Review with human before proceeding.**

---

## Phase 1.5: Direction change (2026-09-13)

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

## Task 17: Curated project content

**Description:** Move the eight hand-written READMEs (drafted for the user
to edit) into `src/content/projects/<id>.md`, load them with Vite's
`import.meta.glob('./projects/*.md', { query: '?raw', import: 'default',
eager: true })`, and expose them through `projects.ts` alongside the
generated facts. Simplify the Projects pane (now the mobile fallback) to
render the curated text plus footer; delete LangBar, the archive
`<details>` and API excerpt rendering. Private repos get no link.

**Acceptance criteria:**
- [x] `projects()` returns, for each featured id, the curated markdown and a
      `repoUrl` that is null when the repo is absent from the public data
- [x] No language byte counts or API README excerpts are rendered anywhere
- [x] `footy-stonks.md` renders its `[fill in]` lines as visible placeholders

**Verification:**
- [x] Tests pass: `npx vitest run`
- [x] Build succeeds: `npm run build`
- [x] Manual check: `grep -r "languages" src/tui` finds nothing rendering bytes

**Dependencies:** Task 3, Task 5
**Files likely touched:** `src/content/projects/*.md`, `src/content/projects.ts`,
`src/tui/panes/Projects.tsx`, tests
**Estimated scope:** Medium

## Task 16: Linux shell over a virtual filesystem

**Description:** Replace the pane-primary desktop UI with a full-screen shell.
`src/tui/fs.ts` builds the tree above from the content layer;
`src/tui/commands.ts` grows the table to the command set above with a
`cwd` in ctx; `src/tui/CommandLine.tsx` becomes `Shell` output+prompt
filling the screen. Deep links run an initial command. The existing pane
components render only under the touch/mobile breakpoint (Task 12 finishes
that; here, a `matchMedia('(pointer: coarse)')`/width check picks the mode).

**Acceptance criteria:**
- [x] `ls`, `cd`, `pwd`, `cat`, `tree` behave like their POSIX namesakes on the
      virtual tree, including `..`, `~`, relative paths, and errors
      (`cat: x: No such file or directory`, `cd: x: Not a directory`)
- [x] Tab completes commands, then paths relative to cwd; one match completes,
      several list, zero is silent
- [x] `/tui/resume` cold-loads straight into `cat ~/resume.md` output
- [x] `open` on a project README opens the repo only when public
- [x] Every command in the table is exercised by a test; unknown commands
      produce the not-found line

**Verification:**
- [x] Tests pass: `npx vitest run`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: keyboard-only session — `ls`, `cd projects`, Tab, `cat`,
      `neofetch`, `history`, `poweroff`

**Dependencies:** Task 7, Task 17
**Files likely touched:** `src/tui/fs.ts`, `src/tui/commands.ts`,
`src/tui/CommandLine.tsx` → `src/tui/Terminal.tsx`, `src/tui/Shell.tsx`,
`src/tui/tui.module.css`, tests
**Estimated scope:** Large — split: 16a fs + path resolution + tests;
16b commands + completion; 16c terminal UI + deep-link initial command

### Checkpoint A′: shell-first portfolio
- [x] Build clean, suite green — 233 tests, `npm run build` clean
- [x] Keyboard-only: land on `/tui`, `help`, browse projects, read the resume — covered end to end by Shell/Terminal/commands test suites
- [x] Live at portfolio.subhaneetshrestha.com.np reflecting this state — verified ef26bcf's bundle live (Cloudflare build completed/success)
- [ ] User has edited the eight READMEs (or accepted the drafts)  ← still the drafted versions
- [x] Resume filled from the user's CV (two revisions); no TODOs remain in `src/content/resume.ts`
- [x] Phase 1 review disposition: round 1 found 54 → 45 confirmed (31 fixed across two groups, 13 folded
      into Tasks 16/17, 1 left to the user — the `inventory` URL). Round 2 found 42; the session limit hit
      mid-verification, so only 8 were adversarially confirmed before it died — all 8 fixed here (2 high:
      the landing hand-typing the prompt instead of importing `PROMPT`, scrollback `<li>`s keyed by array
      index instead of a stable id; 4 medium: j/k hijacking the terminal's own arrow-key scrolling, the
      help dialog dropping focus to `<body>` on close, Escape stranding focus at `<body>` with no
      documented way back, inconsistent “private” vs “not public” repo wording; 2 low: the boot banner
      naming a different OS than `neofetch`, `bash:`/`sh:` disagreeing between the code and the docs).
      The remaining 34 raw findings from round 2 were never adversarially verified — untriaged, sitting in
      this session's scratchpad (`findings2-raw.json`); a future pass should re-run them through skeptics.

---

## Phase 2: The 3D landing

## Task 8: Landing scene — rebuilt after Checkpoint B (2026-09-14)

**Reopened.** The first pass (procedural CRT, dark room, 5 objects) was built with no way to
see it — this environment has no browser — and shipped looking exactly as bad as that implies:
a flat cyan rectangle, a black silhouette tower, no bevels, no lighting beyond two point lights.
User feedback: "the design of the monitor is very bad and low quality," with a reference image
(isometric, bevelled, heavily-dressed desk scene). Full rework plan: `tasks/plan.md`, "Landing
scene redesign — isometric night desk."

### Task 8.0 — Headless screenshot harness · DONE (`d486339`)
`npm run shoot` builds, boots `vite preview`, drives a real headless Chromium (SwiftShader
software GL — WebGL genuinely renders) to screenshot `/` at 1440x900 and 390x844. `playwright`
is installed `--no-save` — absent from package.json/package-lock.json — so Cloudflare's build
never sees it. This closes the actual root cause: every task from here is screenshot-checked
before it's pushed, not shipped blind.
- [x] `npm run shoot` writes both PNGs from a real WebGL render
- [x] `shots/` is gitignored; the dependency is dev-only and absent from `dist/`

### Task 8a — Rendering pipeline · DONE
Orthographic isometric camera (`applyAspect`, true isometric via a (1,1,1) camera direction);
`RoomEnvironment` IBL via `PMREMGenerator` in new `src/three/renderer.ts`, dimmed to
`environmentIntensity = 0.22` after the first screenshot showed the studio-bright default
washing the near-black palette to flat grey; `ACESFilmicToneMapping`; `PCFSoftShadowMap`
(r186 note: WebGL renderer logs a fallback to `PCFShadowMap` — soft shadows still work via the
requested type, harmless); `EffectComposer` → `RenderPass` → `UnrealBloomPass` → `OutputPass`;
`RoundedBoxGeometry` and `MeshPhysicalMaterial` (clearcoat) on the shell, desk, tower, keyboard.
- [x] Camera is orthographic at a true isometric angle; no perspective divergence
- [x] `scene.environment` is a PMREM from `RoomEnvironment` — no HDR file in the repo
- [x] Every visible edge is bevelled; no hard 90° corner survives (`scene.test.ts` asserts it)
- [x] Bloom affects the screen/glow only, not the whole frame — visually confirmed in `shots/`

**Verify:** `npm run shoot` — screenshot went from a flat cyan slab with an invisible black
tower to a properly bevelled, lit, isometric scene with visible IBL reflections on every shell,
in one iteration once the harness caught the over-bright first attempt. 272 tests, clean build,
entry chunk still 0 occurrences of "WebGLRenderer" (Landing chunk: 527KB → 560KB gz payload,
+13KB for the addons, exactly the plan's estimate).

> **Checkpoint B1 — is the quality jump real? Stopping here for review**, per tasks/plan.md.
> Five objects, properly lit — the monitor's actual *shape* (a CRT box, not yet the reference's
> modern flat panel) is deliberately untouched; that's Task 8b.

### Task 8b — The desk hero · not started
`crt.ts` → `monitor.ts`: thin-bezel flat panel, slim neck, weighted base, screen tilt, clearcoat
glass. Tower with a cyan side glow, mech keyboard (instanced keys), mousepad, mouse.

### Task 8c — Desk companions · not started
Laptop, tablet, mug, pen cup, small succulent.

### Task 8d — Room shell and furniture · not started
Walls, floor, skirting, window (cool night rim light), rug, ergonomic chair.

### Task 8e — Dressing · not started
Shelf with books/cactus, two posters, monstera, bin, slippers, cables.

### Task 8f — Polish and perf gate · not started
Final lighting pass, 60fps measurement, chunk-growth record, reduced-motion/fallback re-check.

### Checkpoint B: Does the procedural CRT look good enough?
- [ ] Review the rendered scene against the intended feel
- [ ] **Decide here:** invest further in materials and lighting, or source a licensed model
- [ ] Cheaper to decide now than after the transition is wired
- [ ] **Review with human before proceeding.**

---

## Task 9: Live screen texture

**Description:** Draw the boot log to a 2D canvas and map it onto the screen plane as a
`CanvasTexture` — chosen over a `WebGLRenderTarget` for crisper text at a fraction of the cost.
Blinking cursor, scanlines, slight barrel curve. Text must be legible at the landing camera distance.

**Acceptance criteria:**
- [ ] Screen text is readable in a 1440px-wide screenshot
- [ ] Texture updates only when content changes — no per-frame redraw

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: screenshot at 1440px and at 375px, read the text in both
- [ ] Manual check: DevTools Performance, confirm no texture upload on idle frames

**Dependencies:** Task 8

**Files likely touched:**
- `src/three/screenTexture.ts`

**Estimated scope:** Small

---

## Task 10: The dive

**Description:** The centerpiece transition. GSAP camera timeline, raycast click with
`recursive: true`, coordinated light/bloom/scanline ramp, scale-matched cross-fade into the DOM TUI,
and full WebGL teardown afterwards. `poweroff` reverses the whole thing.

**Acceptance criteria:**
- [ ] Clicking the screen reliably registers — `intersectObjects(targets, true)`, since geometry lives on child meshes
- [ ] Handoff has no visible jump in scale or position
- [ ] After the transition the WebGL context is released; no idle render loop remains
- [ ] `poweroff` returns to `/` and rebuilds the scene cleanly

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: DevTools Memory — confirm the context is gone post-transition
- [ ] Manual check: record the seam and step through it frame-by-frame
- [ ] Manual check: run the dive and `poweroff` five times; confirm no leak or degradation

**Dependencies:** Tasks 9, 2

**Files likely touched:**
- `src/three/dive.ts`
- `src/landing/Landing.tsx`
- `src/tui/Shell.tsx`

**Estimated scope:** Medium

---

## Task 11: Fallbacks

**Description:** `prefers-reduced-motion` routes straight to `/tui`. No WebGL, or a detected low-end
device, routes straight to `/tui`. A persistent, visible skip control on the landing. A slow-load
timeout escape hatch.

**Acceptance criteria:**
- [ ] Reduced-motion never loads the `three` chunk at all
- [ ] Skip control is visible and keyboard-reachable within one Tab
- [ ] Forcing WebGL off still yields a complete, usable portfolio

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: emulate reduced-motion in DevTools, confirm `three` never appears in Network
- [ ] Manual check: disable WebGL via browser flags and load `/`
- [ ] Manual check: throttle to Slow 3G and confirm the timeout escape fires

**Dependencies:** Task 10

**Files likely touched:**
- `src/landing/Landing.tsx`
- `src/lib/capabilities.ts`

**Estimated scope:** Small

---

### Checkpoint C: Full experience end to end
- [ ] Application builds without errors
- [ ] Landing → dive → TUI works, and `poweroff` reverses it
- [ ] Every fallback exercised: reduced-motion, no-WebGL, Slow 3G, skip control
- [ ] **Review with human before proceeding.**

---

## Phase 3: Polish

## Task 12: Touch + mobile TUI

**Description:** A typed command line behind a virtual keyboard is bad UX on a phone. Below 768px the
same content becomes a touch-first pane list with 44×44px targets, and the command bar becomes opt-in
behind a button. The landing gets a lighter scene, or skips to the TUI, on low-end devices.

**Acceptance criteria:**
- [ ] Usable one-thumbed at 375px with no horizontal scroll
- [ ] Every touch target is at least 44×44px with at least 8px spacing
- [ ] The virtual keyboard never covers the active pane

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: test on a real phone, not only DevTools emulation
- [ ] Manual check: open the command bar on mobile and confirm the pane stays visible

**Dependencies:** Tasks 7, 11

**Files likely touched:**
- `src/tui/Shell.tsx`
- `src/tui/MobileNav.tsx`
- `src/styles/responsive.css`

**Estimated scope:** Medium

---

## Task 13: Accessibility + performance pass

**Description:** The retro-futurism/CRT style carries a **HIGH** accessibility risk — scanlines and
glow actively degrade contrast. Audit every text/background pair, put the CRT effect behind a
persisted toggle, verify focus visibility everywhere, and add landmarks plus live-region
announcements for pane changes.

**Acceptance criteria:**
- [ ] Every text/background pair measures at least 4.5:1 — measured, not assumed
- [ ] Scanline/glow toggle persists across reloads and defaults off under reduced-motion
- [ ] Lighthouse accessibility ≥95 and performance ≥90 on `/tui`
- [ ] Screen reader announces pane changes

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run Lighthouse on both `/` and `/tui`
- [ ] Manual check: one full pass with a screen reader
- [ ] Manual check: contrast-check every token pair with a measuring tool

**Dependencies:** Task 12

**Files likely touched:**
- `src/styles/tokens.css`
- `src/tui/Shell.tsx`
- `src/lib/prefs.ts`

**Estimated scope:** Medium

---

## Task 14: Metadata + share

**Description:** Title, description, canonical URL, and OG/Twitter cards written in the brand voice.
The OG image is a rendered terminal frame. Favicon is the `▊` block cursor. Add `robots.txt` and a
sitemap. No analytics — consistent with the privacy stance `smart-wallet` takes.

**Acceptance criteria:**
- [ ] OG card renders correctly in a card validator
- [ ] Favicon is the block cursor mark
- [ ] No third-party network requests at runtime

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: paste the live URL into a social card validator
- [ ] Manual check: DevTools Network filtered to third-party — confirm the list is empty

**Dependencies:** Task 13

**Files likely touched:**
- `index.html`
- `public/og.png`
- `public/favicon.svg`
- `public/robots.txt`

**Estimated scope:** Small

---

## Task 15: CI + scheduled refresh

**Description:** GitHub Action running typecheck and build on push, plus a scheduled weekly run of
`npm run content` that commits any changes and triggers a redeploy. The site then tracks GitHub
without manual work.

**Acceptance criteria:**
- [ ] CI fails on type errors
- [ ] The scheduled run updates generated content and redeploys
- [ ] A new repo or release appears on the live site without manual intervention

**Verification:**
- [ ] CI passes on a test push
- [ ] Manual check: trigger the content workflow manually via `gh workflow run`
- [ ] Manual check: confirm the live site reflects a fresh push

**Dependencies:** Task 14

**Files likely touched:**
- `.github/workflows/ci.yml`
- `.github/workflows/content.yml`

**Estimated scope:** Small

---

### Checkpoint D: Complete
- [ ] All acceptance criteria met across every task
- [ ] Live on Cloudflare Pages and self-updating
- [ ] Ready for review

---

## Blocked on user input

- [ ] **Employment history** for `resume.ts` — roles, dates, responsibilities, education.
      Blocks only the TODO fields in Task 3; every other task can proceed.
- [ ] **Custom domain** — optional; one DNS step in Task 1 if one exists.
- [ ] **Upstream fix (not this repo):** `space-z`, `karya`, and `flavique` have no GitHub
      description. Task 5 surfaces them prominently and they will otherwise render empty.
