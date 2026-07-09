/**
 * Page-number control used by every admin list. Stateless — the parent owns
 * `page` and `pageSize` and re-fetches on change. Built around the response
 * shape every list endpoint returns: { items, total, page, pageSize }.
 */
import { useTranslation } from 'react-i18next';

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, sizes = [10, 20, 50, 100] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const { t } = useTranslation();

  const go = (p) => onPageChange(Math.min(Math.max(1, p), pages));
  const windowStart = Math.max(1, page - 2);
  const windowEnd   = Math.min(pages, windowStart + 4);

  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={page <= 1}     onClick={() => go(1)}        aria-label="First">«</button>
      <button className="btn btn-ghost" disabled={page <= 1}     onClick={() => go(page - 1)} aria-label="Previous">‹</button>

      {Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i).map((n) => (
        <button
          key={n}
          className={`btn ${n === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => go(n)}
          aria-current={n === page ? 'page' : undefined}
        >{n}</button>
      ))}

      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => go(page + 1)} aria-label="Next">›</button>
      <button className="btn btn-ghost" disabled={page >= pages} onClick={() => go(pages)}    aria-label="Last">»</button>

      <span className="muted">{`${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total}`}</span>

      {onPageSizeChange && (
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} aria-label="Rows per page">
          {sizes.map((s) => <option key={s} value={s}>{s} / {t('common.actions')}</option>)}
        </select>
      )}
    </div>
  );
}
