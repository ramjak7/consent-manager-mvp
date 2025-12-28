import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

type Consent = {
  consentId: string;
  userId: string;
  purpose: string;
  dataTypes: string[];
  validUntil: string;
  status: "ACTIVE" | "REVOKED";
};

const consents: Consent[] = [];

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

app.post("/consents", (req, res) => {
  const { userId, purpose, dataTypes, validUntil } = req.body;

  if (!userId || !purpose || !dataTypes || !validUntil) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const consentId = `consent_${consents.length + 1}`;

  const consent: Consent = {
    consentId,
    userId,
    purpose,
    dataTypes,
    validUntil,
    status: "ACTIVE",
  };

  consents.push(consent);

  res.status(201).json({
    consentId,
    status: consent.status,
  });
});

app.get("/consents/:id", (req, res) => {
  const { id } = req.params;

  const consent = consents.find(c => c.consentId === id);

  if (!consent) {
    return res.status(404).json({ error: "Consent not found" });
  }

  res.json(consent);
});

app.post("/consents/:id/revoke", (req, res) => {
  const { id } = req.params;

  const consent = consents.find(c => c.consentId === id);

  if (!consent) {
    return res.status(404).json({ error: "Consent not found" });
  }

  if (consent.status === "REVOKED") {
    return res.status(400).json({ error: "Consent already revoked" });
  }

  consent.status = "REVOKED";

  res.json({
    consentId: consent.consentId,
    status: consent.status,
  });
});

app.listen(PORT, () => {
  console.log(`Consent Manager backend running on port ${PORT}`);
});
