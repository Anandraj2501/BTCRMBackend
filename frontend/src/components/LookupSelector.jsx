import React, { useState, useEffect } from 'react';
import { X, Search, Link as LinkIcon } from 'lucide-react';
import useApi from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

const LookupSelector = ({ targetEntity, value, displayValue, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [localDisplay, setLocalDisplay] = useState(displayValue || '');
  const { request, loading } = useApi();
  const navigate = useNavigate();

  useEffect(() => { setLocalDisplay(displayValue || ''); }, [displayValue]);

  const handleSearch = async () => {
    if (!targetEntity) return;
    try {
      const data = await request(`/entity/${targetEntity}/search?q=${encodeURIComponent(searchTerm)}`);
      setResults(data || []);
    } catch (e) {
      console.error('Lookup search failed', e);
    }
  };

  useEffect(() => {
    if (isOpen) { handleSearch(); }
  }, [isOpen]);

  const primaryIdKey = `${targetEntity}id`;
  
  const handleSelect = (record) => {
    const id = record[primaryIdKey] || record[Object.keys(record)[0]];
    const name = record.name || record.firstname || record[Object.keys(record)[1]] || id;
    setLocalDisplay(name);
    onChange({ id, name });
    setIsOpen(false);
    setResults([]);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setLocalDisplay('');
    onChange(null);
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    if (value) navigate(`/entity/${targetEntity}/${value}`);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          cursor: 'pointer', minHeight: '44px'
        }}
      >
        {localDisplay ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
            <button onClick={handleNavigate} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', padding:0 }}>
              <LinkIcon size={12} />
            </button>
            {localDisplay}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>{placeholder || `Search ${targetEntity}...`}</span>
        )}
        {localDisplay && (
          <button onClick={handleClear} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:'0 0.25rem' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Modal Dialog */}
      {isOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={() => setIsOpen(false)}>
          <div className="glass-panel" style={{ width:'520px', padding:'1.5rem', maxHeight:'80vh', display:'flex', flexDirection:'column' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h3 style={{ textTransform:'capitalize' }}>Select {targetEntity}</h3>
              <button onClick={() => setIsOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem' }}>
              <input
                type="text"
                placeholder={`Search ${targetEntity}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ flex:1 }}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleSearch}>
                <Search size={16} />
              </button>
            </div>

            <div style={{ overflowY:'auto', flex:1 }}>
              {loading && <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Searching...</div>}
              {!loading && results.length === 0 && (
                <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>No results found. Try a different search.</div>
              )}
              {results.map((record, i) => {
                const id = record[primaryIdKey] || record[Object.keys(record)[0]];
                const name = record.name || record.firstname || record[Object.keys(record)[1]] || id;
                return (
                  <div key={i} onClick={() => handleSelect(record)}
                    style={{ padding:'0.75rem 1rem', cursor:'pointer', borderRadius:'var(--radius)', marginBottom:'0.25rem', transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight:500 }}>{name}</div>
                    <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', fontFamily:'monospace' }}>{id}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupSelector;
