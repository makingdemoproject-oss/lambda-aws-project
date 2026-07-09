/**
 * Course detail page — public-readable.
 *   • Lessons (preview-only without enrollment)
 *   • Upcoming live class slots (with "Reserve" button)
 *   • Reviews
 *   • Enroll CTA (free courses → instant; paid → would launch Cashfree)
 */
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { learn } from '../../api/index.js';
import { selectIsAuthed } from '../../store/slices/authSlice.js';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const authed = useSelector(selectIsAuthed);
  const [course,   setCourse]   = useState(null);
  const [lessons,  setLessons]  = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [reviews,  setReviews]  = useState({ items: [] });
  const [enrolled, setEnrolled] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await learn.courses.bySlug(slug);
        setCourse(c);
        const [l, s, r] = await Promise.all([
          learn.lessons.forCourse(c.id),
          learn.schedules.upcoming(c.id, { pageSize: 10 }).catch(() => ({ items: [] })),
          learn.reviews.forCourse(c.id, { pageSize: 10 }).catch(() => ({ data: { items: [] } })),
        ]);
        setLessons(l ?? []);
        setSchedule(s.items ?? []);
        setReviews(r.data ?? r);
        if (authed) {
          const mine = await learn.enrollments.mine().catch(() => []);
          setEnrolled(Array.isArray(mine) && mine.some((e) => e.courseId === c.id));
        }
      } catch (e) { setErr(e.response?.data?.message || 'Course not found'); }
    })();
  }, [slug, authed]);

  const enroll = async () => {
    if (!authed) return nav('/login');
    setBusy(true); setErr(null);
    try {
      await learn.enrollments.enrollCourse(course.id);
      setEnrolled(true);
    } catch (e) { setErr(e.response?.data?.message || 'Could not enroll'); }
    finally { setBusy(false); }
  };

  const bookSlot = async (scheduleId) => {
    if (!authed) return nav('/login');
    try {
      await learn.bookings.create({ scheduleId });
      nav('/learn/dashboard');
    } catch (e) { setErr(e.response?.data?.message || 'Could not book'); }
  };

  if (err && !course) return <div className="page-shell"><p className="error">{err}</p><Link to="/learn">← back</Link></div>;
  if (!course) return <div className="page-shell"><p className="muted">{t('common.loading')}</p></div>;

  return (
    <div className="page-shell two-col">
      <section>
        <h1>{course.title}</h1>
        <p className="muted">{course.language} · {course.level} · {course.ratingCount > 0 ? `★ ${Number(course.ratingAvg).toFixed(1)} (${course.ratingCount})` : 'No reviews yet'}</p>
        {course.summary && <p>{course.summary}</p>}
        {course.description && <p className="prose">{course.description}</p>}

        <h2>Lessons</h2>
        <ol className="lessons">
          {lessons.map((l) => (
            <li key={l.id}>
              <strong>{l.title}</strong>
              <small className="muted"> · {l.durationMinutes} min</small>
              {l.isPreview && <span className="badge">Preview</span>}
              {(enrolled || l.isPreview) ? (
                <Link to={`/learn/courses/${slug}/lessons/${l.slug}`} className="link"> Open</Link>
              ) : <small className="muted"> · enroll to unlock</small>}
            </li>
          ))}
          {lessons.length === 0 && <p className="muted">Curriculum coming soon.</p>}
        </ol>

        {schedule.length > 0 && (
          <>
            <h2>Live sessions</h2>
            <ul className="slots">
              {schedule.map((s) => (
                <li key={s.id}>
                  <strong>{s.title}</strong>
                  <small className="muted"> · {new Date(s.startsAt).toLocaleString()} ({s.mode})</small>
                  <button className="btn btn-secondary btn-sm" onClick={() => bookSlot(s.id)} disabled={!authed || !enrolled}>
                    Reserve
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>Reviews</h2>
        {(reviews.items ?? []).map((r) => (
          <blockquote key={r.id}>
            <strong>{'★'.repeat(r.rating)}</strong>
            {r.comment && <p>{r.comment}</p>}
            <small className="muted">{new Date(r.createdAt).toLocaleDateString()}</small>
          </blockquote>
        ))}
        {(reviews.items ?? []).length === 0 && <p className="muted">Be the first to review.</p>}
      </section>

      <aside className="book-card">
        <div className="price">
          {course.priceCents > 0 ? <strong>{course.currency} {(course.priceCents / 100).toLocaleString()}</strong> : <strong>Free</strong>}
        </div>
        {err && <div className="error">{err}</div>}
        {enrolled ? (
          <p className="muted">You're enrolled — head to <Link to="/learn/dashboard">your dashboard</Link>.</p>
        ) : (
          <button className="btn btn-primary btn-block" onClick={enroll} disabled={busy}>
            {busy ? '…' : course.priceCents > 0 ? 'Buy + enroll' : 'Enroll for free'}
          </button>
        )}
      </aside>
    </div>
  );
}
