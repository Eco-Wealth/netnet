// This is a test file to ensure that the MCP functionality works correctly.
import { createStubMCPClient } from './index';

const client = createStubMCPClient();
const result = await client.request("regen", { method: "test" });

console.log(result); // This should log the stub data without executing network calls.