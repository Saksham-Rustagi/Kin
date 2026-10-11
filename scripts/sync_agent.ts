// Push the Talk to Kin agent config (prompt, first message, webhook tools) to ElevenLabs. Run: ~/.bun/bin/bun scripts/sync_agent.ts
// Prints only non-secret results. Also records the synced base URL so the bot won't re-sync on its next boot.
const { syncAgent } = await import("../src/agent");
const { kvSet } = await import("../src/db");
const { config } = await import("../src/config");
try {
  const r = await syncAgent();
  kvSet("agent_tools_base", config.publicBase);
  console.log(`agent "${r.agentName}" PATCH ${r.status}`);
  for (const t of r.tools) console.log(`  tool ${t}`);
  console.log(`tools point at ${config.publicBase}/tools/*`);
} catch (e) {
  console.error(`sync failed: ${(e as Error).message}`);
  process.exit(1);
}
