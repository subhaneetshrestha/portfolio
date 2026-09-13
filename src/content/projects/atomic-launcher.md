# atomic-launcher

A text-only Android home launcher. The home screen is a short list of
app names you choose — one to sixteen — with a clock, the date and the
battery above it. No icons, no widgets, no grid.

Ten gestures, each bindable to any of 44 built-in actions, an app, or a
link. A fuzzy search that opens the only match by itself. Notification
badges and screen time, both off until you turn them on and explained
before Android's grant screen. Themes are plain JSON files you can share
as a file or a link.

Budgets, not aspirations: 2.5 MiB release APK, no third-party UI or DI
libraries, platform APIs only. Every system call is guarded — a crashing
home app silently loses its default status. GMS-free, published through
GitHub Releases, updated through Obtainium.

status: v1 feature-complete; release engineering in progress. An `edge`
pre-release tracks main; no signed build yet.
stack: Kotlin, Android platform APIs
