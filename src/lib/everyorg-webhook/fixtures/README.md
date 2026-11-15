# Every.org partner webhook fixtures

- `donation-documented-example.json`: the example payload from
  docs.every.org/docs/webhooks/partner-webhook, copied verbatim (2026-11-14).
- `donation-one-time.json`: the same documented shape, adjusted to a $10
  one-time gift as our Donate Link creates it. Not a captured payload.
- `refund-assumed.json`, `dispute-assumed.json`: **ASSUMED shapes.** Every.org
  hasn't documented refund or dispute events yet (their CTO is enabling them
  on our staging account). Replace these with real staging payloads, with
  donor data removed, and adjust `classifyPartnerEvent` if needed.
