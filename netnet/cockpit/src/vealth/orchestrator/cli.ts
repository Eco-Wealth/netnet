#!/usr/bin/env node
import { runDeterministicLoop } from "./runLoop";

function main() {
  const result = runDeterministicLoop();
  console.log("--- VEALTH LOOP RESULT ---");
  console.log(`Run ID: ${result.runId}`);
  console.log(`Mean Score: ${result.meanScore}`);
  console.log(`Hard Failures: ${result.hardFailures}`);
  process.exit(result.hardFailures > 0 ? 1 : 0);
}

main();
