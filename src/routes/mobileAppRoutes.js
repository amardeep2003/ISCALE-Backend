const express = require("express");
const router = express.Router();

const { mobileAppMiddleware } = require("../middlewares/mobileAppMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { userMiddleware } = require("../middlewares/userMiddleware");
const {
  health,
  checkLiveness,
  detectFace,
  verifyFaces,
} = require("../controllers/mobileFaceController");
const {
  getStatus,
  activate,
} = require("../controllers/mobileSubscriptionController");

// Public health check for the iScale mobile app (no app-key required).
router.get("/health", health);

// MXFace proxy endpoints - gated behind the mobile app's shared secret.
router.post("/face/liveness", mobileAppMiddleware, checkLiveness);
router.post("/face/detect", mobileAppMiddleware, detectFace);
router.post("/face/verify", mobileAppMiddleware, verifyFaces);

// Lifetime-access subscription status - gated behind the logged-in
// candidate's own auth token (from /api/auth/login-contact-password etc).
router.get("/subscription/status", authMiddleware, userMiddleware, getStatus);
router.post(
  "/subscription/activate",
  authMiddleware,
  userMiddleware,
  activate,
);

module.exports = router;
