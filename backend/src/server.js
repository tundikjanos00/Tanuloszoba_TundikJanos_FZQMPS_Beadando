import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { JsonStore } from "./store.js";
import { authMiddleware, requireAuth, requireRole, sanitizeUser, signToken, verifyPassword } from "./auth.js";

const app = express();
const store = new JsonStore();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(authMiddleware(store));

const isAdmin = (user) => user?.roles.includes("ADMIN");
const isTeacher = (user) => user?.roles.includes("TEACHER") || isAdmin(user);
const canEditTeacherContent = (user, teacherId) => isAdmin(user) || user?.id === teacherId;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Tanulószoba" });
});

app.post("/api/auth/login", (req, res) => {
  const user = store.findUserByEmail(req.body.email);
  if (!user || !verifyPassword(req.body.password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  res.json({ token: signToken(user), user: sanitizeUser(user) });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

app.get("/api/subjects", (_req, res) => {
  res.json(store.data.subjects);
});

app.get("/api/teachers", (_req, res) => {
  const teachers = store.data.teacherProfiles
    .filter((profile) => profile.visible)
    .map((profile) => {
      const user = store.findUserById(profile.userId);
      return user ? { ...profile, user: sanitizeUser(user) } : profile;
    });
  res.json(teachers);
});

app.get("/api/topics", (req, res) => {
  const { teacherId, subjectId, grade, semester } = req.query;
  const topics = store.data.topics
    .filter((topic) => !teacherId || topic.teacherId === teacherId)
    .filter((topic) => !subjectId || topic.subjectId === subjectId)
    .filter((topic) => !grade || topic.grade === grade)
    .filter((topic) => !semester || topic.semester === semester)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "hu"));
  res.json(topics);
});

app.get("/api/materials", (req, res) => {
  res.json(store.listMaterials(req.query));
});

app.get("/api/materials/:id", (req, res) => {
  const material = store.data.materials.find((item) => item.id === req.params.id);
  if (!material) {
    return res.status(404).json({ message: "Material not found." });
  }
  res.json(material);
});

app.post("/api/topics", requireRole("ADMIN", "TEACHER"), (req, res) => {
  if (!req.body.title || !req.body.subjectId || !req.body.grade) {
    return res.status(400).json({ message: "Title, subject and grade are required." });
  }
  const teacherId = isAdmin(req.user) && req.body.teacherId ? req.body.teacherId : req.user.id;
  if (!canEditTeacherContent(req.user, teacherId)) {
    return res.status(403).json({ message: "You can only manage your own topics." });
  }
  res.status(201).json(store.createTopic(req.body, teacherId));
});

app.post("/api/materials", requireRole("ADMIN", "TEACHER"), (req, res) => {
  if (!req.body.title || !req.body.subjectId || !req.body.grade) {
    return res.status(400).json({ message: "Title, subject and grade are required." });
  }
  const teacherId = isAdmin(req.user) && req.body.teacherId ? req.body.teacherId : req.user.id;
  if (!canEditTeacherContent(req.user, teacherId)) {
    return res.status(403).json({ message: "You can only manage your own materials." });
  }
  res.status(201).json(store.createMaterial(req.body, teacherId));
});

app.put("/api/materials/:id", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const material = store.data.materials.find((item) => item.id === req.params.id);
  if (!material) {
    return res.status(404).json({ message: "Material not found." });
  }
  if (!canEditTeacherContent(req.user, material.teacherId)) {
    return res.status(403).json({ message: "You can only edit your own materials." });
  }
  res.json(store.updateMaterial(req.params.id, req.body));
});

app.delete("/api/materials/:id", requireRole("ADMIN", "TEACHER"), (req, res) => {
  const material = store.data.materials.find((item) => item.id === req.params.id);
  if (!material) {
    return res.status(404).json({ message: "Material not found." });
  }
  if (!canEditTeacherContent(req.user, material.teacherId)) {
    return res.status(403).json({ message: "You can only delete your own materials." });
  }
  store.deleteMaterial(req.params.id);
  res.status(204).send();
});

app.get("/api/admin/users", requireRole("ADMIN"), (_req, res) => {
  res.json(store.data.users.map(sanitizeUser));
});

app.patch("/api/admin/users/:id/roles", requireRole("ADMIN"), (req, res) => {
  const user = store.findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  const allowedRoles = new Set(["USER", "TEACHER", "ADMIN"]);
  user.roles = Array.isArray(req.body.roles) ? req.body.roles.filter((role) => allowedRoles.has(role)) : user.roles;
  if (user.roles.length === 0) {
    user.roles = ["USER"];
  }
  store.save();
  res.json(sanitizeUser(user));
});

app.get("/api/admin/teacher-profiles", requireRole("ADMIN"), (_req, res) => {
  res.json(store.data.teacherProfiles);
});

app.patch("/api/admin/teacher-profiles/:userId", requireRole("ADMIN"), (req, res) => {
  const user = store.findUserById(req.params.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  let profile = store.data.teacherProfiles.find((item) => item.userId === user.id);
  if (!profile) {
    profile = { userId: user.id, displayName: user.displayName, accentColor: "#2f6f5f", subjectIds: [], visible: true };
    store.data.teacherProfiles.push(profile);
  }
  profile.displayName = req.body.displayName ?? profile.displayName;
  profile.accentColor = req.body.accentColor ?? profile.accentColor;
  profile.subjectIds = Array.isArray(req.body.subjectIds) ? req.body.subjectIds : profile.subjectIds;
  profile.visible = typeof req.body.visible === "boolean" ? req.body.visible : profile.visible;
  store.save();
  res.json(profile);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

app.listen(PORT, () => {
  console.log(`Tanulószoba backend is running on http://localhost:${PORT}`);
});
