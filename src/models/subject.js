const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema({
  // m_subject_course: {
  //   type: String,
  //   required: true
  // },

  m_subject_course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  },
  m_subject_title: {
    type: String,
    required: true,
    trim: true,
  },
  m_subject_desc: {
    type: String,
    trim: true,
    // required: true
  },

  m_subject_icon: {
    type: String,
    default: null,
  },

  m_subject_icon_public_id: {
    type: String,
    default: null,
  },

  m_subject_status: {
    type: Number,
    enum: [0, 1], // 0=inactive, 1=active
    default: 1, 
  },
  code: {
    type: String,
    default: null,
  },
  type: {
    type: Number,
    // required: true // 1=compulsory module, 2=domain module
  },
  is_writing: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("subject", ModuleSchema);

// working schema
