import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api } from "./api.js";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("course-feedback-user"));
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  function signOut() {
    localStorage.removeItem("course-feedback-token");
    localStorage.removeItem("course-feedback-user");
    setUser(null);
    navigate("/");
  }

  function onSignedIn(data) {
    localStorage.setItem("course-feedback-token", data.token);
    localStorage.setItem("course-feedback-user", JSON.stringify(data.user));
    setUser(data.user);
    navigate(data.user.role === "admin" ? "/admin" : data.user.role === "professor" ? "/professor" : "/");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">C</span>
          <span>course<span className="brand-light">feedback</span></span>
        </Link>
        <nav className="nav-actions">
          {user ? (
            <>
              <span className="welcome">Hi, {user.name.split(" ")[0]}</span>
              {user.role === "admin" && <Link className="admin-pill" to="/admin">Admin</Link>}
              {user.role === "professor" && <Link className="admin-pill" to="/professor">Faculty</Link>}
              <button className="text-button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link className="text-button" to="/login">Sign in</Link>
              <Link className="button button-dark button-small" to="/register">Get started <span>↗</span></Link>
            </>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/admin" element={user?.role === "admin" ? <AdminDashboard /> : <Navigate to={user ? "/" : "/login"} />} />
          <Route path="/professor" element={user?.role === "professor" ? <ProfessorDashboard user={user} /> : <Navigate to={user ? "/" : "/login"} />} />
          <Route path="/courses/:courseId" element={<CourseDetail user={user} />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <AuthForm mode="login" onSignedIn={onSignedIn} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <AuthForm mode="register" onSignedIn={onSignedIn} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>Better courses start with honest conversations.</span>
        <span>Made for learners, by learners <span className="footer-spark">✳</span></span>
      </footer>
    </div>
  );
}

function Home({ user }) {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api(`/courses${query ? `?search=${encodeURIComponent(query)}` : ""}`)
        .then((data) => { if (active) { setCourses(data); setError(""); } })
        .catch((err) => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  async function addCourse(course) {
    try {
      const created = await api("/courses", { method: "POST", body: JSON.stringify(course) });
      setCourses((items) => [created, ...items]);
      setShowForm(false);
    } catch (err) {
      throw err;
    }
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> YOUR VOICE SHAPES THE CLASSROOM</div>
          <h1>Every course<br />can be <span className="serif-accent">better.</span></h1>
          <p>Real feedback. Better learning. Find your courses, share what works, and help shape what comes next.</p>
          <a className="button button-dark" href="#courses">Explore courses <span>↘</span></a>
        </div>
        <div className="hero-art" aria-label="Illustration of books and a plant">
          <div className="art-sun" />
          <div className="art-card card-back"><span>LEARN</span></div>
          <div className="art-card card-front">
            <div className="art-lines"><i /><i /><i /></div>
            <div className="art-star">✳</div>
          </div>
          <div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" /><div className="art-leaf leaf-three" />
          <div className="art-pot" />
          <div className="art-caption"><span className="caption-dot" /> A little feedback goes a long way</div>
          <div className="art-number">01<span> / LEARN</span></div>
        </div>
      </section>

      <section className="stats-strip">
        <div><strong>{courses.length.toString().padStart(2, "0")}</strong><span>COURSES TO EXPLORE</span></div>
        <div><strong>01 <span className="stat-arrow">↗</span></strong><span>VOICE THAT MATTERS</span></div>
        <div className="stats-note">Your perspective<br />makes a difference.</div>
      </section>

      <section className="course-section" id="courses">
        <div className="section-heading">
          <div><div className="eyebrow muted-eyebrow">THE COURSE CATALOG</div><h2>Find your <span className="serif-accent">class.</span></h2></div>
          {user?.role === "admin" && <button className="button button-outline" onClick={() => setShowForm(true)}>＋ Add a course</button>}
        </div>
        <div className="search-wrap"><span className="search-icon">⌕</span><input aria-label="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by course, instructor, or department..." /><span className="search-shortcut">↵</span></div>
        {error && <div className="notice error-notice">{error}</div>}
        {loading ? <div className="empty-state">Finding your courses…</div> : courses.length ? (
          <div className="course-grid">{courses.map((course, index) => <CourseCard key={course._id} course={course} index={index} />)}</div>
        ) : (
          <div className="empty-state">{query ? "No courses match that search. Try another keyword." : "No courses yet. Check back soon."}</div>
        )}
      </section>
      {showForm && <CourseModal onClose={() => setShowForm(false)} onSave={addCourse} />}
    </>
  );
}

function CourseCard({ course, index }) {
  const palettes = ["peach", "sage", "lavender", "sand"];
  return (
    <article className={`course-card ${palettes[index % palettes.length]}`}>
      <div className="card-topline"><span className="course-code">{course.code}</span><span className="card-arrow">↗</span></div>
      <Link to={`/courses/${course._id}`} className="course-title">{course.title}</Link>
      <div className="course-instructor">{course.instructor}<span> · </span>{course.department}</div>
      <div className="course-card-bottom"><span className="term-label">{course.term}</span><span className="rating"><span className="star">★</span> {course.feedbackCount ? course.averageRating.toFixed(1) : "—"} <span className="rating-count">({course.feedbackCount})</span></span></div>
    </article>
  );
}

function CourseDetail({ user }) {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api(`/courses/${courseId}`),
      api(`/feedback/course/${courseId}`),
      user ? api(`/feedback/mine/${courseId}`) : Promise.resolve(null)
    ]).then(([courseData, feedbackData, mineData]) => {
      if (active) { setCourse(courseData); setFeedback(feedbackData); setMine(mineData); }
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, user]);

  async function submitFeedback(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(`/feedback/course/${courseId}`, {
        method: "POST",
        body: JSON.stringify({ rating, comment, anonymous })
      });
      const [updatedCourse, updatedFeedback, updatedMine] = await Promise.all([
        api(`/courses/${courseId}`),
        api(`/feedback/course/${courseId}`),
        api(`/feedback/mine/${courseId}`)
      ]);
      setCourse(updatedCourse);
      setFeedback(updatedFeedback);
      setMine(updatedMine);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="detail-loading">Loading course…</div>;
  if (!course) return <div className="detail-loading"><div className="notice error-notice">{error || "Course not found."}</div><Link to="/" className="back-link">← Back to courses</Link></div>;
  return (
    <section className="detail-page">
      <Link to="/" className="back-link">← All courses</Link>
      <div className="detail-hero">
        <div><div className="eyebrow muted-eyebrow">{course.department} <span className="detail-separator">/</span> {course.code}</div><h1>{course.title}</h1><p className="detail-description">{course.description}</p><div className="detail-byline">Taught by <strong>{course.instructor}</strong><span> · </span>{course.term}</div></div>
        <div className="rating-panel"><span className="rating-label">STUDENT RATING</span><strong>{course.feedbackCount ? course.averageRating.toFixed(1) : "—"}</strong><span className="big-stars">★★★★★</span><span className="rating-total">{course.feedbackCount} {course.feedbackCount === 1 ? "response" : "responses"}</span></div>
      </div>

      <div className="feedback-layout">
        <section className="feedback-list">
          <div className="section-heading compact-heading"><div><div className="eyebrow muted-eyebrow">THE COMMUNITY SAYS</div><h2>Student <span className="serif-accent">notes.</span></h2></div></div>
          {feedback.length ? feedback.map((item) => <article className="feedback-item" key={item.id}><div className="feedback-meta"><strong>{item.author}</strong><span className="feedback-stars">{"★".repeat(item.rating)}<span className="empty-stars">{"★".repeat(5 - item.rating)}</span></span></div><p>{item.comment}</p><time>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</time>{item.reply && <div className="public-reply"><strong>Instructor response</strong><p>{item.reply.message}</p><time>{new Date(item.reply.repliedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</time></div>}</article>) : <div className="empty-feedback">No feedback yet. You could be the first.</div>}
        </section>
        <aside className="feedback-form-panel">
          <div className="eyebrow muted-eyebrow">MAKE IT COUNT</div><h3>Your take<br /><span className="serif-accent">matters.</span></h3>
          {!user ? <div className="sign-in-prompt"><p>Sign in as a student to share your experience with this course.</p><Link className="button button-dark" to="/login">Sign in to share <span>↗</span></Link></div>
            : user.role !== "student" ? <p className="form-note">Faculty accounts can review feedback and respond from the faculty dashboard.</p>
              : mine ? <div className="submitted-box"><span className="submitted-icon">✓</span><strong>Thanks for sharing.</strong><p>Your feedback has been submitted for this course.</p></div>
                : <form onSubmit={submitFeedback} className="feedback-form">
                  <label>Your rating</label>
                  <div className="rating-picker" role="radiogroup" aria-label="Course rating">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} star${value > 1 ? "s" : ""}`} aria-pressed={rating === value} className={value <= rating ? "selected" : ""}>★</button>)}</div>
                  <label htmlFor="comment">Your feedback</label>
                  <textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} placeholder="What should future students know?" required />
                  <label className="checkbox-label"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /><span>Share anonymously</span></label>
                  {error && <div className="form-error">{error}</div>}
                  <button className="button button-dark submit-button" disabled={saving || !rating}>{saving ? "Sending…" : "Send feedback"} <span>↗</span></button>
                  <p className="form-note">One response per student. Keep it kind and constructive.</p>
                </form>}
        </aside>
      </div>
    </section>
  );
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [newInvitation, setNewInvitation] = useState("");
  const [error, setError] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [inviteMessage, setInviteMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");

  async function refresh() {
    const [dashboardData, invitationData] = await Promise.all([
      api("/admin/dashboard"),
      api("/admin/invitations")
    ]);
    setDashboard(dashboardData);
    setInvitations(invitationData);
    setError("");
  }

  useEffect(() => {
    let active = true;
    Promise.all([api("/admin/dashboard"), api("/admin/invitations")])
      .then(([dashboardData, invitationData]) => {
        if (active) {
          setDashboard(dashboardData);
          setInvitations(invitationData);
        }
      })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  async function addCourse(course) {
    await api("/courses", { method: "POST", body: JSON.stringify(course) });
    await refresh();
    setShowCourseForm(false);
  }

  async function approveCourse(courseId) {
    setError("");
    try {
      await api(`/admin/courses/${courseId}/approve`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete ${course.code} — ${course.title} and all of its feedback? This cannot be undone.`)) return;
    setError("");
    try {
      await api(`/admin/courses/${course._id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateInvitation() {
    setError("");
    setNewInvitation("");
    try {
      const invitation = await api("/admin/invitations", { method: "POST", body: JSON.stringify({}) });
      setNewInvitation(invitation.code);
      setInviteMessage("");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(newInvitation);
      setInviteMessage("Invitation code copied. Share it privately with the verified faculty member.");
    } catch {
      setError("Could not copy automatically. Select and copy the invitation code shown.");
    }
  }

  async function revokeInvitation(invitationId) {
    setError("");
    try {
      await api(`/admin/invitations/${invitationId}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createAdmin(event) {
    event.preventDefault();
    setError("");
    setAccountMessage("");
    try {
      await api("/admin/accounts/admin", { method: "POST", body: JSON.stringify(adminForm) });
      setAdminForm({ name: "", email: "", password: "" });
      setAccountMessage("Administrator account created. Share its login details securely.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    if (!dashboard) return <section className="admin-page"><Link to="/" className="back-link">← Course catalog</Link><div className="notice error-notice">{error}</div></section>;
  }
  if (!dashboard) return <div className="detail-loading">Loading administrator dashboard…</div>;
  const pendingCourses = dashboard.courses.filter((course) => course.status === "pending");

  return (
    <section className="admin-page">
      <Link to="/" className="back-link">← Course catalog</Link>
      <div className="admin-heading">
        <div><div className="eyebrow muted-eyebrow">COURSE FEEDBACK / ADMIN</div><h1>Review the <span className="serif-accent">classroom.</span></h1><p>Course ratings and recent student feedback at a glance.</p></div>
        <button className="button button-dark" onClick={() => setShowCourseForm(true)}>＋ Add course</button>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="admin-metrics">
        <article><span>COURSES</span><strong>{dashboard.courseCount}</strong></article>
        <article><span>AWAITING APPROVAL</span><strong>{dashboard.pendingCourseCount}</strong></article>
        <article><span>STUDENT RESPONSES</span><strong>{dashboard.feedbackCount}</strong></article>
        <article><span>OVERALL RATING</span><strong>{dashboard.feedbackCount ? `${dashboard.averageRating.toFixed(1)} / 5` : "—"}</strong></article>
        <article><span>ACCOUNTS</span><strong>{dashboard.totalAccounts}</strong></article>
      </div>

      <section className="admin-section admin-accounts-row">
        <div className="account-breakdown"><div className="eyebrow muted-eyebrow">REGISTERED ACCOUNTS</div><strong>{dashboard.accountCounts.student || 0} students</strong><span>{dashboard.accountCounts.professor || 0} professors · {dashboard.accountCounts.admin || 0} administrators</span></div>
        <div className="account-breakdown"><div className="eyebrow muted-eyebrow">OVERALL RATINGS</div><RatingChart distribution={dashboard.ratingDistribution} compact /></div>
      </section>

      <section className="admin-section invite-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">FACULTY ACCESS</div><h2>Professor <span className="serif-accent">invitations.</span></h2><p className="feedback-limit-note">Generate a one-time code that expires in seven days. The code is shown only once.</p></div><button className="button button-outline" onClick={generateInvitation}>＋ Generate code</button></div>
        {newInvitation && <div className="generated-invitation"><div><span>NEW INVITATION — COPY IT NOW</span><code>{newInvitation}</code></div><button className="button button-dark" onClick={copyInvitation}>Copy code</button></div>}
        {inviteMessage && <div className="success-notice">{inviteMessage}</div>}
        {invitations.length ? <div className="invitation-list">{invitations.map((invite) => <div className="invitation-row" key={invite._id}><span>Unused code · expires {new Date(invite.expiresAt).toLocaleDateString()}</span><button className="text-button" onClick={() => revokeInvitation(invite._id)}>Revoke</button></div>)}</div> : <p className="empty-inline">No active professor invitations.</p>}
      </section>

      <section className="admin-section admin-create-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">ADMIN ACCESS</div><h2>Add another <span className="serif-accent">administrator.</span></h2></div></div>
        <form className="admin-create-form" onSubmit={createAdmin}>
          <label>Full name<input value={adminForm.name} onChange={(event) => setAdminForm({ ...adminForm, name: event.target.value })} minLength={2} maxLength={80} required /></label>
          <label>Email<input type="email" value={adminForm.email} onChange={(event) => setAdminForm({ ...adminForm, email: event.target.value })} required /></label>
          <label>Password (12+ characters)<input type="password" value={adminForm.password} onChange={(event) => setAdminForm({ ...adminForm, password: event.target.value })} minLength={12} required /></label>
          <button className="button button-outline">Create admin account</button>
        </form>
        {accountMessage && <div className="success-notice">{accountMessage}</div>}
      </section>

      {pendingCourses.length > 0 && <section className="admin-section approval-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">FACULTY SUBMISSIONS</div><h2>Needs your <span className="serif-accent">approval.</span></h2></div></div>
        <div className="pending-course-list">{pendingCourses.map((course) => <article className="pending-course-row" key={course._id}>
          <div><span className="table-course-code">{course.code} · {course.term} · {course.department}</span><strong>{course.title}</strong><span className="pending-instructor">Submitted by {course.instructor}</span></div>
          <div className="pending-actions"><button className="button button-dark" onClick={() => approveCourse(course._id)}>Approve course</button><button className="text-button delete-action" onClick={() => deleteCourse(course)}>Reject / delete</button></div>
        </article>)}</div>
      </section>}

      <section className="admin-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">COURSE PERFORMANCE</div><h2>Ratings by <span className="serif-accent">course.</span></h2></div></div>
        {dashboard.courses.length ? (
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>COURSE</th><th>INSTRUCTOR</th><th>TERM</th><th>STATUS</th><th>RATING</th><th>RESPONSES</th><th>ACTION</th></tr></thead>
            <tbody>{dashboard.courses.map((course) => <tr key={course._id}>
              <td><span className="table-course-code">{course.code}</span><strong>{course.title}</strong></td>
              <td>{course.instructor}</td><td>{course.term}</td><td><span className={`status-tag ${course.status === "pending" ? "status-pending" : "status-approved"}`}>{course.status || "approved"}</span></td>
              <td><span className="table-rating">★ {course.feedbackCount ? course.averageRating.toFixed(1) : "—"}</span></td>
              <td>{course.feedbackCount}</td>
              <td className="admin-table-actions">{course.status !== "pending" && <Link className="table-link" to={`/courses/${course._id}`}>Reviews ↗</Link>}<button className="text-button delete-action" onClick={() => deleteCourse(course)}>Delete</button></td>
            </tr>)}</tbody>
          </table></div>
        ) : <div className="empty-state">No courses yet. Add courses from the catalog.</div>}
      </section>

      <section className="admin-section recent-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">LATEST RESPONSES</div><h2>Recent <span className="serif-accent">feedback.</span></h2></div></div>
        {dashboard.recentFeedback.length ? <div className="admin-feedback-list">
          {dashboard.recentFeedback.map((item) => <article className="admin-feedback-item" key={item.id}>
            <div className="admin-feedback-top"><Link to={`/courses/${item.courseId}`}><span className="table-course-code">{item.courseCode}</span>{item.courseTitle}</Link><span className="table-rating">★ {item.rating}.0</span></div>
            <p>{item.comment}</p>
            <div className="admin-feedback-meta"><span>{item.author}</span><time>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div>
          </article>)}
        </div> : <div className="empty-feedback">No student feedback has been submitted yet.</div>}
      </section>
      {showCourseForm && <CourseModal onClose={() => setShowCourseForm(false)} onSave={addCourse} />}
    </section>
  );
}

function ProfessorDashboard({ user }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [claimingCourseId, setClaimingCourseId] = useState("");

  async function refreshDashboard() {
    const data = await api("/professor/dashboard");
    setDashboard(data);
    setError("");
  }

  useEffect(() => {
    let active = true;
    api("/professor/dashboard")
      .then((data) => { if (active) setDashboard(data); })
      .catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, []);

  async function addCourse(course) {
    await api("/professor/courses", { method: "POST", body: JSON.stringify(course) });
    await refreshDashboard();
    setShowCourseForm(false);
  }

  async function claimCourse(courseId) {
    setClaimingCourseId(courseId);
    setError("");
    try {
      await api(`/professor/courses/${courseId}/claim`, { method: "POST" });
      await refreshDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaimingCourseId("");
    }
  }

  function updateReply(feedbackId, reply) {
    setDashboard((current) => ({
      ...current,
      recentFeedback: current.recentFeedback.map((item) =>
        item.id === feedbackId ? { ...item, reply } : item
      )
    }));
  }

  if (error && !dashboard) {
    return <section className="admin-page"><div className="notice error-notice">{error}</div></section>;
  }
  if (!dashboard) return <div className="detail-loading">Loading faculty dashboard…</div>;

  return (
    <section className="admin-page professor-page">
      <div className="admin-heading">
        <div><div className="eyebrow muted-eyebrow">FACULTY / COURSE INSIGHTS</div><h1>Your classes, <span className="serif-accent">in focus.</span></h1><p>Welcome, {user.name}. Track student ratings and follow up on feedback.</p></div>
        <button className="button button-dark" onClick={() => setShowCourseForm(true)}>＋ Enlist a course</button>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <div className="admin-metrics">
        <article><span>YOUR COURSES</span><strong>{dashboard.courseCount}</strong></article>
        <article><span>STUDENT RESPONSES</span><strong>{dashboard.feedbackCount}</strong></article>
        <article><span>AVERAGE RATING</span><strong>{dashboard.feedbackCount ? `${dashboard.averageRating.toFixed(1)} / 5` : "—"}</strong></article>
      </div>

      {dashboard.claimableCourses.length > 0 && <section className="admin-section claim-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">ALREADY IN THE CATALOG</div><h2>Courses under <span className="serif-accent">your name.</span></h2><p className="feedback-limit-note">Claim only courses you teach. Your account name must match the listed instructor.</p></div></div>
        <div className="claimable-list">{dashboard.claimableCourses.map((course) => <article className="claimable-course" key={course._id}><div><span className="table-course-code">{course.code} · {course.term}</span><strong>{course.title}</strong></div><button className="button button-outline" disabled={claimingCourseId === course._id} onClick={() => claimCourse(course._id)}>{claimingCourseId === course._id ? "Adding…" : "Claim course"}</button></article>)}</div>
      </section>}

      <section className="admin-section analytics-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">RATING DISTRIBUTION</div><h2>What students <span className="serif-accent">think.</span></h2></div></div>
        {dashboard.feedbackCount ? <div className="analytics-panel"><div className="analytics-summary"><strong>{dashboard.averageRating.toFixed(1)}</strong><span>out of 5<br />across {dashboard.feedbackCount} responses</span></div><RatingChart distribution={dashboard.ratingDistribution} /></div>
          : <div className="empty-feedback">Rating charts will appear when students leave feedback on your courses.</div>}
      </section>

      <section className="admin-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">YOUR COURSE CATALOG</div><h2>Class-by-class <span className="serif-accent">analytics.</span></h2></div></div>
        {dashboard.courses.length ? <div className="professor-course-grid">
          {dashboard.courses.map((course) => <article className="professor-course-card" key={course._id}>
            <div className="professor-course-top"><div><span className="table-course-code">{course.code} · {course.term}</span><h3>{course.title}</h3></div><span className="course-average">{course.feedbackCount ? course.averageRating.toFixed(1) : "—"}<small>/ 5</small></span></div>
            <div className="professor-course-meta">{course.feedbackCount} {course.feedbackCount === 1 ? "student response" : "student responses"}</div>
            {course.feedbackCount ? <RatingChart distribution={course.ratingDistribution} compact /> : <div className="course-no-ratings">No ratings yet</div>}
            {course.status === "pending" ? <span className="status-tag status-pending">Waiting for admin approval</span> : <Link className="table-link" to={`/courses/${course._id}`}>Open course page ↗</Link>}
          </article>)}
        </div> : <div className="empty-state">You haven’t enlisted any courses yet.</div>}
      </section>

      <section className="admin-section recent-section">
        <div className="admin-section-heading"><div><div className="eyebrow muted-eyebrow">STUDENT VOICES</div><h2>Feedback & <span className="serif-accent">replies.</span></h2><p className="feedback-limit-note">Showing the latest {dashboard.recentFeedback.length === 100 ? "100 " : ""}responses across your courses.</p></div></div>
        {dashboard.recentFeedback.length ? <div className="admin-feedback-list">
          {dashboard.recentFeedback.map((item) => <ProfessorFeedbackCard key={item.id} feedback={item} onReply={updateReply} />)}
        </div> : <div className="empty-feedback">No feedback yet. Student reviews will appear here.</div>}
      </section>
      {showCourseForm && <ProfessorCourseModal professorName={user.name} onClose={() => setShowCourseForm(false)} onSave={addCourse} />}
    </section>
  );
}

function RatingChart({ distribution, compact = false }) {
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  return (
    <div className={`rating-chart${compact ? " rating-chart-compact" : ""}`} role="img" aria-label="Number of feedback responses for each star rating">
      {distribution.map((item) => <div className="chart-row" key={item.rating}>
        <span className="chart-label">{item.rating} <span>★</span></span>
        <div className="chart-track"><div className="chart-fill" style={{ width: `${(item.count / maxCount) * 100}%` }} /></div>
        <span className="chart-count">{item.count}</span>
      </div>)}
    </div>
  );
}

function ProfessorFeedbackCard({ feedback, onReply }) {
  const [message, setMessage] = useState(feedback.reply?.message || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await api(`/professor/feedback/${feedback.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ message })
      });
      setMessage(data.reply.message);
      onReply(feedback.id, data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-feedback-item professor-review">
      <div className="admin-feedback-top"><Link to={`/courses/${feedback.courseId}`}><span className="table-course-code">{feedback.courseCode}</span>{feedback.courseTitle}</Link><span className="table-rating">{"★".repeat(feedback.rating)}{"☆".repeat(5 - feedback.rating)}</span></div>
      <p className="review-comment">{feedback.comment}</p>
      <div className="admin-feedback-meta"><span>{feedback.author}</span><time>{new Date(feedback.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></div>
      <form className="professor-reply-form" onSubmit={submit}>
        <label htmlFor={`reply-${feedback.id}`}>{feedback.reply ? "Your response (edit to update)" : "Reply to this feedback"}</label>
        <textarea id={`reply-${feedback.id}`} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={2} placeholder="Write a thoughtful, professional response…" required />
        {error && <div className="form-error">{error}</div>}
        <div className="reply-form-bottom"><span>Visible to students on the course page.</span><button className="button button-outline" disabled={saving || !message.trim()}>{saving ? "Saving…" : feedback.reply ? "Update reply" : "Post reply"}</button></div>
      </form>
    </article>
  );
}

function ProfessorCourseModal({ professorName, onClose, onSave }) {
  const [form, setForm] = useState({ code: "", title: "", department: "Computer Engineering", description: "", term: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try { await onSave(form); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="course-modal"><div className="modal-heading"><div><div className="eyebrow muted-eyebrow">FACULTY COURSE CATALOG</div><h2>Enlist a <span className="serif-accent">course.</span></h2><p className="modal-instructor">Instructor: {professorName}</p></div><button className="close-button" onClick={onClose} aria-label="Close">×</button></div><form className="modal-form" onSubmit={submit}>{[["code", "Course code", "e.g. CPE 240"], ["title", "Course title", "e.g. Computer Architecture"], ["department", "Department", "e.g. Computer Engineering"], ["term", "Term", "e.g. Fall 2026"]].map(([key, label, placeholder]) => <label key={key}>{label}<input required maxLength={key === "title" ? 120 : 80} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} /></label>)}<label>Description<textarea required maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What will students explore in this course?" /></label>{error && <div className="form-error">{error}</div>}<button className="button button-dark submit-button" disabled={saving}>{saving ? "Adding…" : "Enlist course"} <span>↗</span></button></form></section></div>;
}

function AuthForm({ mode, onSignedIn }) {
  const isRegister = mode === "register";
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", invitationCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      if (!isRegister && data.user.role !== form.role) {
        const roleName = data.user.role === "admin" ? "administrator" : data.user.role;
        throw new Error(`This account is registered as ${roleName}. Choose that account type and try again.`);
      }
      onSignedIn(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="auth-page">
      <div className="auth-note"><span className="auth-quote-mark">“</span><p>Learning gets better when we listen to each other.</p><span className="auth-note-caption">A SPACE FOR EVERY STUDENT VOICE</span></div>
      <div className="auth-panel"><Link to="/" className="back-link">← Back to courses</Link><div className="eyebrow muted-eyebrow">{isRegister ? "JOIN THE CONVERSATION" : "WELCOME BACK"}</div><h1>{isRegister ? <>Your voice<br /><span className="serif-accent">belongs here.</span></> : <>Good to<br /><span className="serif-accent">see you.</span></>}</h1><p className="auth-subtitle">{isRegister ? "Create a student or faculty account and help make every class a little better." : "Sign in to share feedback and see what your fellow students think."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required minLength={2} maxLength={80} placeholder="Alex Student" /></label>}
          {isRegister
            ? <label>Account type<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value, invitationCode: "" })}><option value="student">Student</option><option value="professor">Professor / faculty</option></select></label>
            : <label>Sign in as<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="student">Student</option><option value="professor">Professor / faculty</option><option value="admin">Administrator</option></select></label>}
          {isRegister && form.role === "professor" && <label>Faculty invitation code<input value={form.invitationCode} onChange={(event) => setForm({ ...form, invitationCode: event.target.value })} autoComplete="off" required placeholder="Ask your administrator" /></label>}
          <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required placeholder="you@university.edu" /></label>
          <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 8 : undefined} placeholder={isRegister ? "At least 8 characters" : "Your password"} /></label>
          {error && <div className="form-error">{error}</div>}
          <button className="button button-dark submit-button" disabled={loading}>{loading ? "One moment…" : isRegister ? "Create your account" : "Sign in"} <span>↗</span></button>
        </form>
        <p className="auth-switch">{isRegister ? "Already a member?" : "New to the community?"} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
      </div>
    </section>
  );
}

function CourseModal({ onClose, onSave }) {
  const [form, setForm] = useState({ code: "", title: "", instructor: "", department: "", description: "", term: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try { await onSave(form); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="course-modal"><div className="modal-heading"><div><div className="eyebrow muted-eyebrow">COURSE CATALOG</div><h2>Add a <span className="serif-accent">course.</span></h2></div><button className="close-button" onClick={onClose} aria-label="Close">×</button></div><form className="modal-form" onSubmit={submit}>{[["code", "Course code", "e.g. ART 204"], ["title", "Course title", "e.g. Drawing from observation"], ["instructor", "Instructor", "Instructor name"], ["department", "Department", "e.g. Fine Arts"], ["term", "Term", "e.g. Fall 2026"]].map(([key, label, placeholder]) => <label key={key}>{label}<input required maxLength={key === "title" ? 120 : 80} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder={placeholder} /></label>)}<label>Description<textarea required maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What will students explore in this course?" /></label>{error && <div className="form-error">{error}</div>}<button className="button button-dark submit-button" disabled={saving}>{saving ? "Adding…" : "Add course"} <span>↗</span></button></form></section></div>;
}

function NotFound() {
  return <section className="not-found"><div className="eyebrow muted-eyebrow">404 / A LITTLE OFF TRACK</div><h1>This page<br /><span className="serif-accent">isn't here.</span></h1><Link className="button button-dark" to="/">Back to courses <span>↗</span></Link></section>;
}

export default App;
