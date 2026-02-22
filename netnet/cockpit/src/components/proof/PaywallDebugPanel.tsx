import PaywallDebugClient from "./PaywallDebugClient";

export default async function PaywallDebugPanel() {
  // Server component: reads server env and passes safe config to client.
  const bypassEnabled = (process.env.X402_DEV_BYPASS ?? "").toLowerCase() === "true";
  const payTo = process.env.X402_PAY_TO ?? "";

  return (
    <PaywallDebugClient
      initial={{ bypassEnabled, payTo }}
      // key ensures the panel refreshes on rebuilds when env changes
      key={`${bypassEnabled}:${payTo}`}
    />
  );
}
