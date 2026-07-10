const mongoose = require("mongoose");

const testPackageSchema = new mongoose.Schema({
  m_package_course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "course",
    required: true,
  },

  m_package_title: {
    type: String,
    required: true,
    trim: true,
  },

  m_package_language: {
    type: String,
    required: true,
    trim: true,
  },

  m_package_image: {
    type: String,
    default: null,
  },

  m_package_image_public_id: {
    type: String,
    default: null,
  },

  m_package_order: {
    type: Number,
    default: 0,
  },

  m_package_intro: {
    type: String,
    default: null,
    trim: true,
  },

  m_package_description: {
    type: String,
    default: null,
    trim: true,
  },

  m_package_test_category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "test_categories",
    default: null,
  },

  m_package_type: {
    type: Number,
    enum: [1, 2], // 1=free , 2=paid
    default: null,
  },

  m_package_price: {
    type: Number,
    default: null,
  },

  m_package_offer_price: {
    type: Number,
    default: null,
  },

  m_package_status: {
    type: Number,
    enum: [0, 1],
    default: 1,
  },

  m_package_created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("test_package", testPackageSchema);
