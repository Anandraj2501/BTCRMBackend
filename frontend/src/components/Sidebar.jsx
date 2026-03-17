import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { 
  Users, Briefcase, Database, ChevronDown, ChevronRight, 
  Settings, Layout, Layers, Table, Link as LinkIcon, Eye, Package, Activity
} from 'lucide-react';

const Sidebar = () => {
  console.log('Sidebar Component Rendering - v3');
  const [entities, setEntities] = useState([]);
  const [expanded, setExpanded] = useState({});
  const { request } = useApi();
  const location = useLocation();

  useEffect(() => {
    request('/metadata/entity')
      .then(data => {
        console.log('Sidebar entities data received:', data);
        const entityList = Array.isArray(data) ? data : (data?.data || []);
        setEntities(entityList);
      })
      .catch(err => {
        console.error('Sidebar API Error:', err);
      });
  }, []);

  const toggleExpand = (logicalName) => {
    setExpanded(prev => ({ ...prev, [logicalName]: !prev[logicalName] }));
  };

  const adminItems = [
    { label: 'Dashboard', icon: <Activity size={18} />, path: '/dashboard' },
    { label: 'Entities', icon: <Database size={18} />, path: '/admin/entities' },
    { label: 'Option Sets', icon: <Package size={18} />, path: '/admin/optionsets' },
  ];

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div className="sidebar-header" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Mini<span style={{ color: 'var(--accent)' }}>CRM</span>
        </h1>
      </div>

      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.5rem', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>
        Administration
      </div>
      {adminItems.map(item => (
        <NavLink key={item.path} to={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {item.icon} {item.label}
        </NavLink>
      ))}

      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '0 0.5rem', marginTop: '1rem', marginBottom: '0.25rem', letterSpacing: '0.05em' }}>
        Entities Explorer
      </div>
      
      {Array.isArray(entities) && entities.map(entity => {
        if (!entity || !entity.logicalname) return null;
        const isExpanded = expanded[entity.logicalname];
        const isActive = location.pathname.startsWith(`/entity/${entity.logicalname}`);
        
        return (
          <div key={entity.logicalname} style={{ marginBottom: '0.25rem' }}>
            <div 
              onClick={() => toggleExpand(entity.logicalname)}
              className={`nav-item ${isActive && !isExpanded ? 'active' : ''}`}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Layers size={18} />
                <span style={{ textTransform: 'capitalize' }}>{entity.displayname}</span>
              </div>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {isExpanded && (
              <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem', marginTop: '0.25rem' }}>
                <NavLink to={`/entity/${entity.logicalname}`} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                   <Table size={14} /> Records
                </NavLink>
                <NavLink to={`/entity/${entity.logicalname}/columns`} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                   <Layers size={14} /> Columns
                </NavLink>
                <NavLink to={`/entity/${entity.logicalname}/relationships`} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                   <LinkIcon size={14} /> Relationships
                </NavLink>
                <NavLink to={`/entity/${entity.logicalname}/forms`} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                   <Layout size={14} /> Forms
                </NavLink>
                <NavLink to={`/entity/${entity.logicalname}/views`} className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}>
                   <Eye size={14} /> Views
                </NavLink>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Sidebar;
