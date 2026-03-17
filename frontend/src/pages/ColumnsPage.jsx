import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { Plus, ChevronRight, Calculator, Type, Hash, Calendar, CheckSquare, Link as LinkIcon, List, DollarSign } from 'lucide-react';

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

const ColumnsPage = () => {
    const { logicalname } = useParams();
    const { request, loading } = useApi();
    const [entity, setEntity] = useState(null);
    const [globalOptionSets, setGlobalOptionSets] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [newCol, setNewCol] = useState({
        logicalname: '',
        displayname: '',
        attributetype: 'SingleLineText',
        maxlength: 100,
        optionsetid: '',
        targetentity: '',
        requirementlevel: 'None'
    });

    const fetchData = async () => {
        try {
            const data = await request(`/metadata/entity/${logicalname}`);
            setEntity(data);
            const optSets = await request('/metadata/optionset');
            setGlobalOptionSets(optSets || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchData(); }, [logicalname]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            await request('/metadata/attribute', {
                method: 'POST',
                body: JSON.stringify({ ...newCol, entitylogicalname: logicalname })
            });
            setShowModal(false);
            setNewCol({ logicalname: '', displayname: '', attributetype: 'SingleLineText', maxlength: 100, optionsetid: '', targetentity: '', requirementlevel: 'None' });
            fetchData();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (!entity) return null;

    const attributes = entity.attributes || [];
    const displayName = entity.metadata?.displayname || logicalname;

    const getTypeIcon = (type) => {
        switch (type) {
            case 'SingleLineText': return <Type size={14} />;
            case 'MultipleLineText': return <Type size={14} />;
            case 'WholeNumber': return <Hash size={14} />;
            case 'DecimalNumber': return <Hash size={14} />;
            case 'Currency': return <DollarSign size={14} />;
            case 'DateTime': return <Calendar size={14} />;
            case 'Boolean': return <CheckSquare size={14} />;
            case 'Lookup': return <LinkIcon size={14} />;
            case 'OptionSet': return <List size={14} />;
            default: return <Calculator size={14} />;
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <Breadcrumb parts={[{ label: 'Entities' }, { label: displayName, to: `/entity/${logicalname}` }, { label: 'Columns' }]} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Columns <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>({attributes.length})</span></h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> New Column
                </button>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Display Name</th>
                        <th>Logical Name</th>
                        <th>Type</th>
                        <th>Max Length</th>
                        <th>Requirement</th>
                    </tr>
                </thead>
                <tbody>
                    {attributes.map((attr) => (
                        <tr key={attr.attributeid}>
                            <td style={{ fontWeight: 600 }}>{attr.displayname}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{attr.logicalname}</td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    {getTypeIcon(attr.attributetype)}
                                    {attr.attributetype}
                                </div>
                            </td>
                            <td>{attr.maxlength || '-'}</td>
                            <td>
                                {attr.requirementlevel === 'Required' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.2rem 0.6rem', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600 }}>
                                        <span style={{ color: '#f87171' }}>*</span> Required
                                    </span>
                                )}
                                {attr.requirementlevel === 'BusinessRequired' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.2rem 0.6rem', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', fontWeight: 600 }}>
                                        <span style={{ color: '#818cf8', fontSize: '1.1rem' }}>+</span> Business Required
                                    </span>
                                )}
                                {(!attr.requirementlevel || attr.requirementlevel === 'None') && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-panel" style={{ width: '450px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>New Column</h3>
                        
                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Display Name</label>
                            <input value={newCol.displayname} onChange={e => setNewCol({ ...newCol, displayname: e.target.value, logicalname: e.target.value.toLowerCase().replace(/\s+/g, '_') })} />
                        </div>

                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Logical Name</label>
                            <input value={newCol.logicalname} onChange={e => setNewCol({ ...newCol, logicalname: e.target.value })} />
                        </div>

                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Data Type</label>
                            <select value={newCol.attributetype} onChange={e => setNewCol({ ...newCol, attributetype: e.target.value })}>
                                <option value="SingleLineText">Single Line Text</option>
                                <option value="MultipleLineText">Multiple Line Text</option>
                                <option value="WholeNumber">Whole Number</option>
                                <option value="DecimalNumber">Decimal Number</option>
                                <option value="Currency">Currency</option>
                                <option value="DateTime">Date and Time</option>
                                <option value="Boolean">Yes/No</option>
                                <option value="Lookup">Lookup</option>
                                <option value="OptionSet">Choice (Option Set)</option>
                            </select>
                        </div>

                        {newCol.attributetype === 'SingleLineText' && (
                            <div className="mb-4">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Max Length</label>
                                <input type="number" value={newCol.maxlength} onChange={e => setNewCol({ ...newCol, maxlength: parseInt(e.target.value) })} />
                            </div>
                        )}

                        {newCol.attributetype === 'OptionSet' && (
                            <div className="mb-4">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Global Option Set</label>
                                <select value={newCol.optionsetid} onChange={e => setNewCol({ ...newCol, optionsetid: e.target.value })}>
                                    <option value="">Select Option Set</option>
                                    {globalOptionSets.map(gs => (
                                        <option key={gs.optionsetid} value={gs.optionsetid}>{gs.displayname}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {newCol.attributetype === 'Lookup' && (
                            <div className="mb-4">
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Target Entity</label>
                                <input value={newCol.targetentity} onChange={e => setNewCol({ ...newCol, targetentity: e.target.value })} placeholder="e.g. account" />
                            </div>
                        )}

                        {/* ── Requirement Level ── */}
                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Requirement Level</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                {[
                                    { value: 'None', label: 'Not Required', color: 'rgba(255,255,255,0.06)', activeColor: 'rgba(255,255,255,0.12)', textColor: 'var(--text-muted)', indicator: null },
                                    { value: 'Required', label: 'Required', color: 'rgba(239,68,68,0.06)', activeColor: 'rgba(239,68,68,0.18)', textColor: '#fca5a5', indicator: '*' },
                                    { value: 'BusinessRequired', label: 'Business Required', color: 'rgba(99,102,241,0.06)', activeColor: 'rgba(99,102,241,0.18)', textColor: '#a5b4fc', indicator: '+' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setNewCol({ ...newCol, requirementlevel: opt.value })}
                                        style={{
                                            padding: '0.65rem 0.5rem', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                            border: `1px solid ${newCol.requirementlevel === opt.value ? (opt.value === 'Required' ? 'rgba(239,68,68,0.4)' : opt.value === 'BusinessRequired' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.15)') : 'rgba(255,255,255,0.08)'}`,
                                            background: newCol.requirementlevel === opt.value ? opt.activeColor : opt.color,
                                            color: newCol.requirementlevel === opt.value ? opt.textColor : 'var(--text-muted)',
                                            fontWeight: newCol.requirementlevel === opt.value ? 600 : 400,
                                            fontSize: '0.82rem', transition: 'all 0.15s', fontFamily: 'inherit',
                                        }}
                                    >
                                        {opt.indicator && <div style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>{opt.indicator}</div>}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColumnsPage;
