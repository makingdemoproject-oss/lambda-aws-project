/**
 * Generic filter bar for admin lists.
 *
 *   <FilterBar
 *     value={filters}
 *     onChange={setFilters}
 *     fields={[
 *       { name: 'q',      label: 'Search', type: 'search', placeholder: 'name or email…' },
 *       { name: 'status', label: 'Status', type: 'select', options: [
 *         { value: '',         label: 'Any' },
 *         { value: 'active',   label: 'Active' },
 *         { value: 'inactive', label: 'Inactive' },
 *       ]},
 *       { name: 'from',   label: 'From',   type: 'date' },
 *       { name: 'to',     label: 'To',     type: 'date' },
 *     ]}
 *   />
 */
import { useTranslation } from 'react-i18next';

export default function FilterBar({ value = {}, onChange, fields = [] }) {
  const { t } = useTranslation();
  const patch = (name, v) => onChange({ ...value, [name]: v });
  const reset = () => onChange(Object.fromEntries(fields.map((f) => [f.name, ''])));

  return (
    <div className="filter-bar">
      {fields.map((f) => (
        <label key={f.name} className="filter-field">
          <span>{f.label}</span>
          {f.type === 'select' ? (
            <select value={value[f.name] ?? ''} onChange={(e) => patch(f.name, e.target.value)}>
              {(f.options || []).map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={value[f.name] ?? ''}
              onChange={(e) => patch(f.name, e.target.value)}
            />
          )}
        </label>
      ))}
      <button type="button" className="btn btn-ghost" onClick={reset}>{t('common.reset')}</button>
    </div>
  );
}
