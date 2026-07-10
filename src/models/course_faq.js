const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },

    course_slug: {
      type: String,
      // required: true,
      maxlength: 200,
    },

    created: {
      type: Date,
      default: null,
    },

    updated: {
      type: Date,
      default: null,
    },

    created_by: {
      type: String,
      default: null,
    },

    update_by: {
      type: Number,
      default: null,
    },

    title: {
      type: String,
      maxlength: 255,
      default: null,
    },

    description: {
      type: String,
      maxlength: 500,
      default: null,
    },

    status: {
      type: Number,
      default: 1, // MySQL default 1
    },
  },
  {
    timestamps: false, // because you already have created/updated fields
  },
);

module.exports = mongoose.model("course_faq", courseSchema);


// working schema