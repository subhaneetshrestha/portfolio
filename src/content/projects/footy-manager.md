# footy-manager

A football-management simulation for mobile. Take over a real club,
manage squad, tactics, coaches and finances, and play an open-ended
career across about thirty leagues — where tactics genuinely decide
matches.

The match engine is pure TypeScript, deterministic, and runs off the
UI thread. CI recomputes a golden baseline on Ubuntu, Windows and macOS
and requires a byte-for-byte match, so a sampling change is a
deliberate act.

status: Phase 0 — monorepo, canonical contracts, engine core with the
determinism gate, seed database pipeline, Expo app shell.
stack: TypeScript, React Native, Expo, react-native-skia, expo-sqlite
