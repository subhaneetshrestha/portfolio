# karya

A multi-tenant HR platform for office and white-collar SMBs: attendance
check-ins, leave with organisation-configurable types, payroll for
Nepal, recruitment later. Nepal first, architected so another country
is added without rework.

Inherits the stack flavique proved — Next.js and Mantine on the web,
Expo on mobile, Go microservices on stdlib net/http with sqlc and pgx,
Postgres, NATS JetStream — and consumes its design tokens as a package.
Shares no code with it.

status: implementation starting. Build order begins with the platform
foundation: tenancy, the employment model, effective dating.
stack: Go, Next.js, Expo, Postgres, NATS JetStream
