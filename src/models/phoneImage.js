const mongoose = require("mongoose");

const phoneImageSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Image is required"],
      trim: true,
    },

     public_id: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("phoneImage", phoneImageSchema);