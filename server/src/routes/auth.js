import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import User from "../models/User.js";
import ProfessorInvite from "../models/ProfessorInvite.js";
import { protect } from "../middleware/auth.js";

const router = Router();

function createToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role === "professor" ? "professor" : "student";
    const invitationCode =
      typeof req.body.invitationCode === "string" ? req.body.invitationCode.trim() : "";

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let invitation = null;
    if (role === "professor") {
      if (!invitationCode) {
        return res.status(400).json({ message: "A professor invitation code is required." });
      }
      const codeHash = createHash("sha256").update(invitationCode).digest("hex");
      invitation = await ProfessorInvite.findOneAndUpdate(
        { codeHash, usedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
        { new: true }
      );
      if (!invitation) {
        return res.status(403).json({ message: "This professor invitation code is invalid, expired, or already used." });
      }
    }

    let user;
    try {
      user = await User.create({ name, email, passwordHash, role });
    } catch (error) {
      if (invitation) {
        await ProfessorInvite.updateOne(
          { _id: invitation._id, usedAt: invitation.usedAt },
          { $set: { usedAt: null, usedBy: null } }
        );
      }
      return next(error);
    }
    if (invitation) {
      await ProfessorInvite.updateOne(
        { _id: invitation._id },
        { $set: { usedBy: user._id } }
      );
    }
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
