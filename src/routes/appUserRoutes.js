const express = require("express");
const router = express.Router();

const {
  getAllUsers,
  getSingleUser,
  editUser,
  searchUsersForDropdown,
  deleteUser,
  toggleAdminVerified,
} = require("../controllers/appUserController");
const { candidateUpload } = require("../middlewares/uploadMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { adminMiddleware } = require("../middlewares/adminMiddleware");

router.get("/all", authMiddleware, adminMiddleware, getAllUsers);

router.get("/single/:id", authMiddleware, adminMiddleware, getSingleUser);

router.put(
  "/edit/:id",
  authMiddleware,
  adminMiddleware,
  candidateUpload,
  editUser,
);

router.get("/search", authMiddleware, adminMiddleware, searchUsersForDropdown);
router.delete("/delete/:id", authMiddleware, adminMiddleware, deleteUser);

// Toggles c_admin_verified - the manual override behind the "Verified"
// badge (isVerified = c_mobile_verified || c_email_verified || c_admin_verified)
router.patch(
  "/toggle-verified/:id",
  authMiddleware,
  adminMiddleware,
  toggleAdminVerified,
);

module.exports = router;
