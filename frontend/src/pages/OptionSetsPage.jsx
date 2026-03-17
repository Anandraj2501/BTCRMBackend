import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { Plus, Trash2, Edit3, Save, Package, Filter, Globe } from 'lucide-react';

const OptionSetsPage = () => {
  const { request, loading } = useApi();
  const [optionSets, setOptionSets] = useState([]);
  const [entities, setEntities] = useState([]);
  const [entityFilter, setEntityFilter] = useState('all'); // 'all' or entity logicalname
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', displayname: '', isglobal: true, entitylogicalname: '', options: [{ label: '', value: 1 }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    try {
      const [osData, entData] = await Promise.all([
        request('/metadata/optionset'),
        request('/metadata/entity'),
      ]);
      const osList = Array.isArray(osData) ? osData : (osData?.data || []);
      const entList = Array.isArray(entData) ? entData : (entData?.data || []);
      setOptionSets(osList);
      setEntities(entList);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Filter option sets by selected entity
  const displayedSets = entityFilter === 'all'
    ? optionSets
    : optionSets.filter(os => !os.isglobal && os.entitylogicalname === entityFilter);

  const addOption = () => {
    const nextVal = Math.max(...form.options.map(o => o.value), 0) + 1;
    setForm(f => ({ ...f, options: [...f.options, { label: '', value: nextVal }] }));
  };

  const updateOption = (i, key, val) => {
    setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, [key]: val } : o) }));
  };

  const removeOption = (i) => {
    setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!form.displayname.trim()) { setError('Display name is required.'); return; }
    if (form.options.some(o => !o.label.trim())) { setError('All option labels must be filled.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        displayname: form.displayname,
        name: form.name || form.displayname.toLowerCase().replace(/\s+/g, '_'),
        isglobal: form.isglobal,
        entitylogicalname: form.isglobal ? null : (form.entitylogicalname || null),
        options: form.options,
      };
      if (editingId) {
        await request(`/metadata/optionset/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await request('/metadata/optionset', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false); setEditingId(null);
      setForm({ name: '', displayname: '', isglobal: true, entitylogicalname: '', options: [{ label: '', value: 1 }] });
      await fetchAll();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const startEdit = (os) => {
    setForm({
      name: os.name,
      displayname: os.displayname,
      isglobal: os.isglobal,
      entitylogicalname: os.entitylogicalname || '',
      options: os.options || [],
    });
    setEditingId(os.optionsetid);
    setShowForm(true);
  };

  const openNew = () => {
    const prefilledEntity = entityFilter !== 'all' ? entityFilter : '';
    setForm({
      name: '', displayname: '',
      isglobal: entityFilter === 'all',
      entitylogicalname: prefilledEntity,
      options: [{ label: '', value: 1 }],
    });
    setEditingId(null);
    setShowForm(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={18} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Option Sets</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{displayedSets.length} option set{displayedSets.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Entity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '0.35rem 0.75rem', fontSize: '0.85rem', height: 36 }}
            >
              <option value="all">All Option Sets</option>
              {entities.map(ent => (
                <option key={ent.logicalname} value={ent.logicalname}>{ent.displayname}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={openNew} style={{ height: 36, borderRadius: 8 }}>
            <Plus size={15} /> New Option Set
          </button>
        </div>
      </div>

      {/* ─── List ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {!loading && displayedSets.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={40} color="rgba(99,102,241,0.3)" style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 500, marginBottom: '0.4rem' }}>No option sets{entityFilter !== 'all' ? ` for this entity` : ''}</div>
            <div style={{ fontSize: '0.85rem' }}>Create one to use as dropdown choices in your entity columns.</div>
          </div>
        )}

        {displayedSets.map((os) => (
          <div key={os.optionsetid} className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{os.displayname}</span>
                <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: 5 }}>{os.name}</code>
                {os.isglobal
                  ? <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Globe size={11} /> Global</span>
                  : <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', borderRadius: 6 }}>{os.entitylogicalname || 'Entity'}</span>
                }
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.25rem 0.6rem', fontSize: '0.82rem' }} onClick={() => startEdit(os)}>
                <Edit3 size={13} /> Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {(os.options || []).map((opt, i) => (
                <span key={i} style={{ padding: '0.25rem 0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {opt.label}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', background: 'rgba(0,0,0,0.3)', padding: '0 0.3rem', borderRadius: 4 }}>{opt.value}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Create / Edit Modal ────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>{editingId ? 'Edit' : 'Create'} Option Set</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            {error && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#fca5a5', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

            {/* Display Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Display Name *</label>
              <input
                value={form.displayname}
                onChange={e => setForm(f => ({
                  ...f,
                  displayname: e.target.value,
                  name: editingId ? f.name : e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
                }))}
                placeholder="e.g. Status"
              />
            </div>

            {/* Logical Name (read-only on edit) */}
            {!editingId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Logical Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="auto-generated from display name" />
              </div>
            )}

            {/* Scope: Global or Entity-specific */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Scope</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isglobal: true, entitylogicalname: '' }))}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: `1px solid ${form.isglobal ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, background: form.isglobal ? 'rgba(99,102,241,0.12)' : 'transparent', color: form.isglobal ? '#a5b4fc' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: form.isglobal ? 600 : 400, transition: 'all 0.15s' }}
                >
                  <Globe size={14} /> Global
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isglobal: false }))}
                  style={{ flex: 1, padding: '0.65rem', borderRadius: 8, border: `1px solid ${!form.isglobal ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, background: !form.isglobal ? 'rgba(99,102,241,0.12)' : 'transparent', color: !form.isglobal ? '#a5b4fc' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: !form.isglobal ? 600 : 400, transition: 'all 0.15s' }}
                >
                  <Package size={14} /> Entity-specific
                </button>
              </div>
            </div>

            {/* Entity selector (only when entity-specific) */}
            {!form.isglobal && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Entity *</label>
                <select value={form.entitylogicalname} onChange={e => setForm(f => ({ ...f, entitylogicalname: e.target.value }))}>
                  <option value="">-- Select Entity --</option>
                  {entities.map(ent => (
                    <option key={ent.logicalname} value={ent.logicalname}>{ent.displayname} ({ent.logicalname})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Options table */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>Options</label>
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={addOption}>
                  <Plus size={13} /> Add Option
                </button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 36px', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>Label</span><span style={{ textAlign: 'center' }}>Value</span><span />
                </div>
                {form.options.map((opt, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 36px', gap: '0.5rem', padding: '0.4rem 0.6rem', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                    <input value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)} placeholder="Label" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} />
                    <input type="number" value={opt.value} onChange={e => updateOption(i, 'value', parseInt(e.target.value) || 0)} style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', textAlign: 'center' }} />
                    <button onClick={() => removeOption(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {form.options.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No options yet. Click "Add Option" to start.</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 100 }}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionSetsPage;
