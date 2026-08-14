const express = require("express");
const router = express.Router();

const galleryController = require("../controllers/phoneImageController");
const { phoneImageUpload } = require("../middlewares/uploadMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");

// Upload Image
router.post(
  "/upload",
  authMiddleware,
  adminMiddleware,
  phoneImageUpload,
  galleryController.uploadImage,
);

// Get All Images
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  galleryController.getAllImages,
);

// Get All Images
router.get("/public/all", galleryController.getAllImages);

// Get Single Image
router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  galleryController.getImageById,
);

// Update Image
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  phoneImageUpload,
  galleryController.updateImage,
);

// Delete Image
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  galleryController.deleteImage,
);

module.exports = router;
