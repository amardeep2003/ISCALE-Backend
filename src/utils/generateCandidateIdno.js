const CandidateIdCounter = require("../models/candidateIdCounter");

const SEQUENCE_START = 115; // sequence portion runs 0115-9999
const SEQUENCE_MAX = 9999;

// Format: YYMMNNNN, where YY/MM come from the candidate's joining
// (registration) date and NNNN is a per-month sequence from 0115-9999.
// $inc is atomic, so concurrent registrations in the same month never
// collide - the +114 offset (SEQUENCE_START - 1) just shifts the
// naturally-1-based counter to start display at 0115 instead of 0001.
const generateCandidateIdno = async (joinDate = new Date()) => {
  const yy = String(joinDate.getFullYear()).slice(-2);
  const mm = String(joinDate.getMonth() + 1).padStart(2, "0");
  const key = `${yy}${mm}`;

  const counter = await CandidateIdCounter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );

  const sequence = counter.seq + (SEQUENCE_START - 1);

  if (sequence > SEQUENCE_MAX) {
    throw new Error(
      `candidate_idno sequence exhausted for ${key} (max ${SEQUENCE_MAX})`,
    );
  }

  return `${key}${String(sequence).padStart(4, "0")}`;
};

module.exports = generateCandidateIdno;
