const express = require("express");
const router = express.Router();

const { playVideo } = require("../controllers/videoController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { userMiddleware } = require("../middlewares/userMiddleware");

// playVideo checks enrollment/payment/expiry itself (takes topic_id from
// the body, not a :subject_id param, so checkCourseAccessMiddleware
// doesn't apply here the way it does on /topics/private/:subject_id).
router.post("/play_video", authMiddleware, userMiddleware, playVideo);

module.exports = router;


