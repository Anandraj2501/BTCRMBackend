import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { ChevronRight, Plus, Eye, Star } from 'lucide-react';

const Breadcrumb = ({ parts }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
    {parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={14} />}
        {p.to ? <Link to={p.to} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{p.label}</Link> : <span style={{ color: 'var(--text)' }}>{p.label}</span>}
      </React.Fragment>
    ))}
  </div>
);

const ViewsListPage = () => {
  const { logicalname } = useParams();
  const navigate = useNavigate();
  const { request, loading } = useApi();
  const [views, setViews] = useState([]);
  const [entityDef, setEntityDef] = useState(null);

  useEffect(() => {
    Promise.all([
      request(`/metadata/view/${logicalname}`),
      request(`/metadata/entity/${logicalname}`)
    ]).then(([v, def]) => {
      setViews(v || []);
      setEntityDef(def);
    }).catch(console.error);
  }, [logicalname]);

  const displayName = entityDef?.metadata?.displayname || logicalname;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <Breadcrumb parts={[{ label: 'Entities' }, { label: displayName, to: `/entity/${logicalname}` }, { label: 'Views' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ textTransform: 'capitalize', marginBottom: '0.25rem' }}>{displayName} — Views</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.75rem', borderRadius: '12px' }}>
            {views.length} views
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/entity/${logicalname}/views/designer`)}>
          <Plus size={16} /> New View
        </button>
      </div>

      {views.length === 0 && !loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
          No views yet. Create a view to control how records are filtered and sorted in the grid.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {views.map((view) => {
            const cols = view.definition?.columns || [];
            const filters = view.definition?.filters || [];
            const sorting = view.definition?.sorting || [];
            return (
              <div key={view.viewid} onClick={() => navigate(`/entity/${logicalname}/views/designer?viewid=${view.viewid}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <Eye size={20} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{view.viewname}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>{cols.length} column(s)</span>
                    {filters.length > 0 && <span>{filters.length} filter(s)</span>}
                    {sorting.length > 0 && <span>Sorted by {sorting[0].field}</span>}
                  </div>
                </div>
                {(view.isdefault === true || view.isdefault === 1) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(250,204,21,0.15)', color: '#fbbf24', borderRadius: '8px' }}>
                    <Star size={12} /> Default
                  </span>
                )}
                <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                  onClick={e => { e.stopPropagation(); navigate(`/entity/${logicalname}?viewid=${view.viewid}`); }}>
                  Apply View →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ViewsListPage;
