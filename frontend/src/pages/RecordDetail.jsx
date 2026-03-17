import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import LookupSelector from '../components/LookupSelector';
import { ChevronRight, Save, Edit3, X, ChevronDown, Layout, FileText } from 'lucide-react';

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

const RecordDetail = () => {
    const { logicalname, id } = useParams();
    const navigate = useNavigate();
    const { request, loading } = useApi();

    const [entityDef, setEntityDef] = useState(null);
    const [record, setRecord] = useState(null);
    const [forms, setForms] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [activeTabIdx, setActiveTabIdx] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [def, rec, fList] = await Promise.all([
                    request(`/metadata/entity/${logicalname}`),
                    request(`/entity/${logicalname}/${id}`),
                    request(`/metadata/form/${logicalname}`)
                ]);
                setEntityDef(def);
                setRecord(rec);
                setFormData(rec);
                setForms(fList || []);
                
                // Select default form
                const defaultForm = fList.find(f => f.isdefault) || fList[0];
                if (defaultForm) {
                    const parsed = { ...defaultForm, definition: JSON.parse(defaultForm.definitionjson) };
                    setSelectedForm(parsed);
                }
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, [logicalname, id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await request(`/entity/${logicalname}/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(formData)
            });
            setRecord(formData);
            setEditMode(false);
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    const handleFormChange = (f) => {
        const parsed = { ...f, definition: JSON.parse(f.definitionjson) };
        setSelectedForm(parsed);
        setActiveTabIdx(0);
    };

    if (!entityDef || !record || !selectedForm) return <div className="p-8 text-center color-text-muted">Loading...</div>;

    const attributes = entityDef.attributes || [];
    const displayName = entityDef.metadata?.displayname || logicalname;
    const primaryNameAttr = entityDef.metadata?.primarynameattribute;
    const recordName = record[primaryNameAttr] || 'Record Details';

    const renderField = (fieldLogicalName) => {
        const attr = attributes.find(a => a.logicalname === fieldLogicalName);
        if (!attr) return null;

        const val = formData[fieldLogicalName];
        const label = attr.displayname;

        if (!editMode) {
            let displayVal = String(val ?? '');
            if (attr.attributetype === 'Lookup') {
                displayVal = record[`${fieldLogicalName}_name`] || val || '--';
                return (
                    <div key={fieldLogicalName} className="mb-4">
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</label>
                        <Link to={`/entity/${attr.targetentity}/${val}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>{displayVal}</Link>
                    </div>
                );
            }
            return (
                <div key={fieldLogicalName} className="mb-4">
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</label>
                    <div style={{ fontWeight: 500 }}>{displayVal || '--'}</div>
                </div>
            );
        }

        // Edit Mode Controls
        return (
            <div key={fieldLogicalName} className="mb-4">
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</label>
                {attr.attributetype === 'Lookup' ? (
                    <LookupSelector 
                        targetEntity={attr.targetentity}
                        value={val}
                        displayName={formData[`${fieldLogicalName}_name`]}
                        onChange={(newVal, newName) => setFormData({ ...formData, [fieldLogicalName]: newVal, [`${fieldLogicalName}_name`]: newName })}
                    />
                ) : attr.attributetype === 'Boolean' ? (
                    <select value={val ? 'true' : 'false'} onChange={e => setFormData({ ...formData, [fieldLogicalName]: e.target.value === 'true' })}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                ) : attr.attributetype === 'DateTime' ? (
                    <input type="datetime-local" value={val ? new Date(val).toISOString().slice(0, 16) : ''} onChange={e => setFormData({ ...formData, [fieldLogicalName]: e.target.value })} />
                ) : (
                    <input value={val ?? ''} onChange={e => setFormData({ ...formData, [fieldLogicalName]: e.target.value })} />
                )}
            </div>
        );
    };

    const activeTab = selectedForm.definition.tabs[activeTabIdx] || selectedForm.definition.tabs[0];

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <Breadcrumb parts={[{ label: 'Entities' }, { label: displayName, to: `/entity/${logicalname}` }, { label: recordName }]} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h2 style={{ margin: 0 }}>{recordName}</h2>
                        
                        {/* Form Selector */}
                        <div style={{ position: 'relative' }}>
                            <button className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                                <Layout size={14} /> {selectedForm.formname} <ChevronDown size={12} />
                            </button>
                            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem', background: '#1a1a2e', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 30, width: '200px', display: 'none' }} className="form-dropdown">
                                {forms.map(f => (
                                    <div key={f.formid} onClick={() => handleFormChange(f)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                        {f.formname}
                                    </div>
                                ))}
                            </div>
                            <style>{`.btn:focus + .form-dropdown, .form-dropdown:hover { display: block !important; }`}</style>
                        </div>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{displayName} ID: {id}</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {editMode ? (
                        <>
                            <button className="btn btn-ghost" onClick={() => { setEditMode(false); setFormData(record); }}>
                                <X size={18} /> Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                <Save size={18} /> {saving ? 'Saving...' : 'Save'}
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                            <Edit3 size={18} /> Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: '1.5rem' }}>
                {selectedForm.definition.tabs.map((tab, i) => (
                    <button key={i} onClick={() => setActiveTabIdx(i)}
                        style={{ background: 'none', border: 'none', padding: '0.75rem 0.25rem', cursor: 'pointer', color: activeTabIdx === i ? 'var(--accent)' : 'var(--text-muted)', 
                                 borderBottom: `2px solid ${activeTabIdx === i ? 'var(--accent)' : 'transparent'}`, fontWeight: activeTabIdx === i ? 600 : 400, fontSize: '0.9rem' }}>
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Dynamic Content Rendering */}
            <div>
                {activeTab?.sections.map((section, si) => (
                    <div key={si} style={{ marginBottom: '2.5rem' }}>
                        <h4 style={{ textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', marginBottom: '1rem' }}>
                            {section.name}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${section.columns || 1}, 1fr)`, gap: '0 2rem' }}>
                            {section.fields.map(f => renderField(f))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecordDetail;
