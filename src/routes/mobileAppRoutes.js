const express = require("express");
const router = express.Router();

const { mobileAppMiddleware } = require("../middlewares/mobileAppMiddleware");
const {
  health,
  checkLiveness,
  detectFace,
  verifyFaces,
} = require("../controllers/mobileFaceController");

// Public health check for the iScale mobile app (no app-key required).
router.get("/health", health);

// MXFace proxy endpoints - gated behind the mobile app's shared secret.
router.post("/face/liveness", mobileAppMiddleware, checkLiveness);
router.post("/face/detect", mobileAppMiddleware, detectFace);
router.post("/face/verify", mobileAppMiddleware, verifyFaces);

module.exports = router;
