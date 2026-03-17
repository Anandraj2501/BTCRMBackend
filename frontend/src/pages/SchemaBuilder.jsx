import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import useApi from '../hooks/useApi';

const SchemaBuilder = () => {
  const { request, loading, error } = useApi();
  const [searchParams] = useSearchParams();
  const [successMsg, setSuccessMsg] = useState('');

  const [entityForm, setEntityForm] = useState({
    logicalname: '', displayname: '', schemaname: '', primaryidattribute: '', primarynameattribute: ''
  });

  const [attrForm, setAttrForm] = useState({
    entitylogicalname: searchParams.get('entity') || '', 
    logicalname: '', displayname: '', schemaname: '', attributetype: 'String', maxlength: 100, isnullable: true
  });

  useEffect(() => {
     if(searchParams.get('entity')) {
         setAttrForm(prev => ({ ...prev, entitylogicalname: searchParams.get('entity') }));
     }
  }, [searchParams]);

  const handleEntitySubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await request('/metadata/entity', { method: 'POST', body: JSON.stringify(entityForm) });
      setSuccessMsg(`Entity created: ${res}`);
      setEntityForm({logicalname: '', displayname: '', schemaname: '', primaryidattribute: '', primarynameattribute: ''});
    } catch (err) {}
  };

  const handleAttrSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await request('/metadata/attribute', { method: 'POST', body: JSON.stringify(attrForm) });
      setSuccessMsg(`Attribute created. ID: ${res.attributeid}`);
      setAttrForm({...attrForm, logicalname:'', displayname:'', schemaname:''}); // reset specific fields
    } catch(err) {}
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 className="mb-6">Schema Builder</h2>
      
      {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
      {successMsg && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{successMsg}</div>}

      <div className="glass-panel mb-6" style={{ padding: '2rem' }}>
        <h3 className="mb-4">Create New Entity</h3>
        <form onSubmit={handleEntitySubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logical Name (e.g. account)</label>
            <input required value={entityForm.logicalname} onChange={e => setEntityForm({...entityForm, logicalname: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Display Name (e.g. Account)</label>
            <input required value={entityForm.displayname} onChange={e => setEntityForm({...entityForm, displayname: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Schema Name (e.g. Account)</label>
            <input required value={entityForm.schemaname} onChange={e => setEntityForm({...entityForm, schemaname: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Primary ID Attribute (e.g. accountid)</label>
            <input required value={entityForm.primaryidattribute} onChange={e => setEntityForm({...entityForm, primaryidattribute: e.target.value})} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Primary Name Attribute (e.g. name)</label>
            <input required value={entityForm.primarynameattribute} onChange={e => setEntityForm({...entityForm, primarynameattribute: e.target.value})} />
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{ gridColumn: '1 / -1' }}>Create Entity</button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 className="mb-4">Create New Attribute</h3>
        <form onSubmit={handleAttrSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Entity Logical Name</label>
            <input required value={attrForm.entitylogicalname} onChange={e => setAttrForm({...attrForm, entitylogicalname: e.target.value})} placeholder="e.g. contact" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Attribute Type</label>
            <select value={attrForm.attributetype} onChange={e => setAttrForm({...attrForm, attributetype: e.target.value})}>
              <option value="String">String</option>
              <option value="Integer">Integer</option>
              <option value="Decimal">Decimal</option>
              <option value="DateTime">DateTime</option>
              <option value="Boolean">Boolean</option>
            </select>
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logical Name</label>
             <input required value={attrForm.logicalname} onChange={e => setAttrForm({...attrForm, logicalname: e.target.value})} />
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Display Name</label>
             <input required value={attrForm.displayname} onChange={e => setAttrForm({...attrForm, displayname: e.target.value})} />
          </div>
          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Schema Name</label>
             <input required value={attrForm.schemaname} onChange={e => setAttrForm({...attrForm, schemaname: e.target.value})} />
          </div>
          <div className="flex items-center gap-2" style={{ marginTop: '2rem' }}>
             <input type="checkbox" checked={attrForm.isnullable} onChange={e => setAttrForm({...attrForm, isnullable: e.target.checked})} style={{width: 'auto'}} id="nullable_check" />
             <label htmlFor="nullable_check" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Is Nullable</label>
          </div>
          <button type="submit" className="btn btn-primary mt-4" disabled={loading} style={{ gridColumn: '1 / -1' }}>Create Attribute</button>
        </form>
      </div>

    </div>
  );
};

export default SchemaBuilder;
