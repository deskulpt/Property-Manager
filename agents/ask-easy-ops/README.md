# ask-easy-ops

Isolated BDK (`@grok/agent-sdk@0.2.28`) ops assistant for Easy Rental.

**Not** a dependency of the MIT Property-Manager app — own `package.json` under `agents/ask-easy-ops/`.

Covers role packs **L2 Landlord · L3 Property Manager · L4 Lease Applicant · L5 Service Provider** plus lease-onboard proposals. Mutations return proposals only (never silent money / notify / eSign / publish).

```bash
npm install
npx --yes "@grok/agent-sdk@0.2.28" validate --dir .
npx --yes "@grok/agent-sdk@0.2.28" eval --dir . --list
npx tsc --noEmit -p .
```

Docs: project store `docs/ask-easy-ops-bdk.md`.
