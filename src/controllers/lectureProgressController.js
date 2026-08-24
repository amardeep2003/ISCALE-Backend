const LectureProgress = require("../models/lecture_progress");
const Lecture = require("../models/lecture");
const Subject = require("../models/subject");
const Enrollment = require("../models/course_enrollment");
const mongoose = require("mongoose");

// Returns the enrollment if the student currently has active, unexpired
// access to this course - or null otherwise (not enrolled, inactive,
// unpaid, or a time-limited grant that has expired). Mirrors the checks in
// checkCourseAccessMiddleware.js, which only covers the /topics/private
// route - lecture-progress has its own set of routes that need the same
// gate rather than only checking "an enrollment row exists at all".
const getActiveEnrollment = async (userId, courseId) => {
  const enrollment = await Enrollment.findOne({
    user_id: userId,
    course_id: courseId,
    status: 1,
  });

  if (!enrollment) return null;

  if (enrollment.course_type === 2 && enrollment.payment_status !== 1) {
    return null;
  }

  if (
    enrollment.access_type === "limited" &&
    enrollment.expiry_date &&
    new Date() > new Date(enrollment.expiry_date)
  ) {
    return null;
  }

  return enrollment;
};

const getSubjectsByCourseId = async (courseId) => {
  return Subject.aggregate([
    {
      $match: {
        $expr: {
          $eq: [{ $toString: "$m_subject_course" }, courseId.toString()],
        },
      },
    },
    {
      $project: {
        _id: 1,
        m_subject_title: 1,
        m_subject_course: 1,
      },
    },
  ]);
};

exports.markLectureComplete = async (req, res) => {
  try {
    const { lecture_id } = req.body;

    if (!lecture_id) {
      return res.status(400).json({
        status: false,
        message: "Lecture ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(lecture_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid lecture ID",
      });
    }

    // 1. Lecture check
    const lecture = await Lecture.findById(lecture_id);
    if (!lecture) {
      return res.status(404).json({
        status: false,
        message: "Lecture not found",
      });
    }

    // 2. Subject → Course find
    // 2. Subject -> Course find
    const subject = await Subject.findById(lecture.ml_subject);

    if (!subject) {
      return res.status(404).json({
        status: false,
        message: "Subject not found for this lecture",
      });
    }

    const courseId = subject.m_subject_course;

    if (!courseId) {
      return res.status(404).json({
        status: false,
        message: "Course not found for this subject",
      });
    }

    if (!lecture.ml_course) {
      await Lecture.updateOne(
        { _id: lecture._id },
        { ml_course: courseId },
      );
      lecture.ml_course = courseId;
    }

    // 3. Enrollment check
    const enrollment = await getActiveEnrollment(req.user.id, courseId);

    if (!enrollment) {
      return res.status(403).json({
        status: false,
        message: "You don't have active access to this course",
      });
    }

    // 4. Mark complete
    await LectureProgress.findOneAndUpdate(
      {
        user_id: req.user.id,
        lecture_id,
      },
      {
        subject_id: subject._id,
        course_id: courseId,
        is_completed: true,
        completed_at: new Date(),
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    // 5. 🔥 PROGRESS UPDATE CALL
    const progressData = await updateCourseProgress(
      req.user.id,
      courseId,
      subject._id,
    );

    return res.json({
      status: true,
      message: "Lecture completed",
      data: progressData,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

const updateCourseProgress = async (userId, courseId, currentSubjectId = null) => {
  // 1. All subjects of course
  const subjects = await getSubjectsByCourseId(courseId);

  const subjectIds = subjects.map((s) => s._id.toString());

  if (currentSubjectId) {
    const currentSubject = currentSubjectId.toString();
    if (!subjectIds.includes(currentSubject)) {
      subjectIds.push(currentSubject);
    }
  }

  // 2. Total lectures
  const lectureFilter = { ml_subject: { $in: subjectIds } };

  const totalLectures = await Lecture.countDocuments(lectureFilter);

  // 3. Lecture IDs
  const lectureIds = await Lecture.find(lectureFilter).distinct("_id");

  // 4. Completed lectures
  const completedLectures = await LectureProgress.countDocuments({
    user_id: userId,
    lecture_id: { $in: lectureIds },
    is_completed: true,
  });

  // 5. Percentage
  const progress =
    totalLectures === 0
      ? 0
      : Math.round((completedLectures / totalLectures) * 100);

  // 6. Update enrollment
  await Enrollment.updateOne(
    { user_id: userId, course_id: courseId },
    { progress },
  );

  return {
    course_id: courseId,
    total_subjects: subjectIds.length,
    total_lectures: totalLectures,
    completed_lectures: completedLectures,
    progress,
  };
};

exports.getCourseProgress = async (req, res) => {
  try {
    const { course_id } = req.params;

    if (!course_id) {
      return res.status(400).json({
        status: false,
        message: "Course ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid course ID",
      });
    }

    const enrollment = await getActiveEnrollment(req.user.id, course_id);

    if (!enrollment) {
      return res.status(403).json({
        status: false,
        message: "You don't have active access to this course",
      });
    }

    const progressData = await updateCourseProgress(req.user.id, course_id);

    return res.json({
      status: true,
      message: "Course progress fetched",
      data: progressData,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getLecturesWithProgress = async (req, res) => {
  try {
    const { subject_id } = req.params;

    if (!subject_id) {
      return res.status(400).json({
        status: false,
        message: "Subject ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subject_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(subject_id);

    if (!subject) {
      return res.status(404).json({
        status: false,
        message: "Subject not found",
      });
    }

    const enrollment = await getActiveEnrollment(req.user.id, subject.m_subject_course);

    if (!enrollment) {
      return res.status(403).json({
        status: false,
        message: "You don't have active access to this course",
      });
    }

    const lectures = await Lecture.find({
      ml_subject: subject_id,
    }).lean();

    const lectureIds = lectures.map((l) => l._id);

    const completed = await LectureProgress.find({
      user_id: req.user.id,
      lecture_id: { $in: lectureIds },
      is_completed: true,
    }).select("lecture_id");

    const completedSet = new Set(completed.map((c) => c.lecture_id.toString()));

    const finalData = lectures.map((l) => ({
      ...l,
      is_completed: completedSet.has(l._id.toString()),
    }));

    return res.json({
      status: true,
      data: finalData,
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getCourseProgressDebug = async (req, res) => {
  try {
    const { course_id } = req.params;

    if (!course_id) {
      return res.status(400).json({
        status: false,
        message: "Course ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(course_id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid course ID",
      });
    }

    const enrollment = await getActiveEnrollment(req.user.id, course_id);

    if (!enrollment) {
      return res.status(403).json({
        status: false,
        message: "You don't have active access to this course",
      });
    }

    const subjects = await getSubjectsByCourseId(course_id);

    const subjectIds = subjects.map((subject) => subject._id.toString());

    const lecturesBySubject = await Lecture.find({
      ml_subject: { $in: subjectIds },
    }).select("_id ml_title ml_subject ml_course");

    const lecturesByCourse = await Lecture.find({
      ml_course: course_id,
    }).select("_id ml_title ml_subject ml_course");

    return res.json({
      status: true,
      data: {
        course_id,
        subjects_count: subjects.length,
        subjects,
        lectures_by_subject_count: lecturesBySubject.length,
        lectures_by_subject: lecturesBySubject,
        lectures_by_course_count: lecturesByCourse.length,
        lectures_by_course: lecturesByCourse,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
