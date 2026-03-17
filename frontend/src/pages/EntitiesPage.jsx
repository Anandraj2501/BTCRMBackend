import React, { useState, useEffect } from 'react';
import useApi from '../hooks/useApi';
import { Plus, Database, ChevronRight, Settings, Layers, Box } from 'lucide-react';
import { Link } from 'react-router-dom';

const EntitiesPage = () => {
    const { request, loading } = useApi();
    const [entities, setEntities] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [newEntity, setNewEntity] = useState({
        displayname: '',
        logicalname: '',
        schemaname: '',
        primaryidattribute: '',
        primarynameattribute: 'name'
    });

    const fetchData = async () => {
        try {
            const data = await request('/metadata/entity');
            setEntities(Array.isArray(data) ? data : (data?.data || []));
        } catch (e) {
            console.error('Error fetching entities:', e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        if (!newEntity.displayname || !newEntity.logicalname) {
            alert('Display Name and Logical Name are required.');
            return;
        }

        setSaving(true);
        try {
            // Backend expects: logicalname, displayname, schemaname, primaryidattribute, primarynameattribute
            // Primary ID attribute usually matches logicalname + 'id'
            const payload = {
                ...newEntity,
                schemaname: newEntity.schemaname || newEntity.logicalname,
                primaryidattribute: newEntity.primaryidattribute || `${newEntity.logicalname}id`
            };

            await request('/metadata/entity', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            setShowModal(false);
            setNewEntity({
                displayname: '',
                logicalname: '',
                schemaname: '',
                primaryidattribute: '',
                primarynameattribute: 'name'
            });
            fetchData();
            // We might need to trigger a sidebar reload here, but Sidebar uses useApi which might not have global state
            // For now, a manual refresh will definitely work.
            window.location.reload(); 
        } catch (e) {
            alert(e.message || 'Error creating entity');
        } finally {
            setSaving(false);
        }
    };

    const handleNameChange = (val) => {
        const logical = val.toLowerCase().replace(/\s+/g, '_');
        setNewEntity({
            ...newEntity,
            displayname: val,
            logicalname: logical,
            schemaname: logical
        });
    };

    return (
        <div className="content-area">
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <Database size={24} className="text-accent" />
                            Entity Management
                        </h2>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>
                            Manage your CRM entities, schemas, and configurations.
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> New Entity
                    </button>
                </div>

                {loading && entities.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: '1rem' }}>Loading entities...</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Display Name</th>
                                <th>Logical Name</th>
                                <th>Primary Name Attribute</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entities.map(entity => (
                                <tr key={entity.logicalname}>
                                    <td style={{ fontWeight: 600 }}>{entity.displayname}</td>
                                    <td>
                                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            {entity.logicalname}
                                        </code>
                                    </td>
                                    <td>{entity.primarynameattribute}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Link to={`/entity/${entity.logicalname}/columns`} className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                <Layers size={14} /> Columns
                                            </Link>
                                            <Link to={`/entity/${entity.logicalname}/settings`} className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                                                <Settings size={14} /> Settings
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && entities.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                        <Box size={48} style={{ marginBottom: '1rem' }} />
                        <p>No entities found. Create your first entity or check the backend.</p>
                    </div>
                )}
            </div>

            {/* Create Entity Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Create New Entity</h3>
                        
                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Display Name</label>
                            <input 
                                placeholder="e.g. Purchase Order"
                                value={newEntity.displayname} 
                                onChange={e => handleNameChange(e.target.value)} 
                            />
                        </div>

                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Logical Name</label>
                            <input 
                                placeholder="e.g. purchase_order"
                                value={newEntity.logicalname} 
                                onChange={e => setNewEntity({ ...newEntity, logicalname: e.target.value })} 
                            />
                        </div>

                        <div className="mb-4">
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Primary Name Attribute</label>
                            <input 
                                placeholder="Default: name"
                                value={newEntity.primarynameattribute} 
                                onChange={e => setNewEntity({ ...newEntity, primarynameattribute: e.target.value })} 
                            />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                The attribute used as the display label for records.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                                {saving ? 'Creating...' : 'Create Entity'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EntitiesPage;
