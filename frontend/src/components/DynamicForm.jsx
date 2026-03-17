import React, { useState, useEffect } from 'react';
import useApi from '../hooks/useApi';
import LookupSelector from './LookupSelector';

const DynamicForm = ({ entityLogicalName, attributes = [], lookups = [], selectedForm, onSuccess, onCancel }) => {
  const { request, loading, error } = useApi();
  const [formData, setFormData] = useState({});
  const [lookupDisplays, setLookupDisplays] = useState({});
  const [optionSetsCache, setOptionSetsCache] = useState({});
  const [validationErrors, setValidationErrors] = useState({});

  const systemColumns = ['baseentityid', 'statecode', 'statuscode', 'ownerid', `${entityLogicalName}id`];

  // Determine which attributes to show: from form definition or all attributes
  let formAttributes = attributes.filter(attr => !systemColumns.includes(attr.logicalname));
  if (selectedForm?.definition) {
    const formFields = selectedForm.definition.tabs
      ?.flatMap(t => t.sections?.flatMap(s => s.fields || []) || [])
      .map(f => (typeof f === 'string' ? f : f.logicalname))
      .filter(Boolean) || [];
    if (formFields.length > 0) {
      formAttributes = attributes.filter(a => formFields.includes(a.logicalname) && !systemColumns.includes(a.logicalname));
    }
  }

  // Pre-load option sets for PickList/OptionSet attributes
  useEffect(() => {
    const picklistAttrs = formAttributes.filter(a => a.attributetype === 'Picklist' || a.attributetype === 'OptionSet');
    picklistAttrs.forEach(async (attr) => {
      if (attr.optionsetid && !optionSetsCache[attr.optionsetid]) {
        try {
          const os = await request(`/metadata/optionset/${attr.optionsetid}`);
          if (os) {
            setOptionSetsCache(c => ({ ...c, [attr.optionsetid]: os.options || [] }));
          }
        } catch { /* ignore */ }
      }
    });
  }, [formAttributes.length]);

  const handleInputChange = (logicalname, value) => {
    setFormData(prev => ({ ...prev, [logicalname]: value }));
  };

  const handleLookupChange = (logicalname, val) => {
    setFormData(prev => ({ ...prev, [logicalname]: val ? val.id : null }));
    if (val) setLookupDisplays(d => ({ ...d, [logicalname]: val.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate Required fields
    const errors = {};
    formAttributes.forEach(attr => {
      if (attr.requirementlevel === 'Required' || attr.requirementlevel === 'BusinessRequired') {
        const val = formData[attr.logicalname];
        const isEmpty = val === undefined || val === null || val === '';
        if (isEmpty && attr.requirementlevel === 'Required') {
          errors[attr.logicalname] = 'This field is required.';
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    
    try {
      await request(`/entity/${entityLogicalName}`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  const getLookupTarget = (attr) => {
    const lk = lookups.find(l => l.attributeid === attr.attributeid);
    return lk?.referencedentityname;
  };

  const renderInput = (attr) => {
    const commonStyle = {
      width: '100%', padding: '0.7rem 0.9rem', background: 'rgba(15,23,42,0.7)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white',
      fontSize: '0.9rem', fontFamily: 'inherit', transition: 'border-color 0.15s',
    };

    // OptionSet / Picklist → render <select>
    if (attr.attributetype === 'Picklist' || attr.attributetype === 'OptionSet') {
      const options = attr.optionsetid ? (optionSetsCache[attr.optionsetid] || []) : [];
      return (
        <select
          style={commonStyle}
          value={formData[attr.logicalname] ?? ''}
          onChange={e => handleInputChange(attr.logicalname, e.target.value === '' ? null : parseInt(e.target.value))}
        >
          <option value="">-- Select --</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {options.length === 0 && <option disabled>Loading options...</option>}
        </select>
      );
    }

    // Lookup
    const isLookup = attr.attributetype === 'Lookup' || attr.attributetype === 'Uniqueidentifier';
    const lookupTarget = isLookup ? getLookupTarget(attr) : null;
    if (isLookup && lookupTarget) {
      return (
        <LookupSelector
          targetEntity={lookupTarget}
          value={formData[attr.logicalname]}
          displayValue={lookupDisplays[attr.logicalname]}
          onChange={(v) => handleLookupChange(attr.logicalname, v)}
        />
      );
    }

    // Boolean
    if (attr.attributetype === 'Boolean') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!formData[attr.logicalname]}
            onChange={e => handleInputChange(attr.logicalname, e.target.checked)}
            style={{ width: '1.3rem', height: '1.3rem', accentColor: '#6366f1' }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{attr.displayname}</span>
        </label>
      );
    }

    const value = formData[attr.logicalname] ?? '';
    const onChange = e => handleInputChange(attr.logicalname, e.target.value);

    switch (attr.attributetype) {
      case 'Integer':   return <input type="number" style={commonStyle} value={value} onChange={onChange} />;
      case 'Decimal':   return <input type="number" step="0.0001" style={commonStyle} value={value} onChange={onChange} />;
      case 'DateTime':  return <input type="datetime-local" style={commonStyle} value={value} onChange={onChange} />;
      case 'Memo':      return <textarea style={{ ...commonStyle, minHeight: 90, resize: 'vertical' }} value={value} onChange={onChange} />;
      default:          return <input type="text" style={commonStyle} value={value} onChange={onChange} />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="glass-panel" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, textTransform: 'capitalize' }}>New {entityLogicalName}</h3>
            {selectedForm && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Using form: <span style={{ color: '#a5b4fc' }}>{selectedForm.formname}</span>
              </span>
            )}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#fca5a5', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {formAttributes.length === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10 }}>
              No fields found. Add columns to this entity first.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {formAttributes.map(attr => {
              const isRequired = attr.requirementlevel === 'Required';
              const isBizRequired = attr.requirementlevel === 'BusinessRequired';
              const hasError = validationErrors[attr.logicalname];
              
              return (
                <div key={attr.logicalname}>
                  {attr.attributetype !== 'Boolean' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {attr.displayname}
                      {isRequired && (
                        <span title="Required" style={{ color: '#f87171', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>*</span>
                      )}
                      {isBizRequired && (
                        <span title="Business Required" style={{ color: '#818cf8', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1 }}>+</span>
                      )}
                    </label>
                  )}
                  <div style={{ position: 'relative' }}>
                    {renderInput(attr)}
                    {hasError && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>⚠</span> {hasError}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || formAttributes.length === 0} style={{ minWidth: 120 }}>
              {loading ? 'Saving...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DynamicForm;
