/**
 * Student dashboard — pulls the aggregated payload from /dashboards/student.
 * One round-trip gives us enrolment summary + upcoming bookings + recent
 * submissions + recommendations.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { learn } from '../../api/index.js';

export default function LearnDashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);

  useEffect(() => {
    learn.dashboards.student()
      .then(setData)
      .catch((e) => setErr(e.response?.data?.message || t('errors.generic')));
  }, [t]);

  if (err) return <div className="page-shell"><p className="error">{err}</p></div>;
  if (!data) return <div className="page-shell"><p className="muted">{t('common.loading')}</p></div>;

  const { student, enrolments, upcomingBookings, recentSubmissions, recommendedCourses } = data;

  return (
    <div className="page-shell">
      <header className="page-head">
        <h1>Welcome back, {student.firstName}</h1>
        <p className="muted">Student code <strong>{student.code}</strong> · joined {new Date(student.joinedAt).toLocaleDateString()}</p>
      </header>

      <section className="stats">
        <div className="stat"><strong>{enrolments.active}</strong><small>active courses</small></div>
        <div className="stat"><strong>{enrolments.completed}</strong><small>completed</small></div>
        <div className="stat"><strong>{enrolments.lessonsDone} / {enrolments.totalLessons}</strong><small>lessons done</small></div>
        <div className="stat"><strong>{Number(enrolments.avgCompletion).toFixed(0)}%</strong><small>avg progress</small></div>
      </section>

      <div className="two-col">
        <section>
          <h2>Upcoming live classes</h2>
          {upcomingBookings.length === 0 && <p className="muted">No upcoming bookings.</p>}
          <ul className="slots">
            {upcomingBookings.map((b) => (
              <li key={b.id}>
                <strong>{new Date(b.startsAt).toLocaleString()}</strong>
                <small className="muted"> · ends {new Date(b.endsAt).toLocaleTimeString()}</small>
                <span className={`badge status-${b.status}`}>{b.status.replace('_',' ')}</span>
              </li>
            ))}
          </ul>

          <h2>Recent code submissions</h2>
          {recentSubmissions.length === 0 && <p className="muted">No submissions yet — try an exercise.</p>}
          <table className="table compact">
            <thead><tr><th>When</th><th>Status</th><th>Score</th><th>Lang</th></tr></thead>
            <tbody>
              {recentSubmissions.map((s) => (
                <tr key={s.id}>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td><span className={`badge status-${s.status}`}>{s.status.replace('_',' ')}</span></td>
                  <td>{s.score}</td>
                  <td>{s.language}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside>
          <h2>Recommended for you</h2>
          {recommendedCourses.length === 0 && <p className="muted">Finish a course and we'll line up the next one.</p>}
          <ul className="recs">
            {recommendedCourses.map((c) => (
              <li key={c.id}>
                <Link to={`/learn/courses/${c.slug}`}>
                  <strong>{c.title}</strong>
                  <small className="muted"> · {c.language} · ★ {Number(c.ratingAvg).toFixed(1)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
