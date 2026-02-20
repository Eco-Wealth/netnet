# Unit 3 integration

Add the paywall debug panel to the Proof page.

1) Open `netnet/cockpit/app/proof/page.tsx` (or the component that renders the Proof tab).
2) Import:

```ts
import PaywallDebugPanel from "@/components/proof/PaywallDebugPanel";
```

3) Render it near the top of the Proof UI (e.g. under the heading):

```tsx
<PaywallDebugPanel />
```

The panel:
- shows whether `X402_DEV_BYPASS` is enabled
- shows `X402_PAY_TO` (safe to reveal)
- can "probe" the `/api/proof-paid` endpoint and display the status + challenge headers
