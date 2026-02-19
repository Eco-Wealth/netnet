import PageHeader from "@/components/PageHeader";
import { WalletStatePanel } from "@/components/WalletStatePanel";

export default function WalletPage() {
  return (
    <div className="nn-page-stack">
      <PageHeader
        title="Wallet"
        subtitle="Read balances, positions, and history from the Bankr wallet surface."
        guidance="Pick a tab, optionally set a wallet address, and refresh to load the latest snapshot."
        outputs="Produces: read-only wallet snapshot JSON and tabular balance/position/history views."
      />
      <WalletStatePanel />
    </div>
  );
}
