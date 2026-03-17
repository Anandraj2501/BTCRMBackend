import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar justify-between">
          <div className="flex items-center gap-4">
               {/* Context aware header could go here */}
          </div>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as System Admin</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              SA
            </div>
          </div>
        </header>
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
