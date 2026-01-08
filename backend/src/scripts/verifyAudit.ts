import { getAllAuditLogs } from "../repositories/auditRepo";
import { verifyAuditChain } from "../utils/verifyAuditChain";

(async () => {
  const logs = await getAllAuditLogs();
  verifyAuditChain(logs);
  console.log("✅ Audit chain verified successfully");
})();