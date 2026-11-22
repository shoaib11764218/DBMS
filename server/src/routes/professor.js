import { Router } from "express";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Feedback from "../models/Feedback.js";
import { professorOnly, protect } from "../middleware/auth.js";

const router = Router();
router.use(protect, professorOnly);

router.get("/dashboard", async (req, res, next) => {
  try {
    const courses = await Course.find({ professor: req.user._id })
      .sort({ code: 1 })
      .lean();
    const courseIds = courses.map((course) => course._id);
    const [ratingGroups, recentFeedback, unclaimedCourses] = await Promise.all([
      courseIds.length
        ? Feedback.aggregate([
            { $match: { course: { $in: courseIds } } },
            { $group: { _id: { course: "$course", rating: "$rating" }, count: { $sum: 1 } } }
          ])
        : Promise.resolve([]),
      courseIds.length
        ? Feedback.find({ course: { $in: courseIds } })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("student", "name")
            .populate("course", "code title")
            .lean()
        : Promise.resolve([]),
      Course.find({ professor: null, status: { $ne: "pending" } })
        .select("code title instructor department description term")
        .lean()
    ]);
    const claimableCourses = unclaimedCourses.filter(
      (course) => course.instructor.trim().toLowerCase() === req.user.name.trim().toLowerCase()
    );

    const byCourse = new Map();
    for (const group of ratingGroups) {
      const courseId = group._id.course.toString();
      const stats = byCourse.get(courseId) || {
        feedbackCount: 0,
        ratingTotal: 0,
        ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }))
      };
      stats.feedbackCount += group.count;
      stats.ratingTotal += group._id.rating * group.count;
      stats.ratingDistribution[group._id.rating - 1].count = group.count;
      byCourse.set(courseId, stats);
    }

    const courseSummaries = courses.map((course) => {
      const stats = byCourse.get(course._id.toString()) || {
        feedbackCount: 0,
        ratingTotal: 0,
        ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: 0 }))
      };
      return {
        ...course,
        status: course.status || "approved",
        feedbackCount: stats.feedbackCount,
        averageRating: stats.feedbackCount
          ? Number((stats.ratingTotal / stats.feedbackCount).toFixed(1))
          : 0,
        ratingDistribution: stats.ratingDistribution
      };
    });

    const feedbackCount = ratingGroups.reduce((total, group) => total + group.count, 0);
    const weightedRating = ratingGroups.reduce(
      (total, group) => total + group._id.rating * group.count,
      0
    );

    return res.json({
      courseCount: courses.length,
      feedbackCount,
      averageRating: feedbackCount ? Number((weightedRating / feedbackCount).toFixed(1)) : 0,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: courseSummaries.reduce(
          (total, course) =>
            total + course.ratingDistribution[rating - 1].count,
          0
        )
      })),
      courses: courseSummaries,
      claimableCourses,
      recentFeedback: recentFeedback
        .filter((item) => item.course && item.student)
        .map((item) => ({
          id: item._id,
          courseId: item.course._id,
          courseCode: item.course.code,
          courseTitle: item.course.title,
          rating: item.rating,
          comment: item.comment,
          author: item.anonymous ? "Anonymous student" : item.student.name,
          reply: item.reply?.message
            ? {
                message: item.reply.message,
                repliedAt: item.reply.repliedAt
              }
            : null,
          createdAt: item.createdAt
        }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/courses", async (req, res, next) => {
  try {
    const fields = ["code", "title", "department", "description", "term"];
    const courseData = {};
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({ message: `${field} is required.` });
      }
      courseData[field] = value.trim();
    }
    if (courseData.description.length > 1000) {
      return res.status(400).json({ message: "Description must be at most 1000 characters." });
    }

    const course = await Course.create({
      ...courseData,
      instructor: req.user.name,
      professor: req.user._id,
      status: "pending"
    });
    return res.status(201).json(course);
  } catch (error) {
    return next(error);
  }
});

router.post("/courses/:courseId/claim", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(404).json({ message: "Course not found." });
    }
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (course.instructor.trim().toLowerCase() !== req.user.name.trim().toLowerCase()) {
      return res.status(403).json({ message: "You can only claim a course listed under your name." });
    }
    const claimed = await Course.findOneAndUpdate(
      { _id: course._id, professor: null },
      { $set: { professor: req.user._id } },
      { new: true, runValidators: true }
    );
    if (!claimed) {
      return res.status(409).json({ message: "This course is already assigned to a professor." });
    }
    return res.json({ message: "Course added to your faculty dashboard." });
  } catch (error) {
    return next(error);
  }
});

router.post("/feedback/:feedbackId/reply", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.feedbackId)) {
      return res.status(404).json({ message: "Feedback not found." });
    }
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 1000) {
      return res.status(400).json({ message: "Reply must be between 1 and 1000 characters." });
    }

    const feedback = await Feedback.findById(req.params.feedbackId);
    if (!feedback) return res.status(404).json({ message: "Feedback not found." });
    const ownsCourse = await Course.exists({
      _id: feedback.course,
      professor: req.user._id
    });
    if (!ownsCourse) {
      return res.status(403).json({ message: "You can only reply to feedback on your own courses." });
    }

    feedback.reply = {
      message,
      professor: req.user._id,
      repliedAt: new Date()
    };
    await feedback.save();
    return res.json({
      reply: {
        message: feedback.reply.message,
        repliedAt: feedback.reply.repliedAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
