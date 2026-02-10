import Shell from "@/components/Shell";
import AssetWorkspaceClient from "./workspace-client";

export const dynamic = "force-dynamic";

type Params = { chain: string; address: string };

export default function AssetWorkspacePage({ params }: { params: Params }) {
  const chain = decodeURIComponent(params.chain || "base");
  const address = decodeURIComponent(params.address || "");
  return (
    <Shell>
      <AssetWorkspaceClient chain={chain} address={address} />
    </Shell>
  );
}
