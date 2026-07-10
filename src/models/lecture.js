const mongoose = require("mongoose");

const mLectureSchema = new mongoose.Schema({
  // mlecture_id: {
  //   type: Number,
  //   required: true,
  //   unique: true
  // },
  ml_category: { type: Number, default: null, required: false },
  // ml_course: { type: Number, default: null, required: false },
  ml_course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
  },
  // ml_subject: { type: String, required: true },
  ml_subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "subject",
    required: true,
  },
  ml_title: { type: String, default: null, required: true, trim: true },
  ml_code: { type: String, default: null, required: false },
  ml_status: { type: Number, default: null, required: false }, // 1 = Active
  ml_type: { type: Number, default: null, required: false }, // 1 Link, 2 Video, 3 Audio, 4 Image, 5 PDF, 6 Other
  ml_stype: { type: String },
  ml_yt_type: { type: String, default: "1" },
  ml_file: { type: String, default: null, required: false },
  ml_file_public_id: {
    type: String,
    default: null,
  }, //ocl_type=1 then link else file title
  ml_video_id: { type: String },
  ml_vdocipher_id: {
    type: String,
    default: null,
  },
  ml_date: { type: Date, default: null },
  ml_time: { type: String, default: null },
  ml_added_by: { type: Number, default: null },
  ml_added_on: { type: Date, default: null },
  ml_modified_by: { type: Number, default: null },
  ml_modified_on: { type: Date, default: null },

  // Quiz fields
  ml_quize_keyword: { type: String },
  ml_quize_durration: { type: String },
  ml_quize_icon: { type: String, default: null },
  ml_quize_icon_public_id: {
    type: String,
    default: null,
  },
  ml_quize_banner: { type: String, default: null },

  ml_quize_banner_public_id: {
    type: String,
    default: null,
  },
  ml_quiz_per_marks: { type: Number },
  ml_quiz_pernegative_marks: { type: Number },
  ml_quiz_shortDesc: { type: String },
  ml_quiz_description: { type: String },
  ml_quiz_remark: { type: String },
  ml_quiz_enddate: { type: String },
  ml_quiz_endTime: { type: String },
  ml_quiz_type: { type: Number },

  ml_pdffile: { type: String, default: null },
  ml_pdffile_public_id: {
    type: String,
    default: null,
  },
  ml_seq: { type: Number },
});

module.exports = mongoose.model("lecture", mLectureSchema);
