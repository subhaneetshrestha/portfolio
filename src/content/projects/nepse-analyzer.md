# nepse-analyzer

Fundamental analysis and portfolio advice for the Nepal Stock Exchange,
built for a long-term investor.

Why it exists: Nepali market data is abundant and unreliable. Roughly
half of the commonly quoted regulatory figures — margin limits, capital
adequacy, filing deadlines, the settlement cycle — turned out to be real
quotes from real sources that had stopped being true.

So the rules are not negotiable. Raw prices are never mutated; corporate
actions live in a ledger and adjusted series are computed on read. Every
regulatory figure is a dated row with a source URL, never a constant.
Every ingest asserts completeness — a 200 response is not success; row
counts are.

status: scoring engine done; deal ratings and concrete buy/sell calls
live and scored against realised returns — too young for a track record.
Intrinsic valuation not started. Portfolio construction blocked,
under-evidenced.
stack: Go; React web and React Native app planned
