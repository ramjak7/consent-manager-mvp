import crypto from "crypto";

export function generateApprovalToken() {
  return crypto.randomBytes(32).toString("hex");
}