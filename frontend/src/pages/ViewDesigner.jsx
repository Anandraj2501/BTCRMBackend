import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { ChevronRight, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

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

const ViewDesigner = () => {
    const { logicalname } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const viewId = searchParams.get('viewid');
    const { request, loading } = useApi();

    const [entity, setEntity] = useState(null);
    const [viewName, setViewName] = useState('New View');
    const [isDefault, setIsDefault] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [filters, setFilters] = useState([]);
    const [sorting, setSorting] = useState([]); // [{ field, direction: 'asc'|'desc' }]
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const ent = await request(`/metadata/entity/${logicalname}`);
                setEntity(ent);
                
                if (viewId) {
                    // This would need a custom endpoint or we use the list one
                    const views = await request(`/metadata/view/${logicalname}`);
                    const v = views.find(v => v.viewid === viewId);
                    if (v) {
                        setViewName(v.viewname);
                        setIsDefault(v.isdefault);
                        setSelectedColumns(v.definition.columns || []);
                        setFilters(v.definition.filters || []);
                        setSorting(v.definition.sorting || []);
                    }
                }
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, [logicalname, viewId]);

    const handleToggleColumn = (col) => {
        setSelectedColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
    };

    const addFilter = () => setFilters([...filters, { field: '', operator: 'eq', value: '' }]);
    const updateFilter = (index, key, val) => {
        const newFilters = [...filters];
        newFilters[index][key] = val;
        setFilters(newFilters);
    };
    const removeFilter = (index) => setFilters(filters.filter((_, i) => i !== index));

    const addSort = () => setSorting([...sorting, { field: '', direction: 'asc' }]);
    const updateSort = (index, key, val) => {
        const newSorts = [...sorting];
        newSorts[index][key] = val;
        setSorting(newSorts);
    };
    const removeSort = (index) => setSorting(sorting.filter((_, i) => i !== index));

    const handleSave = async () => {
        setSaving(true);
        try {
            await request('/metadata/view', {
                method: 'POST',
                body: JSON.stringify({
                    entitylogicalname: logicalname,
                    viewname: viewName,
                    isdefault: isDefault,
                    definition: { columns: selectedColumns, filters, sorting }
                })
            });
            navigate(`/entity/${logicalname}/views`);
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    if (!entity) return null;

    const attributes = entity.attributes || [];
    const displayName = entity.metadata?.displayname || logicalname;

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <Breadcrumb parts={[{ label: 'Entities' }, { label: displayName, to: `/entity/${logicalname}` }, { label: 'Views', to: `/entity/${logicalname}/views` }, { label: 'Designer' }]} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>View Designer</h2>
                    <input value={viewName} onChange={e => setViewName(e.target.value)} 
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.4rem 0.8rem', borderRadius: '8px', color: 'white', fontSize: '1rem' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} /> Default View
                    </label>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    <Save size={18} /> {saving ? 'Saving...' : 'Save View'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
                <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                    <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Columns</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {attributes.map(attr => (
                            <label key={attr.logicalname} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}>
                                <input type="checkbox" checked={selectedColumns.includes(attr.logicalname)} onChange={() => handleToggleColumn(attr.logicalname)} />
                                <span style={{ fontSize: '0.9rem' }}>{attr.displayname}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-8">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>Filters</h3>
                            <button className="btn btn-ghost" onClick={addFilter} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                                <Plus size={14} /> Add Filter
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {filters.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No filters applied. View will show all records.</p>}
                            {filters.map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select value={f.field} onChange={e => updateFilter(i, 'field', e.target.value)} style={{ flex: 1, padding: '0.4rem' }}>
                                        <option value="">Select Field</option>
                                        {attributes.map(a => <option key={a.logicalname} value={a.logicalname}>{a.displayname}</option>)}
                                    </select>
                                    <select value={f.operator} onChange={e => updateFilter(i, 'operator', e.target.value)} style={{ width: '120px', padding: '0.4rem' }}>
                                        <option value="eq">Equals</option>
                                        <option value="neq">Does Not Equal</option>
                                        <option value="contains">Contains</option>
                                        <option value="gt">Greater Than</option>
                                        <option value="lt">Less Than</option>
                                    </select>
                                    <input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} placeholder="Value" style={{ flex: 1, padding: '0.4rem' }} />
                                    <button onClick={() => removeFilter(i)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1rem', margin: 0 }}>Sorting</h3>
                            <button className="btn btn-ghost" onClick={addSort} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>
                                <Plus size={14} /> Add Sort
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {sorting.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No sorting applied.</p>}
                            {sorting.map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select value={s.field} onChange={e => updateSort(i, 'field', e.target.value)} style={{ flex: 1, padding: '0.4rem' }}>
                                        <option value="">Select Field</option>
                                        {attributes.map(a => <option key={a.logicalname} value={a.logicalname}>{a.displayname}</option>)}
                                    </select>
                                    <select value={s.direction} onChange={e => updateSort(i, 'direction', e.target.value)} style={{ width: '120px', padding: '0.4rem' }}>
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                    <button onClick={() => removeSort(i)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewDesigner;
