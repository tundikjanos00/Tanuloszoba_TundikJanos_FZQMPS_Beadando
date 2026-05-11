import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function seedData() {
  const adminId = "user_admin";
  const teacherId = "user_teacher";
  const studentId = "user_student";
  const historyTopic = "topic_rome";
  const literatureTopic = "topic_poetry";
  return {
    users: [
      {
        id: adminId,
        email: "admin@tanuloszoba.local",
        displayName: "Tanulószoba Admin",
        roles: ["ADMIN", "TEACHER"],
        passwordHash: hashPassword("Admin123!"),
        createdAt: now()
      },
      {
        id: teacherId,
        email: "teacher@tanuloszoba.local",
        displayName: "Minta Tanár",
        roles: ["TEACHER"],
        passwordHash: hashPassword("Teacher123!"),
        createdAt: now()
      },
      {
        id: studentId,
        email: "student@tanuloszoba.local",
        displayName: "Diák Vendég",
        roles: ["USER"],
        passwordHash: hashPassword("Student123!"),
        createdAt: now()
      }
    ],
    subjects: [
      { id: "history", name: "Történelem", color: "#9d4634" },
      { id: "literature", name: "Irodalom", color: "#6d4c91" },
      { id: "grammar", name: "Nyelvtan", color: "#2f6f73" },
      { id: "it", name: "Informatika", color: "#2f5f9d" }
    ],
    teacherProfiles: [
      {
        userId: adminId,
        displayName: "Kontros Jankó",
        accentColor: "#2f6f5f",
        subjectIds: ["history", "literature", "grammar", "it"],
        visible: true
      },
      {
        userId: teacherId,
        displayName: "Minta Tanár",
        accentColor: "#9d4634",
        subjectIds: ["history", "literature"],
        visible: true
      }
    ],
    topics: [
      {
        id: historyTopic,
        teacherId,
        subjectId: "history",
        grade: "5",
        semester: "",
        title: "Ókori Róma",
        order: 1,
        createdAt: now()
      },
      {
        id: literatureTopic,
        teacherId,
        subjectId: "literature",
        grade: "7",
        semester: "",
        title: "Lírai műfajok",
        order: 1,
        createdAt: now()
      }
    ],
    materials: [
      {
        id: "mat_rome",
        teacherId,
        subjectId: "history",
        topicId: historyTopic,
        grade: "5",
        semester: "",
        title: "Róma alapítása és a köztársaság",
        summary: "Áttekintő tananyag az ókori Róma korai történetéről.",
        body: "A tananyag bemutatja Róma mondai alapítását, a királyság korát és a köztársaság kialakulását. A diákok megismerik a patríciusok és plebejusok szerepét, valamint a köztársasági intézmények alapjait.",
        links: ["https://hu.wikipedia.org/wiki/%C3%93kori_R%C3%B3ma"],
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: "mat_poetry",
        teacherId,
        subjectId: "literature",
        topicId: literatureTopic,
        grade: "7",
        semester: "",
        title: "A dal és az elégia",
        summary: "Rövid, ismétlő jellegű tananyag lírai műfajokról.",
        body: "A dal személyes hangvételű, rövidebb lírai műfaj. Az elégia elmélyültebb, elmélkedőbb szövegtípus, gyakran veszteségélményt vagy számvetést fogalmaz meg.",
        links: [],
        createdAt: now(),
        updatedAt: now()
      }
    ]
  };
}

export class JsonStore {
  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      this.data = seedData();
      this.save();
    } else {
      this.data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    }
  }

  save() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
  }

  findUserById(userId) {
    return this.data.users.find((user) => user.id === userId);
  }

  findUserByEmail(email) {
    return this.data.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
  }

  listMaterials(filters = {}) {
    return this.data.materials
      .filter((material) => !filters.teacherId || material.teacherId === filters.teacherId)
      .filter((material) => !filters.subjectId || material.subjectId === filters.subjectId)
      .filter((material) => !filters.grade || material.grade === filters.grade)
      .filter((material) => !filters.semester || material.semester === filters.semester)
      .filter((material) => {
        if (!filters.query) return true;
        const needle = filters.query.toLowerCase();
        return [material.title, material.summary, material.body].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((a, b) => a.title.localeCompare(b.title, "hu"));
  }

  createTopic(payload, teacherId) {
    const topic = {
      id: id("topic"),
      teacherId,
      subjectId: payload.subjectId,
      grade: payload.grade,
      semester: payload.semester || "",
      title: payload.title,
      order: this.data.topics.length + 1,
      createdAt: now()
    };
    this.data.topics.push(topic);
    this.save();
    return topic;
  }

  createMaterial(payload, teacherId) {
    const material = {
      id: id("mat"),
      teacherId,
      subjectId: payload.subjectId,
      topicId: payload.topicId || "",
      grade: payload.grade,
      semester: payload.semester || "",
      title: payload.title,
      summary: payload.summary || "",
      body: payload.body || "",
      links: Array.isArray(payload.links) ? payload.links : [],
      createdAt: now(),
      updatedAt: now()
    };
    this.data.materials.push(material);
    this.save();
    return material;
  }

  updateMaterial(materialId, payload) {
    const material = this.data.materials.find((item) => item.id === materialId);
    if (!material) return null;
    Object.assign(material, {
      subjectId: payload.subjectId ?? material.subjectId,
      topicId: payload.topicId ?? material.topicId,
      grade: payload.grade ?? material.grade,
      semester: payload.semester ?? material.semester,
      title: payload.title ?? material.title,
      summary: payload.summary ?? material.summary,
      body: payload.body ?? material.body,
      links: Array.isArray(payload.links) ? payload.links : material.links,
      updatedAt: now()
    });
    this.save();
    return material;
  }

  deleteMaterial(materialId) {
    const before = this.data.materials.length;
    this.data.materials = this.data.materials.filter((item) => item.id !== materialId);
    this.save();
    return this.data.materials.length !== before;
  }
}

