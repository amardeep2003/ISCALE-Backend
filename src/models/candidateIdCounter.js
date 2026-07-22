const mongoose = require("mongoose");

// One document per YYMM (e.g. "2607" for July 2026), incremented
// atomically to hand out unique candidate_idno sequence numbers.
const candidateIdCounterSchema = new mongoose.Schema({
  _id: { type: String }, // YYMM
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model(
  "candidate_id_counter",
  candidateIdCounterSchema,
);
