# smart-wallet

A personal finance tracker for Android that reads the ledger your phone
already receives: bank SMS and wallet notifications — eSewa, Khalti,
IME Pay, Fonepay. Parsed on-device into transactions, categorised by a
deterministic rule engine. AI is optional and brings your own key or an
on-device model; the app works with none.

Private by default: local-first, encrypted with SQLCipher, nothing sent
to a server we run, optional backup to your own cloud. Country support
is data, not code — a JSON file per market. Nepal first.

Android only, because iOS forbids third-party SMS reading and the core
feature is impossible there.

status: scaffolded — multi-module Gradle build, parser engine with
green golden tests for Nepal, encrypted data layer, capture services,
navigable Compose shell. Next gate: real-device sample capture.
stack: Kotlin, Jetpack Compose, Material 3, SQLCipher
