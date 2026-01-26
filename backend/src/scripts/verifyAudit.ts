import { getAllAuditLogs } from "../repositories/auditRepo";
import { verifyAuditChain } from "../utils/verifyAuditChain";

(async () => {
  const logs = await getAllAuditLogs();
  const ok = verifyAuditChain(logs);
  if (!ok) {
    console.error("❌ Audit chain verification failed");
    process.exit(1);
  }

  console.log("✅ Audit chain verified successfully");
})();