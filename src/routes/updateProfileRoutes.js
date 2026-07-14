const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");
const { userMiddleware } = require("../middlewares/userMiddleware");
const { emailChangeMiddleware } = require("../middlewares/emailChangeMiddleware");
const { candidateUpload } = require("../middlewares/uploadMiddleware");
const updateProfileController = require("../controllers/updateProfileController");
const emailChangeController = require("../controllers/emailChangeController");
const mobileChangeController = require("../controllers/mobileChangeController");

//  Get profile (prefill form)
router.get(
  "/",
  authMiddleware,
  userMiddleware,
  updateProfileController.getProfile,
);

//  Update profile
router.put(
  "/",
  authMiddleware,
  userMiddleware,
  updateProfileController.updateProfile,
);

// update password
router.put(
  "/change-password",
  authMiddleware,
  userMiddleware,
  updateProfileController.changePassword,
);

// update profile image
router.put(
  "/update_profile_image",
  authMiddleware,
  userMiddleware,
  candidateUpload,
  updateProfileController.updateProfileImage,
);

// update profile image
router.get(
  "/get_profile_image",
  authMiddleware,
  userMiddleware,
  updateProfileController.getProfileImage,
);

// Email change flow (OTP on current email -> emailChangeToken -> OTP on new email)
router.post(
  "/email/send-current-otp",
  authMiddleware,
  userMiddleware,
  emailChangeController.sendCurrentEmailOtp,
);

router.post(
  "/email/verify-current-otp",
  authMiddleware,
  userMiddleware,
  emailChangeController.verifyCurrentEmailOtp,
);

router.post(
  "/email/send-new-otp",
  authMiddleware,
  userMiddleware,
  emailChangeMiddleware,
  emailChangeController.sendNewEmailOtp,
);

router.post(
  "/email/verify-new-otp",
  authMiddleware,
  userMiddleware,
  emailChangeMiddleware,
  emailChangeController.verifyNewEmailOtp,
);

// Mobile number add/change flow (OTP on current number, if any -> mobileChangeToken -> OTP on new number)
router.post(
  "/mobile/send-current-otp",
  authMiddleware,
  userMiddleware,
  mobileChangeController.sendCurrentMobileOtp,
);

router.post(
  "/mobile/verify-current-otp",
  authMiddleware,
  userMiddleware,
  mobileChangeController.verifyCurrentMobileOtp,
);

router.post(
  "/mobile/send-new-otp",
  authMiddleware,
  userMiddleware,
  mobileChangeController.sendNewMobileOtp,
);

router.post(
  "/mobile/verify-new-otp",
  authMiddleware,
  userMiddleware,
  mobileChangeController.verifyNewMobileOtp,
);

// Mobile Apis=============================================================================================================================

router.put(
  "/update_user",
  authMiddleware,
  userMiddleware,
  updateProfileController.appUpdateUserProfileApp,
);

module.exports = router;
