/**
 * Course catalog + curated packages (Node, AWS, DSA, Networking, JS, DB).
 *
 * The list endpoint defaults to status=published — drafts only appear in
 * the instructor panel. Sort options come straight from the API (newest /
 * popular / rating).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { learn } from '../../api/index.js';

const TOPICS = [
  { topic: '',           label: 'All' },
  { topic: 'node',       label: 'Node.js' },
  { topic: 'aws',        label: 'AWS' },
  { topic: 'dsa',        label: 'DSA' },
  { topic: 'networking', label: 'Networking' },
  { topic: 'javascript', label: 'JavaScript' },
  { topic: 'database',   label: 'Databases' },
];

export default function CoursesPage() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [courses,  setCourses]  = useState([]);
  const [filters, setFilters]   = useState({ topic: '', q: '', sort: 'newest' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [filters]);

  const load = async () => {
    setBusy(true); setErr(null);
    try {
      const [p, c] = await Promise.all([
        learn.packages.list({ topic: filters.topic || undefined, pageSize: 20 }),
        learn.courses.list({
          language: filters.topic || undefined,
          q: filters.q || undefined,
          sort: filters.sort,
          pageSize: 24,
        }),
      ]);
      setPackages(p.items ?? []);
      setCourses(c.items ?? []);
    } catch (e) { setErr(e.response?.data?.message || t('errors.generic')); }
    finally { setBusy(false); }
  };

  return (
    <div className="page-shell">
      <header className="page-head">
        <h1>Coding Sikho</h1>
        <p className="muted">Live + self-paced courses bundled into career tracks.</p>
      </header>

      <nav className="topic-chips">
        {TOPICS.map((t) => (
          <button key={t.topic}
                  className={filters.topic === t.topic ? 'chip active' : 'chip'}
                  onClick={() => setFilters({ ...filters, topic: t.topic })}>
            {t.label}
          </button>
        ))}
      </nav>

      {packages.length > 0 && (
        <section>
          <h2>Career tracks</h2>
          <div className="grid">
            {packages.map((p) => (
              <Link key={p.id} to={`/learn/packages/${p.slug}`} className="card">
                {p.coverImageUrl && <img src={p.coverImageUrl} alt={p.name} loading="lazy" />}
                <div className="card-body">
                  <h3>{p.name}</h3>
                  <p className="muted">{p.topic.toUpperCase()} · {Math.round(p.durationMinutes / 60)}h</p>
                  <p className="ellipsis">{p.description}</p>
                  <strong>{p.currency} {(p.priceCents / 100).toLocaleString()}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="row-between">
          <h2>All courses</h2>
          <div className="row">
            <input placeholder="Search…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
        </div>
        {err && <div className="error">{err}</div>}
        {busy && <p className="muted">{t('common.loading')}</p>}
        <div className="grid">
          {courses.map((c) => (
            <Link key={c.id} to={`/learn/courses/${c.slug}`} className="card">
              {c.coverImageUrl && <img src={c.coverImageUrl} alt={c.title} loading="lazy" />}
              <div className="card-body">
                <h3>{c.title}</h3>
                <p className="muted">{c.language} · {c.level} · {c.ratingAvg ? `★ ${Number(c.ratingAvg).toFixed(1)}` : 'New'} ({c.ratingCount})</p>
                <p className="ellipsis">{c.summary || c.description?.slice(0, 120)}</p>
                <strong>{c.priceCents > 0 ? `${c.currency} ${(c.priceCents / 100).toLocaleString()}` : 'Free'}</strong>
              </div>
            </Link>
          ))}
          {courses.length === 0 && !busy && <p className="muted">No matches. Try a different topic.</p>}
        </div>
      </section>
    </div>
  );
}
