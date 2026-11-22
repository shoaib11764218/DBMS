import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please sign in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email role");
    if (!user) {
      return res.status(401).json({ message: "Your account could not be found." });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Administrator access is required." });
  }
  return next();
}

export function professorOnly(req, res, next) {
  if (req.user.role !== "professor") {
    return res.status(403).json({ message: "Professor access is required." });
  }
  return next();
}
