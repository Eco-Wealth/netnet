# Unit 46 — Distribution / Play Layer

Adds a **Distribution** page and a **proof feed endpoint**.

## UI
- `/distribute` — shareable feed UI with:
  - search + tag filter
  - copy-share-link button
  - lightweight “progress” score aggregation

## API
- `GET /api/proof/feed`
  - returns `{ ok, items: ProofFeedItem[] }`
- `GET /api/proof/feed?format=rss`
  - RSS output for external readers / syndication

## Notes
- v1 feed is seeded in-memory for demo.
- Next step: persist real proof objects into an append-only store (KV/DB/file), and have `/api/proof/build` write into it.
