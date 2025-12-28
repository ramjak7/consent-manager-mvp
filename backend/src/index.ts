import express = require("express");

const app = express();
const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({ status: "UP" });
});

app.listen(PORT, () => {
  console.log(`Consent Manager backend running on port ${PORT}`);
});
