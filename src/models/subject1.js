const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema({
  // m_subject_id: { type: Number, required: true, unique: true }, // AUTO_INCREMENT handled separately
  m_subject_title: { type: String, required: true },
  m_subject_icon: { type: String },
  m_subject_desc: { type: String },
  m_subject_for: { type: Number }, // 1-Course, 2-Notes
  m_subject_course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  }, // Course id or Notes id
  m_subject_course_slug: { type: String },
  m_subject_seq: { type: Number },
  m_subject_status: { type: Number },
});

module.exports = mongoose.model("subject1", SubjectSchema);


// not working schema