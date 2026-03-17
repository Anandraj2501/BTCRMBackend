import React, { useState, useEffect } from 'react';
import useApi from '../hooks/useApi';
import { 
  Users, Briefcase, Layers, Database, 
  Activity, Clock, ChevronRight, TrendingUp, Plus 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { request, loading } = useApi();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        request('/dashboard/stats')
            .then(res => {
                if (res.success) setStats(res.data);
            })
            .catch(err => console.error('Dashboard Stats Error:', err));
    }, []);

    const kpiCards = [
        { label: 'Contacts', count: stats?.counts?.contacts || 0, icon: <Users size={24} />, color: '#6366f1', link: '/entity/contact' },
        { label: 'Organizations', count: stats?.counts?.organizations || 0, icon: <Briefcase size={24} />, color: '#10b981', link: '/entity/organization' },
        { label: 'Projects', count: stats?.counts?.projects || 0, icon: <Layers size={24} />, color: '#f59e0b', link: '/entity/project' },
        { label: 'Total Entities', count: stats?.counts?.users || 0, icon: <Database size={24} />, color: '#ec4899', link: '/admin/entities' },
    ];

    return (
        <div className="content-area">
            {/* Header section */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
                    Welcome back, <span className="text-accent">Admin</span>
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Here's what's happening across your CRM today.
                </p>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {kpiCards.map((card, i) => (
                    <Link key={i} to={card.link} className="glass-panel" style={{ padding: '1.5rem', textDecoration: 'none', transition: 'transform 0.2s', display: 'block' }} 
                          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${card.color}15`, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {card.icon}
                            </div>
                            <TrendingUp size={16} style={{ color: '#10b981', opacity: 0.7 }} title="Up trend" />
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>{card.label}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                            {loading ? <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : card.count}
                        </div>
                    </Link>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                {/* Recent Activity */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Activity size={20} className="text-accent" /> Recent Activity
                        </h3>
                        <Link to="#" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>}
                        {!loading && stats?.recentActivity?.map((act, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Clock size={16} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        New <span style={{ textTransform: 'capitalize', color: 'var(--accent)' }}>{act.logicalname}</span> created
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(act.createdon).toLocaleString()}
                                    </div>
                                </div>
                                <Link to={`/entity/${act.logicalname}/${act.baseentityid}`} style={{ color: 'var(--text-muted)' }}>
                                    <ChevronRight size={18} />
                                </Link>
                            </div>
                        ))}
                        {!loading && (!stats?.recentActivity || stats.recentActivity.length === 0) && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No recent activity found.</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions / Future Component */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <Link to="/entity/contact?new=true" className="btn btn-ghost" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}>
                            <Plus size={16} /> Add New Contact
                        </Link>
                        <Link to="/admin/entities" className="btn btn-ghost" style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.75rem' }}>
                            <Database size={16} /> Manage Entities
                        </Link>
                        <div style={{ marginTop: '1rem', padding: '1.25rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed rgba(99, 102, 241, 0.2)', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Charts and visualizations coming soon in Phase 2!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
