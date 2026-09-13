# flavique

A social/content platform built as a polyglot monorepo: Next.js web,
Expo mobile, and an event-driven Go microservices backend.

Built in ordered sub-projects. The first is deliberately thin: one
deployable vertical slice — create a post, receive an async
notification — that proves the whole stack end to end: monorepo
tooling, Postgres, NATS JetStream, Docker Compose, CI. The Go
integration tests run against the real containers.

Verified under Docker Desktop. Podman is expected to work and has not
been exercised.

status: sub-project 1.
stack: Go 1.26, Next.js, Expo, Postgres, NATS JetStream, Docker
