import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api, buildQuery } from "./api";
import { useAuth } from "./state/AuthContext";
import type { Material, Role, Subject, TeacherProfile, Topic, User } from "./types";

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "university"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

type CatalogData = {
  subjects: Subject[];
  teachers: TeacherProfile[];
  topics: Topic[];
  materials: Material[];
};

const emptyCatalog: CatalogData = {
  subjects: [],
  teachers: [],
  topics: [],
  materials: []
};

function gradeLabel(grade: string, semester?: string) {
  if (grade === "university") {
    return semester ? `Egyetem, ${semester}. félév` : "Egyetem";
  }
  return `${grade}. osztály`;
}

function useCatalog(query: Record<string, string | undefined> = {}) {
  const [data, setData] = useState<CatalogData>(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const [subjects, teachers, topics, materials] = await Promise.all([
        api<Subject[]>("/api/subjects"),
        api<TeacherProfile[]>("/api/teachers"),
        api<Topic[]>(`/api/topics${buildQuery(query)}`),
        api<Material[]>(`/api/materials${buildQuery(query)}`)
      ]);
      setData({ subjects, teachers, topics, materials });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nem sikerült betölteni az adatokat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // A query objektumot a hívó useMemo-val stabilizálja, ahol szükséges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  return { data, loading, error, reload };
}

export function App() {
  return (
    <div className="app-shell">
      <TopNavigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/materials/:id" element={<MaterialPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/teacher" element={<Protected requireTeacher><TeacherPage /></Protected>} />
        <Route path="/admin" element={<Protected requireAdmin><AdminPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function TopNavigation() {
  const { user, isAdmin, isTeacher, logout } = useAuth();
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        <span className="brand-mark">T</span>
        <span>
          <strong>Tanulószoba</strong>
          <small>tananyagok és tanári tudástár</small>
        </span>
      </Link>
      <nav>
        <NavLink to="/">Tananyagok</NavLink>
        {isTeacher && <NavLink to="/teacher">Tanári felület</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="account-box">
        {user ? (
          <>
            <span>{user.displayName}</span>
            <button className="ghost" onClick={logout}>Kilépés</button>
          </>
        ) : (
          <Link className="button ghost" to="/login">Belépés</Link>
        )}
      </div>
    </header>
  );
}

function Protected({ children, requireAdmin, requireTeacher }: { children: ReactNode; requireAdmin?: boolean; requireTeacher?: boolean }) {
  const { user, isAdmin, isTeacher } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  if (requireTeacher && !isTeacher) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function HomePage() {
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [query, setQuery] = useState("");
  const filters = useMemo(() => ({ teacherId, subjectId, grade, semester, query }), [teacherId, subjectId, grade, semester, query]);
  const { data, loading, error } = useCatalog(filters);

  const selectedTeacher = data.teachers.find((teacher) => teacher.userId === teacherId);
  const accent = selectedTeacher?.accentColor ?? "#2f6f5f";

  return (
    <main className="page">
      <section className="hero" style={{ "--accent": accent } as CSSProperties}>
        <div>
          <p className="eyebrow">Publikus tananyagtár</p>
          <h1>Tanulószoba</h1>
          <p>Vázlatok, ismétlő anyagok és rövid magyarázatok rendezett, tanulóbarát felületen.</p>
        </div>
        <div className="hero-panel">
          <strong>{data.materials.length}</strong>
          <span>elérhető tananyag</span>
        </div>
      </section>

      <section className="catalog-layout">
        <aside className="filter-panel">
          <label>
            Tanár
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Minden tanár</option>
              {data.teachers.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.displayName}</option>)}
            </select>
          </label>
          <label>
            Tantárgy
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">Minden tantárgy</option>
              {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label>
            Évfolyam
            <select value={grade} onChange={(event) => { setGrade(event.target.value); setSemester(""); }}>
              <option value="">Minden évfolyam</option>
              {GRADES.map((item) => <option key={item} value={item}>{item === "university" ? "Egyetem" : `${item}. osztály`}</option>)}
            </select>
          </label>
          {grade === "university" && (
            <label>
              Félév
              <select value={semester} onChange={(event) => setSemester(event.target.value)}>
                <option value="">Minden félév</option>
                {SEMESTERS.map((item) => <option key={item} value={item}>{item}. félév</option>)}
              </select>
            </label>
          )}
          <label>
            Keresés
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="cím vagy kulcsszó" />
          </label>
        </aside>

        <section className="content-panel">
          {loading && <div className="notice">Tananyagok betöltése...</div>}
          {error && <div className="notice error">{error}</div>}
          {!loading && data.materials.length === 0 && <EmptyState />}
          <div className="material-grid">
            {data.materials.map((material) => (
              <MaterialCard key={material.id} material={material} subjects={data.subjects} teachers={data.teachers} topics={data.topics} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function MaterialCard({ material, subjects, teachers, topics }: { material: Material; subjects: Subject[]; teachers: TeacherProfile[]; topics: Topic[] }) {
  const subject = subjects.find((item) => item.id === material.subjectId);
  const teacher = teachers.find((item) => item.userId === material.teacherId);
  const topic = topics.find((item) => item.id === material.topicId);
  return (
    <article className="material-card" style={{ "--accent": subject?.color ?? "#2f6f5f" } as CSSProperties}>
      <span className="tag">{subject?.name ?? "Tananyag"}</span>
      <h2>{material.title}</h2>
      <p>{material.summary || material.body.slice(0, 140)}</p>
      <div className="meta-row">
        <span>{teacher?.displayName ?? "Tanár"}</span>
        <span>{gradeLabel(material.grade, material.semester)}</span>
        {topic && <span>{topic.title}</span>}
      </div>
      <Link className="button" to={`/materials/${material.id}`}>Megnyitás</Link>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h2>Nincs találat ezen a polcon.</h2>
      <p>Próbálj másik tantárgyat, évfolyamot vagy keresőkifejezést választani.</p>
    </div>
  );
}

function MaterialPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState<Material | null>(null);
  const [catalog, setCatalog] = useState<CatalogData>(emptyCatalog);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Material>(`/api/materials/${id}`),
      api<Subject[]>("/api/subjects"),
      api<TeacherProfile[]>("/api/teachers"),
      api<Topic[]>("/api/topics")
    ])
      .then(([materialData, subjects, teachers, topics]) => {
        setMaterial(materialData);
        setCatalog({ subjects, teachers, topics, materials: [] });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Nem található a tananyag."));
  }, [id]);

  if (error) {
    return <main className="page"><div className="notice error">{error}</div></main>;
  }
  if (!material) {
    return <main className="page"><div className="notice">Tananyag betöltése...</div></main>;
  }
  const subject = catalog.subjects.find((item) => item.id === material.subjectId);
  const teacher = catalog.teachers.find((item) => item.userId === material.teacherId);
  const topic = catalog.topics.find((item) => item.id === material.topicId);

  return (
    <main className="reader-page">
      <article className="reader-sheet">
        <Link className="back-link" to="/">Vissza a tananyagokhoz</Link>
        <p className="breadcrumb">{teacher?.displayName ?? "Tanár"} / {subject?.name ?? "Tantárgy"} / {gradeLabel(material.grade, material.semester)} / {topic?.title ?? "Fő téma nélkül"}</p>
        <h1>{material.title}</h1>
        <p className="lead">{material.summary}</p>
        {material.body.split("\n").filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {material.links.length > 0 && (
          <section className="link-list">
            <h2>Kapcsolódó linkek</h2>
            {material.links.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer">{link}</a>)}
          </section>
        )}
      </article>
    </main>
  );
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@tanuloszoba.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sikertelen belépés.");
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">JWT autentikáció</p>
        <h1>Belépés</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Jelszó<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="notice error">{error}</div>}
        <button>Belépés</button>
        <div className="demo-logins">
          <strong>Demo fiókok</strong>
          <span>admin@tanuloszoba.local / Admin123!</span>
          <span>teacher@tanuloszoba.local / Teacher123!</span>
          <span>student@tanuloszoba.local / Student123!</span>
        </div>
      </form>
    </main>
  );
}

function TeacherPage() {
  const { user, token, isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState(user?.id ?? "");
  const [topicTitle, setTopicTitle] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    summary: "",
    body: "",
    subjectId: "history",
    grade: "5",
    semester: "",
    topicId: "",
    links: ""
  });

  const activeTeacherId = isAdmin ? selectedTeacherId : user?.id ?? "";
  const teacherMaterials = materials.filter((material) => material.teacherId === activeTeacherId);
  const teacherTopics = topics.filter((topic) => topic.teacherId === activeTeacherId);

  const reload = async () => {
    const [subjectData, teacherData, topicData, materialData] = await Promise.all([
      api<Subject[]>("/api/subjects"),
      api<TeacherProfile[]>("/api/teachers"),
      api<Topic[]>("/api/topics"),
      api<Material[]>("/api/materials")
    ]);
    setSubjects(subjectData);
    setTeachers(teacherData);
    setTopics(topicData);
    setMaterials(materialData);
    if (!selectedTeacherId && teacherData[0]) setSelectedTeacherId(teacherData[0].userId);
  };

  useEffect(() => {
    reload().catch(() => setMessage("Nem sikerült betölteni a tanári adatokat."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTopic = async () => {
    if (!topicTitle.trim()) return;
    await api<Topic>("/api/topics", {
      method: "POST",
      body: JSON.stringify({ title: topicTitle, teacherId: activeTeacherId, subjectId: form.subjectId, grade: form.grade, semester: form.semester })
    }, token);
    setTopicTitle("");
    await reload();
  };

  const createMaterial = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    await api<Material>("/api/materials", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        teacherId: activeTeacherId,
        links: form.links.split("\n").map((link) => link.trim()).filter(Boolean)
      })
    }, token);
    setForm((current) => ({ ...current, title: "", summary: "", body: "", links: "" }));
    setMessage("Tananyag létrehozva.");
    await reload();
  };

  const deleteMaterial = async (materialId: string) => {
    if (!confirm("Biztosan törlöd ezt a tananyagot?")) return;
    await api<void>(`/api/materials/${materialId}`, { method: "DELETE" }, token);
    await reload();
  };

  return (
    <main className="page">
      <section className="section-heading">
        <p className="eyebrow">Role alapú szerkesztés</p>
        <h1>Tanári felület</h1>
        <p>A tanárok saját tananyagot kezelnek, az admin bármelyik tanár nevében dolgozhat.</p>
      </section>

      {isAdmin && (
        <label className="wide-control">
          Aktív tanár
          <select value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)}>
            {teachers.map((teacher) => <option key={teacher.userId} value={teacher.userId}>{teacher.displayName}</option>)}
          </select>
        </label>
      )}

      <section className="editor-grid">
        <form className="editor-card" onSubmit={createMaterial}>
          <h2>Új tananyag</h2>
          <div className="two-cols">
            <label>Tantárgy<select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
            <label>Évfolyam<select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value, semester: "" })}>{GRADES.map((grade) => <option key={grade} value={grade}>{grade === "university" ? "Egyetem" : `${grade}. osztály`}</option>)}</select></label>
          </div>
          {form.grade === "university" && <label>Félév<select value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })}>{SEMESTERS.map((item) => <option key={item} value={item}>{item}. félév</option>)}</select></label>}
          <div className="inline-create">
            <input value={topicTitle} onChange={(event) => setTopicTitle(event.target.value)} placeholder="Új fő téma neve" />
            <button type="button" className="secondary" onClick={createTopic}>Fő téma</button>
          </div>
          <label>Fő téma<select value={form.topicId} onChange={(event) => setForm({ ...form, topicId: event.target.value })}><option value="">Fő téma nélkül</option>{teacherTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
          <label>Cím<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <label>Rövid összefoglaló<input value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
          <label>Tananyag szövege<textarea rows={8} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /></label>
          <label>Kapcsolódó linkek, soronként<textarea rows={3} value={form.links} onChange={(event) => setForm({ ...form, links: event.target.value })} /></label>
          <button>Tananyag mentése</button>
          {message && <div className="notice">{message}</div>}
        </form>

        <section className="editor-card">
          <h2>Saját tananyagok</h2>
          <div className="compact-list">
            {teacherMaterials.map((material) => (
              <article key={material.id}>
                <div>
                  <strong>{material.title}</strong>
                  <small>{gradeLabel(material.grade, material.semester)}</small>
                </div>
                <div className="button-row">
                  <Link className="button secondary" to={`/materials/${material.id}`}>Megnyitás</Link>
                  <button className="danger" onClick={() => deleteMaterial(material.id)}>Törlés</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);

  const reload = async () => {
    const [userData, subjectData, profileData] = await Promise.all([
      api<User[]>("/api/admin/users", {}, token),
      api<Subject[]>("/api/subjects"),
      api<TeacherProfile[]>("/api/admin/teacher-profiles", {}, token)
    ]);
    setUsers(userData);
    setSubjects(subjectData);
    setProfiles(profileData);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRole = async (user: User, role: Role) => {
    const nextRoles = user.roles.includes(role) ? user.roles.filter((item) => item !== role) : [...user.roles, role];
    await api<User>(`/api/admin/users/${user.id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roles: nextRoles })
    }, token);
    await reload();
  };

  const saveProfile = async (userId: string, patch: Partial<TeacherProfile>) => {
    await api<TeacherProfile>(`/api/admin/teacher-profiles/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }, token);
    await reload();
  };

  return (
    <main className="page">
      <section className="section-heading">
        <p className="eyebrow">JWT authorization demo</p>
        <h1>Admin panel</h1>
        <p>Felhasználók, szerepkörök és tanári profilok kezelése.</p>
      </section>
      <section className="admin-grid">
        <div className="editor-card">
          <h2>Felhasználók</h2>
          <div className="compact-list">
            {users.map((user) => (
              <article key={user.id}>
                <div>
                  <strong>{user.displayName}</strong>
                  <small>{user.email}</small>
                </div>
                <div className="role-row">
                  {(["USER", "TEACHER", "ADMIN"] as Role[]).map((role) => (
                    <label key={role}>
                      <input type="checkbox" checked={user.roles.includes(role)} onChange={() => toggleRole(user, role)} />
                      {role}
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="editor-card">
          <h2>Tanári tulajdonságok</h2>
          <div className="compact-list">
            {users.filter((user) => user.roles.includes("TEACHER") || user.roles.includes("ADMIN")).map((user) => {
              const profile = profiles.find((item) => item.userId === user.id) ?? {
                userId: user.id,
                displayName: user.displayName,
                accentColor: "#2f6f5f",
                subjectIds: [],
                visible: true
              };
              return (
                <article key={user.id} className="profile-editor">
                  <input value={profile.displayName} onChange={(event) => saveProfile(user.id, { ...profile, displayName: event.target.value })} />
                  <input type="color" value={profile.accentColor} onChange={(event) => saveProfile(user.id, { ...profile, accentColor: event.target.value })} />
                  <label><input type="checkbox" checked={profile.visible} onChange={(event) => saveProfile(user.id, { ...profile, visible: event.target.checked })} />Publikus</label>
                  <div className="subject-pills">
                    {subjects.map((subject) => {
                      const enabled = profile.subjectIds.includes(subject.id);
                      return (
                        <button
                          key={subject.id}
                          className={enabled ? "active" : "secondary"}
                          onClick={() => saveProfile(user.id, {
                            ...profile,
                            subjectIds: enabled ? profile.subjectIds.filter((id) => id !== subject.id) : [...profile.subjectIds, subject.id]
                          })}
                        >
                          {subject.name}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
