import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { ChevronRight, ArrowRight } from 'lucide-react';

const Breadcrumb = ({ parts }) => (
  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1.5rem' }}>
    {parts.map((p, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={14} />}
        {p.to ? <Link to={p.to} style={{ color:'var(--accent)', textDecoration:'none' }}>{p.label}</Link> : <span style={{ color:'var(--text)' }}>{p.label}</span>}
      </React.Fragment>
    ))}
  </div>
);

const RelationshipsPage = () => {
  const { logicalname } = useParams();
  const { request, loading } = useApi();
  const [relationships, setRelationships] = useState([]);
  const [allEntities, setAllEntities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ relationshiptype:'1:N', primaryentity: logicalname, relatedentity:'', relationshipname:'', cascadebehavior:'None' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [rels, entities] = await Promise.all([
        request(`/metadata/relationship/${logicalname}`),
        request('/metadata/entity')
      ]);
      setRelationships(rels || []);
      setAllEntities(entities || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [logicalname]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await request('/metadata/relationship', {
        method: 'POST',
        body: JSON.stringify({ ...form, relationshipname: form.relationshipname || `${form.primaryentity}_${form.relatedentity}` })
      });
      setShowForm(false);
      setForm({ relationshiptype:'1:N', primaryentity: logicalname, relatedentity:'', relationshipname:'', cascadebehavior:'None' });
      await fetchData();
    } catch(e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const getBadgeColor = (type) => {
    if (type === '1:N') return { bg:'rgba(59,130,246,0.15)', text:'#93c5fd' };
    if (type === 'N:1') return { bg:'rgba(168,85,247,0.15)', text:'#c4b5fd' };
    return { bg:'rgba(20,184,166,0.15)', text:'#5eead4' };
  };

  return (
    <div className="glass-panel" style={{ padding:'1.5rem' }}>
      <Breadcrumb parts={[
        { label:'Entities' },
        { label: logicalname, to:`/entity/${logicalname}` },
        { label:'Relationships' }
      ]} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem' }}>
        <div>
          <h2 style={{ textTransform:'capitalize' }}>{logicalname} — Relationships</h2>
          <span style={{ fontSize:'0.85rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'0.2rem 0.75rem', borderRadius:'12px' }}>
            {relationships.length} relationships
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(null); }}>+ New Relationship</button>
      </div>

      {relationships.length === 0 && !loading ? (
        <div style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)', border:'1px dashed var(--border)', borderRadius:'var(--radius)' }}>
          No relationships defined yet. Create one to link entities.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {relationships.map((rel, i) => {
            const { bg, text } = getBadgeColor(rel.relationshiptype);
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.5rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, marginBottom:'0.25rem' }}>{rel.relationshipname}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', fontSize:'0.9rem' }}>
                    <span style={{ textTransform:'capitalize', color:'var(--text)' }}>{rel.primaryentityname}</span>
                    <span style={{ padding:'0.2rem 0.6rem', borderRadius:'8px', fontSize:'0.75rem', background: bg, color: text, fontWeight:600 }}>
                      {rel.relationshiptype}
                    </span>
                    <ArrowRight size={16} color="var(--text-muted)" />
                    <span style={{ textTransform:'capitalize', color:'var(--text)' }}>{rel.relatedentityname}</span>
                  </div>
                </div>
                <span style={{ fontSize:'0.8rem', color:'var(--text-muted)', background:'rgba(255,255,255,0.05)', padding:'0.2rem 0.5rem', borderRadius:'8px' }}>
                  Cascade: {rel.cascadebehavior}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Relationship Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="glass-panel" style={{ width:'500px', padding:'2rem' }}>
            <h3 style={{ marginBottom:'1.5rem' }}>Create Relationship</h3>
            {error && <div style={{ padding:'0.75rem', background:'rgba(255,0,0,0.1)', borderRadius:'var(--radius)', color:'#f87171', marginBottom:'1rem' }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>Relationship Type</label>
                <select value={form.relationshiptype} onChange={e => setForm(f => ({...f, relationshiptype:e.target.value}))}
                  style={{ width:'100%', padding:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'white' }}>
                  {['1:N','N:1','N:N'].map(t => <option key={t} value={t} style={{ background:'#1a1a2e' }}>{t}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>Primary Entity</label>
                <select value={form.primaryentity} onChange={e => setForm(f => ({...f, primaryentity:e.target.value}))}
                  style={{ width:'100%', padding:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'white' }}>
                  {allEntities.map(e => <option key={e.logicalname} value={e.logicalname} style={{ background:'#1a1a2e' }}>{e.displayname}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>Related Entity <span style={{ color:'var(--danger)' }}>*</span></label>
                <select required value={form.relatedentity} onChange={e => setForm(f => ({...f, relatedentity:e.target.value}))}
                  style={{ width:'100%', padding:'0.75rem', background:'rgba(255,255,255,0.05)', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'white' }}>
                  <option value="" style={{ background:'#1a1a2e' }}>-- Select Entity --</option>
                  {allEntities.map(e => <option key={e.logicalname} value={e.logicalname} style={{ background:'#1a1a2e' }}>{e.displayname}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label style={{ display:'block', marginBottom:'0.4rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>Relationship Name</label>
                <input value={form.relationshipname} onChange={e => setForm(f => ({...f, relationshipname:e.target.value}))} placeholder={`${form.primaryentity}_${form.relatedentity || 'entity'}`} style={{ fontFamily:'monospace' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1.5rem', paddingTop:'1rem', borderTop:'1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipsPage;
