import { Router } from "express";
import Course from "../models/Course.js";
import Feedback from "../models/Feedback.js";
import { adminOnly, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const filter = search
      ? {
          $or: ["title", "code", "instructor", "department"].map((field) => ({
            [field]: { $regex: search, $options: "i" }
          }))
        }
      : {};

    const courses = await Course.find({ ...filter, status: { $ne: "pending" } }).sort({ createdAt: -1 }).lean();
    const stats = await Feedback.aggregate([
      { $group: { _id: "$course", averageRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    const byCourse = new Map(stats.map((item) => [item._id.toString(), item]));
    return res.json(
      courses.map((course) => {
        const stat = byCourse.get(course._id.toString());
        return {
          ...course,
          averageRating: stat ? Number(stat.averageRating.toFixed(1)) : 0,
          feedbackCount: stat?.count ?? 0
        };
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, status: { $ne: "pending" } }).lean();
    if (!course) return res.status(404).json({ message: "Course not found or not yet approved." });

    const stats = await Feedback.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: null, averageRating: { $avg: "$rating" }, count: { $sum: 1 } } }
    ]);
    const stat = stats[0];
    return res.json({
      ...course,
      averageRating: stat ? Number(stat.averageRating.toFixed(1)) : 0,
      feedbackCount: stat?.count ?? 0
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const fields = ["code", "title", "instructor", "department", "description", "term"];
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
    const course = await Course.create(courseData);
    return res.status(201).json(course);
  } catch (error) {
    return next(error);
  }
});

export default router;
