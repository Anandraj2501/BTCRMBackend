import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useApi from '../hooks/useApi';
import { GripVertical, ChevronRight, Plus, Trash2, Save, ChevronDown } from 'lucide-react';

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

const SortableField = ({ id, label, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', marginBottom: '0.35rem' }}>
      <button {...listeners} {...attributes} style={{ background: 'none', border: 'none', cursor: 'grab', color: 'var(--text-muted)', padding: 0 }}>
        <GripVertical size={14} />
      </button>
      <span style={{ flex: 1, fontSize: '0.85rem' }}>{label}</span>
      <button onClick={() => onRemove(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0 }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
};

const FormDesigner = () => {
  const { logicalname } = useParams();
  const [searchParams] = useSearchParams();
  const { request } = useApi();
  const sensors = useSensors(useSensor(PointerSensor));

  const [entityDef, setEntityDef] = useState(null);
  const [formName, setFormName] = useState('Main Form');
  const [isDefault, setIsDefault] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [tabs, setTabs] = useState([{
    name: 'General',
    sections: [{ name: 'Information', columns: 2, fields: [] }]
  }]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    request(`/metadata/entity/${logicalname}`).then(setEntityDef).catch(console.error);
  }, [logicalname]);

  const systemFields = ['baseentityid', 'statecode', 'statuscode', 'ownerid'];
  const allAttrs = (entityDef?.attributes || []).filter(a => !systemFields.includes(a.logicalname));
  const usedFields = tabs.flatMap(t => t.sections.flatMap(s => s.fields));
  const available = allAttrs.filter(a => !usedFields.includes(a.logicalname));

  // Tab operations
  const addTab = () => setTabs(t => [...t, { name: `Tab ${t.length + 1}`, sections: [{ name: 'Section', columns: 2, fields: [] }] }]);
  const removeTab = (ti) => setTabs(t => t.filter((_, idx) => idx !== ti));
  const renameTab = (ti, name) => setTabs(t => t.map((tab, idx) => idx === ti ? { ...tab, name } : tab));

  // Section operations
  const addSection = (ti) => setTabs(t => t.map((tab, idx) => idx === ti ? { ...tab, sections: [...tab.sections, { name: 'New Section', columns: 2, fields: [] }] } : tab));
  const removeSection = (ti, si) => setTabs(t => t.map((tab, idx) => idx === ti ? { ...tab, sections: tab.sections.filter((_, sidx) => sidx !== si) } : tab));
  const renameSection = (ti, si, name) => setTabs(t => t.map((tab, idx) => idx === ti ? { ...tab, sections: tab.sections.map((s, sidx) => sidx === si ? { ...s, name } : s) } : tab));
  const setSectionColumns = (ti, si, cols) => setTabs(t => t.map((tab, idx) => idx === ti ? { ...tab, sections: tab.sections.map((s, sidx) => sidx === si ? { ...s, columns: cols } : s) } : tab));

  // Field operations
  const addFieldToSection = (ti, si, attrLogical) => {
    setTabs(t => t.map((tab, idx) => idx === ti ? {
      ...tab, sections: tab.sections.map((s, sidx) => sidx === si ? { ...s, fields: [...s.fields, attrLogical] } : s)
    } : tab));
  };

  const removeFieldFromSection = (ti, si, fieldLogical) => {
    setTabs(t => t.map((tab, idx) => idx === ti ? {
      ...tab, sections: tab.sections.map((s, sidx) => sidx === si ? { ...s, fields: s.fields.filter(f => f !== fieldLogical) } : s)
    } : tab));
  };

  const handleDragEnd = (ti, si, { active, over }) => {
    if (!over || active.id === over.id) return;
    setTabs(t => t.map((tab, tidx) => tidx === ti ? {
      ...tab, sections: tab.sections.map((s, sidx) => {
        if (sidx !== si) return s;
        const oldIdx = s.fields.indexOf(active.id);
        const newIdx = s.fields.indexOf(over.id);
        return { ...s, fields: arrayMove(s.fields, oldIdx, newIdx) };
      })
    } : tab));
  };

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      await request('/metadata/form', {
        method: 'POST',
        body: JSON.stringify({ entitylogicalname: logicalname, formname: formName, isdefault: isDefault, definition: { tabs } })
      });
      setSuccess('Form saved successfully!');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const displayName = entityDef?.metadata?.displayname || logicalname;
  const activeTab = tabs[activeTabIdx] || tabs[0];

  const getLabel = (logical) => allAttrs.find(a => a.logicalname === logical)?.displayname || logical;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <Breadcrumb parts={[{ label: 'Entities' }, { label: displayName, to: `/entity/${logicalname}` }, { label: 'Forms', to: `/entity/${logicalname}/forms` }, { label: 'Designer' }]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <h2 style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{displayName} Form</h2>
          <input value={formName} onChange={e => setFormName(e.target.value)} style={{ fontFamily: 'inherit', padding: '0.4rem 0.75rem', fontSize: '0.9rem', width: '200px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Set as Default
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Form'}</button>
      </div>

      {success && <div style={{ padding: '0.75rem', background: 'rgba(0,200,0,0.1)', border: '1px solid rgba(0,200,0,0.3)', borderRadius: 'var(--radius)', marginBottom: '1rem', color: '#4ade80' }}>{success}</div>}
      {error && <div style={{ padding: '0.75rem', background: 'rgba(255,0,0,0.1)', borderRadius: 'var(--radius)', color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', minHeight: '480px' }}>
        {/* Field Palette */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.08em' }}>Fields Palette</h4>
          {available.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>All fields placed on form</div>}
          {available.map(attr => (
            <div key={attr.logicalname}
              style={{ padding: '0.45rem 0.6rem', cursor: 'pointer', borderRadius: '6px', marginBottom: '0.3rem', background: 'rgba(255,255,255,0.03)', fontSize: '0.85rem', border: '1px solid transparent', transition: 'all 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'transparent'; }}
              onClick={() => { if (activeTab) addFieldToSection(activeTabIdx, 0, attr.logicalname); }}>
              <div>{attr.displayname}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{attr.attributetype}</div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Tab Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            {tabs.map((tab, ti) => (
              <div key={ti} onClick={() => setActiveTabIdx(ti)}
                style={{ padding: '0.45rem 1rem', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '0.9rem', fontWeight: ti === activeTabIdx ? 600 : 400,
                  background: ti === activeTabIdx ? 'rgba(99,102,241,0.15)' : 'transparent', color: ti === activeTabIdx ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: ti === activeTabIdx ? '2px solid var(--accent)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {tab.name}
                {tabs.length > 1 && <button onClick={e => { e.stopPropagation(); removeTab(ti); if (activeTabIdx >= ti) setActiveTabIdx(Math.max(0, ti - 1)); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0, lineHeight: 1 }}>×</button>}
              </div>
            ))}
            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={addTab}><Plus size={14} /> Tab</button>
          </div>

          {/* Active Tab Name */}
          {activeTab && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tab Name:</span>
              <input value={activeTab.name} onChange={e => renameTab(activeTabIdx, e.target.value)} style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem', width: '160px' }} />
              <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginLeft: 'auto' }} onClick={() => addSection(activeTabIdx)}><Plus size={14} /> Add Section</button>
            </div>
          )}

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
            {activeTab?.sections.map((section, si) => (
              <div key={si} style={{ border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <input value={section.name} onChange={e => renameSection(activeTabIdx, si, e.target.value)} style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem', fontWeight: 600 }} />
                  <select value={section.columns} onChange={e => setSectionColumns(activeTabIdx, si, parseInt(e.target.value))}
                    style={{ padding: '0.3rem 0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}>
                    <option value={1} style={{ background: '#1a1a2e' }}>1 col</option>
                    <option value={2} style={{ background: '#1a1a2e' }}>2 cols</option>
                    <option value={3} style={{ background: '#1a1a2e' }}>3 cols</option>
                  </select>
                  {activeTab.sections.length > 1 && (
                    <button onClick={() => removeSection(activeTabIdx, si)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', marginLeft: 'auto' }}><Trash2 size={14} /></button>
                  )}
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(activeTabIdx, si, e)}>
                  <SortableContext items={section.fields} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns}, 1fr)`, gap: '0.5rem', minHeight: '60px' }}>
                      {section.fields.length === 0 && (
                        <div style={{ gridColumn: `span ${section.columns}`, padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Click a field from the palette to add it here
                        </div>
                      )}
                      {section.fields.map(fieldLogical => (
                        <SortableField key={fieldLogical} id={fieldLogical} label={getLabel(fieldLogical)}
                          onRemove={() => removeFieldFromSection(activeTabIdx, si, fieldLogical)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormDesigner;
