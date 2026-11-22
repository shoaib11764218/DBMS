import { Router } from "express";
import Course from "../models/Course.js";
import Feedback from "../models/Feedback.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/course/:courseId", async (req, res, next) => {
  try {
    const approvedCourse = await Course.exists({
      _id: req.params.courseId,
      status: { $ne: "pending" }
    });
    if (!approvedCourse) {
      return res.status(404).json({ message: "Course not found or not yet approved." });
    }
    const feedback = await Feedback.find({ course: req.params.courseId })
      .sort({ createdAt: -1 })
      .populate("student", "name")
      .populate("reply.professor", "name")
      .lean();
    return res.json(
      feedback.map((item) => ({
        id: item._id,
        rating: item.rating,
        comment: item.comment,
        anonymous: item.anonymous,
        author: item.anonymous ? "Anonymous student" : item.student.name,
        reply: item.reply?.message
          ? {
              message: item.reply.message,
              repliedAt: item.reply.repliedAt
            }
          : null,
        createdAt: item.createdAt
      }))
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/mine/:courseId", protect, async (req, res, next) => {
  try {
    const feedback = await Feedback.findOne({
      course: req.params.courseId,
      student: req.user._id
    }).lean();
    return res.json(feedback);
  } catch (error) {
    return next(error);
  }
});

router.post("/course/:courseId", protect, async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only student accounts can submit feedback." });
    }

    const course = await Course.exists({
      _id: req.params.courseId,
      status: { $ne: "pending" }
    });
    if (!course) return res.status(404).json({ message: "Course not found." });

    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === "string" ? req.body.comment.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Choose a rating from 1 to 5." });
    }
    if (!comment || comment.length > 1000) {
      return res.status(400).json({ message: "Feedback must be between 1 and 1000 characters." });
    }
    const existing = await Feedback.findOne({ course: req.params.courseId, student: req.user._id });
    if (existing) {
      return res.status(409).json({ message: "You have already submitted feedback for this course." });
    }

    const feedback = await Feedback.create({
      course: req.params.courseId,
      student: req.user._id,
      rating,
      comment,
      anonymous: req.body.anonymous === true
    });
    return res.status(201).json(feedback);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already submitted feedback for this course." });
    }
    return next(error);
  }
});

export default router;
