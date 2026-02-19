import { getRepoInfo } from "./repoInfo";

async function main() {
  try {
    const info = await getRepoInfo("openclaw", "openclaw");
    console.log(info);
    process.exit(0);
  } catch (err) {
    console.error("Failed to fetch repo info:", err.message || err);
    process.exit(1);
  }
}

main();
