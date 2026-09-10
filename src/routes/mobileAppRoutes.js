const express = require("express");
const router = express.Router();

const { mobileAppMiddleware } = require("../middlewares/mobileAppMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { userMiddleware } = require("../middlewares/userMiddleware");
const {
  health,
  checkLiveness,
  detectFace,
  verifyLoginFace,
  enrollFace,
  getFaceStatus,
} = require("../controllers/mobileFaceController");
const {
  getStatus,
  createOrder,
  verifyPayment,
} = require("../controllers/mobileSubscriptionController");

// Public health check for the iScale mobile app (no app-key required).
router.get("/health", health);

// Stateless MXFace proxies (no candidate identity involved) - gated behind
// the mobile app's shared secret.
router.post("/face/liveness", mobileAppMiddleware, checkLiveness);
router.post("/face/detect", mobileAppMiddleware, detectFace);

// Face enrollment and login-match are gated behind the candidate's own auth
// token (not the shared app-key): enrollment writes to that specific
// account, and matching is now "does this photo match *this* logged-in
// account's enrolled identity on MXFace" rather than a stateless two-image
// compare, so both need to know who's asking.
router.post("/face/enroll", authMiddleware, userMiddleware, enrollFace);
router.get("/face/status", authMiddleware, userMiddleware, getFaceStatus);
router.post("/face/verify", authMiddleware, userMiddleware, verifyLoginFace);

// Lifetime-access subscription - gated behind the logged-in candidate's own
// auth token (from /api/auth/login-contact-password etc). Activation only
// happens after a verified Razorpay payment (see verifyPayment) - there is
// deliberately no self-serve "just flip the flag" endpoint anymore; the
// admin panel's manual toggle (appUserController.toggleLifetimeAccess)
// covers comps/support/refunds instead.
router.get("/subscription/status", authMiddleware, userMiddleware, getStatus);
router.post(
  "/subscription/create-order",
  authMiddleware,
  userMiddleware,
  createOrder,
);
router.post(
  "/subscription/verify-payment",
  authMiddleware,
  userMiddleware,
  verifyPayment,
);

module.exports = router;
