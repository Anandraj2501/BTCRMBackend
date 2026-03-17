import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import DynamicForm from '../components/DynamicForm';
import { Plus, Search, ChevronDown, Eye, Table, RefreshCw, FileText } from 'lucide-react';

const EntityList = () => {
  const { logicalname } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewId = searchParams.get('viewid');
  const navigate = useNavigate();
  const { request, loading } = useApi();

  const [entityDef, setEntityDef] = useState(null);
  const [records, setRecords] = useState([]);
  const [views, setViews] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedView, setSelectedView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewDrop, setShowViewDrop] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const viewDropRef = useRef(null);

  // Close view dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (viewDropRef.current && !viewDropRef.current.contains(e.target)) {
        setShowViewDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchMetadata = async () => {
    try {
      const [def, vListRaw, fListRaw] = await Promise.all([
        request(`/metadata/entity/${logicalname}`),
        request(`/metadata/view/${logicalname}`),
        request(`/metadata/form/${logicalname}`),
      ]);

      const vList = Array.isArray(vListRaw) ? vListRaw : (vListRaw?.data || []);
      const fList = Array.isArray(fListRaw) ? fListRaw : (fListRaw?.data || []);

      setEntityDef(def);
      setViews(vList);
      setForms(fList);

      // Select view: from URL or default
      const initialView = vList.find(v => v.viewid === viewId) || vList.find(v => v.isdefault) || vList[0];
      setSelectedView(initialView);
      if (initialView && initialView.viewid !== viewId) {
        setSearchParams({ viewid: initialView.viewid });
      }
    } catch (e) {
      console.error('Error fetching metadata:', e);
      setViews([]);
    }
  };

  const fetchRecords = async () => {
    if (!selectedView) return;
    setRecordsLoading(true);
    try {
      const data = await request(`/entity/${logicalname}/view/${selectedView.viewid}`);
      setRecords(data || []);
    } catch (e) {
      try {
        const fallback = await request(`/entity/${logicalname}`);
        setRecords(fallback || []);
      } catch { setRecords([]); }
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => { fetchMetadata(); }, [logicalname]);
  useEffect(() => { if (selectedView) fetchRecords(); }, [selectedView]);

  const handleViewChange = (v) => {
    setSelectedView(v);
    setSearchParams({ viewid: v.viewid });
    setShowViewDrop(false);
  };

  const handleNewClick = () => {
    if (forms.length <= 1) {
      // Zero or one form — skip picker, open create directly
      setSelectedForm(forms[0] || null);
      setShowCreateModal(true);
    } else {
      setShowFormPicker(true);
    }
  };

  const handleFormSelect = (form) => {
    setSelectedForm(form);
    setShowFormPicker(false);
    setShowCreateModal(true);
  };

  if (!entityDef) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading metadata...</span>
    </div>
  );

  const metadata = entityDef.metadata || entityDef;
  const attributes = entityDef.attributes || [];
  const lookups = entityDef.lookups || [];
  const primaryId = metadata.primaryidattribute;
  const primaryName = metadata.primarynameattribute;

  // Columns from selected view
  const viewCols = selectedView?.definition?.columns || [primaryName, 'createdon'];
  const displayCols = attributes.filter(a => viewCols.includes(a.logicalname));

  // Search filter
  const filtered = records.filter(r =>
    !searchTerm || Object.values(r).some(v => String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Table size={18} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ margin: 0, textTransform: 'capitalize', fontSize: '1.15rem' }}>{metadata.displayname}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ── View Selector ── */}
          <div ref={viewDropRef} style={{ position: 'relative', marginLeft: '0.5rem' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowViewDrop(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 500, borderRadius: 8 }}
            >
              <Eye size={14} color="#6366f1" />
              {selectedView?.viewname || 'Select View'}
              <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: showViewDrop ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showViewDrop && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#1a1a2e', border: '1px solid var(--border)', borderRadius: 10, zIndex: 50, width: 230, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                  Views
                </div>
                {views.map(v => (
                  <div
                    key={v.viewid}
                    onClick={() => handleViewChange(v)}
                    style={{
                      padding: '0.65rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      color: v.viewid === selectedView?.viewid ? '#a5b4fc' : 'var(--text-main)',
                      background: v.viewid === selectedView?.viewid ? 'rgba(99,102,241,0.12)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (v.viewid !== selectedView?.viewid) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = v.viewid === selectedView?.viewid ? 'rgba(99,102,241,0.12)' : 'transparent'; }}
                  >
                    <span>{v.viewname}</span>
                    {v.isdefault && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 6 }}>Default</span>}
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.5rem 0.75rem' }}>
                  <Link to={`/entity/${logicalname}/views`} style={{ fontSize: '0.78rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Eye size={12} /> Manage Views
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Search + New ── */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              placeholder={`Search ${metadata.displayname}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: 260, height: 38, fontSize: '0.875rem' }}
            />
          </div>
          <button className="btn" style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.35rem 0.6rem', borderRadius: 8 }} onClick={fetchRecords} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button className="btn btn-primary" onClick={handleNewClick} style={{ height: 38, borderRadius: 8 }}>
            <Plus size={16} /> New
          </button>
        </div>
      </div>

      {/* ─── Grid ──────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {displayCols.map(col => (
                  <th key={col.logicalname}>{col.displayname}</th>
                ))}
                {displayCols.length === 0 && <th>Data</th>}
              </tr>
            </thead>
            <tbody>
              {recordsLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  {(displayCols.length || 1) > 0 && Array.from({ length: displayCols.length || 3 }).map((__, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.4s ease-in-out infinite' }} /></td>
                  ))}
                </tr>
              ))}

              {!recordsLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={displayCols.length || 1} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Table size={24} color="rgba(99,102,241,0.5)" />
                      </div>
                      <div style={{ fontWeight: 500 }}>No records found</div>
                      <div style={{ fontSize: '0.85rem' }}>{searchTerm ? 'Try a different search term.' : 'Click "+ New" to create the first record.'}</div>
                    </div>
                  </td>
                </tr>
              )}

              {!recordsLoading && filtered.map(record => (
                <tr
                  key={record[primaryId]}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/entity/${logicalname}/${record[primaryId]}`)}
                >
                  {displayCols.map(col => (
                    <td key={col.logicalname}>
                      {col.attributetype === 'Lookup'
                        ? <span style={{ color: '#a5b4fc', fontWeight: 500 }}>{record[`${col.logicalname}_name`] || record[col.logicalname]}</span>
                        : String(record[col.logicalname] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Form Picker Modal ──────────────────────────────────── */}
      {showFormPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 440, padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={20} color="#6366f1" />
                <h3 style={{ margin: 0 }}>Choose a Form</h3>
              </div>
              <button onClick={() => setShowFormPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.3rem' }}>×</button>
            </div>
            <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>Select which form to use for creating this record:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {forms.map(form => (
                <button
                  key={form.formid}
                  onClick={() => handleFormSelect(form)}
                  style={{
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10,
                    padding: '0.9rem 1.1rem', cursor: 'pointer', color: 'var(--text-main)', textAlign: 'left',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.14)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{form.formname}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {form.definition?.tabs?.flatMap(t => t.sections?.flatMap(s => s.fields) || []).length || 0} fields
                    </div>
                  </div>
                  {form.isdefault && <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', borderRadius: 6 }}>Default</span>}
                </button>
              ))}
              {forms.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No forms found. <Link to={`/entity/${logicalname}/forms`} style={{ color: '#6366f1' }}>Create a form</Link> first.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Record Modal ────────────────────────────────── */}
      {showCreateModal && (
        <DynamicForm
          entityLogicalName={logicalname}
          attributes={attributes}
          lookups={lookups}
          selectedForm={selectedForm}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchRecords();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default EntityList;
