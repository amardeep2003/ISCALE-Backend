const Candidate = require("../models/candidates");
const Enrollment = require("../models/course_enrollment");

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // =========================
    // USER DETAILS
    // =========================
    const user = await Candidate.findById(userId).select(
      "c_first_name c_last_name c_profile_image"
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // =========================
    // USER ENROLLMENTS
    // =========================
    const enrollments = await Enrollment.find({
      user_id: userId,
      status: 1,
    }).select("course_type");

    let freeCourses = 0;
    let premiumCourses = 0;

    enrollments.forEach((enrollment) => {
      if (Number(enrollment.course_type) === 1) {
        freeCourses++;
      }

      if (Number(enrollment.course_type) === 2) {
        premiumCourses++;
      }
    });

    return res.status(200).json({
      status: true,
      data: {
        name: `${user.c_first_name || ""} ${user.c_last_name || ""}`.trim(),
        profileImage: user.c_profile_image,
        freeCourses,
        premiumCourses,
      },
    });
  } catch (error) {
    console.log("Dashboard Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};