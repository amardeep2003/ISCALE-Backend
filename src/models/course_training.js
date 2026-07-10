const mongoose = require("mongoose");

const navigationSchema = new mongoose.Schema(
  {
    type: {
      type: Number,
      default: null,
      enum: [1, 2, 3, 4], // 1 => course, 2 => test, 3 => notes, 4 => webinar
    },

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

    test_id: {
      type: Number,
      default: 0,
    },

    notes_id: {
      type: Number,
      default: 0,
    },

    webinar_id: {
      type: Number,
      default: 0,
    },

    created: {
      type: Date,
      default: null,
    },

    updated: {
      type: Date,
      default: null,
    },

    icon: {
      type: String,
      default: null,
  
    },

    icon_public_id:{
      type: String,
      default: null,
    },

    title: {
      type: String,
      default: null,
      required: true,
      maxlength: 255,
      trim:true
    },

    description: {
      type: String,
      default: null,
      maxlength: 255,
      trim:true
    },

    active: {
      type: Number,
      default: 1, // 1 = active
    },
  },
  {
    timestamps: false,
  },
);

module.exports = mongoose.model("course_training", navigationSchema);
