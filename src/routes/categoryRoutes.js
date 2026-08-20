const express = require("express");
const router = express.Router();

const { upload } = require("../middlewares/uploadMiddleware");
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  appGetCategoryWiseCourses,
  appGetCategories,
  appGetCoursesByCategory,
  publicGetCategories
} = require("../controllers/categoryController");
const { adminMiddleware } = require("../middlewares/adminMiddleware");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { userMiddleware } = require("../middlewares/userMiddleware");

// multiple file upload
router.post(
  "/add-category",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "category_icon", maxCount: 1 },
    { name: "category_banner", maxCount: 1 },
  ]),
  createCategory,
);

// GET ALL CATEGORIES
router.get(
  "/all-categories",
  authMiddleware,
  adminMiddleware,
  getAllCategories,
);

router.put(
  "/update-category/:id",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "category_icon", maxCount: 1 },
    { name: "category_banner", maxCount: 1 },
  ]),
  updateCategory,
);

router.delete(
  "/delete-category/:id",
  authMiddleware,
  adminMiddleware,
  deleteCategory,
);

// Public web frontend (no auth) ==========================================================================================================

router.get("/public-categories", publicGetCategories);

// Mobile Apis=============================================================================================================================


router.get("/get_category_courses",authMiddleware,userMiddleware, appGetCategoryWiseCourses);

router.get("/get/categories",authMiddleware,userMiddleware, appGetCategories);

router.post("/get/courses",authMiddleware,userMiddleware, appGetCoursesByCategory);

module.exports = router;
