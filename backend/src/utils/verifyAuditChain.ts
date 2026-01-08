import { computeAuditHash } from "./auditHash";
import { AuditLog } from "../repositories/auditRepo";

export function verifyAuditChain(logs: AuditLog[]): boolean {
  for (let i = 0; i < logs.length; i++) {
    const prevHash = i === 0 ? null : logs[i - 1].hash;

    const expected = computeAuditHash({
      prevHash,
      auditId: logs[i].auditId,
      eventType: logs[i].eventType,
      consentId: logs[i].consentId,
      userId: logs[i].userId,
      timestamp: logs[i].timestamp,
      details: logs[i].details,
    });

    if (expected !== logs[i].hash) return false;
  }

  return true;
}