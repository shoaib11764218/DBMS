import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Course from "../models/Course.js";
import Feedback from "../models/Feedback.js";
import User from "../models/User.js";
import ProfessorInvite from "../models/ProfessorInvite.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = Router();

router.get("/invitations", protect, adminOnly, async (_req, res, next) => {
  try {
    const invitations = await ProfessorInvite.find({
      usedAt: null,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .select("_id createdAt expiresAt")
      .lean();
    return res.json(invitations);
  } catch (error) {
    return next(error);
  }
});

router.post("/invitations", protect, adminOnly, async (req, res, next) => {
  try {
    const code = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await ProfessorInvite.create({
      codeHash: createHash("sha256").update(code).digest("hex"),
      createdBy: req.user._id,
      expiresAt
    });
    return res.status(201).json({
      id: invitation._id,
      code,
      expiresAt: invitation.expiresAt
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/invitations/:id", protect, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Invitation not found." });
    }
    const invitation = await ProfessorInvite.findOneAndDelete({
      _id: req.params.id,
      usedAt: null
    });
    if (!invitation) return res.status(404).json({ message: "Invitation not found or already used." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard", protect, adminOnly, async (_req, res, next) => {
  try {
    const [courses, stats, recentFeedback, overallStats, ratingGroups, accountGroups, pendingCourseCount] = await Promise.all([
      Course.find().sort({ code: 1 }).lean(),
      Feedback.aggregate([
        {
          $group: {
            _id: "$course",
            averageRating: { $avg: "$rating" },
            feedbackCount: { $sum: 1 }
          }
        }
      ]),
      Feedback.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("student", "name")
        .populate("course", "code title")
        .lean(),
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            feedbackCount: { $sum: 1 }
          }
        }
      ]),
      Feedback.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]),
      Course.countDocuments({ status: "pending" })
    ]);

    const statsByCourse = new Map(
      stats.map((item) => [
        item._id.toString(),
        {
          averageRating: Number(item.averageRating.toFixed(1)),
          feedbackCount: item.feedbackCount
        }
      ])
    );
    const courseSummaries = courses.map((course) => ({
      ...course,
      ...(statsByCourse.get(course._id.toString()) || {
        averageRating: 0,
        feedbackCount: 0
      })
    }));

    return res.json({
      courseCount: courses.length,
      pendingCourseCount,
      feedbackCount: overallStats[0]?.feedbackCount ?? 0,
      averageRating: overallStats[0]
        ? Number(overallStats[0].averageRating.toFixed(1))
        : 0,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: ratingGroups.find((item) => item._id === rating)?.count ?? 0
      })),
      accountCounts: Object.fromEntries(accountGroups.map((item) => [item._id, item.count])),
      totalAccounts: accountGroups.reduce((total, item) => total + item.count, 0),
      courses: courseSummaries,
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
          createdAt: item.createdAt
        }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/accounts/admin", protect, adminOnly, async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 12) {
      return res.status(400).json({ message: "Administrator password must be at least 12 characters." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "admin" });
    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/courses/:id/approve", protect, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Course not found." });
    }
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: "approved" } },
      { new: true, runValidators: true }
    );
    if (!course) return res.status(404).json({ message: "Pending course not found." });
    return res.json({ course });
  } catch (error) {
    return next(error);
  }
});

router.delete("/courses/:id", protect, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Course not found." });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });
    await Feedback.deleteMany({ course: course._id });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
