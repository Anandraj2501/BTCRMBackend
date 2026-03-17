import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EntityList from './pages/EntityList';
import RecordDetail from './pages/RecordDetail';
import ColumnsPage from './pages/ColumnsPage';
import RelationshipsPage from './pages/RelationshipsPage';
import FormsListPage from './pages/FormsListPage';
import FormDesigner from './pages/FormDesigner';
import ViewsListPage from './pages/ViewsListPage';
import ViewDesigner from './pages/ViewDesigner';
import OptionSetsPage from './pages/OptionSetsPage';
import EntitiesPage from './pages/EntitiesPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Administration */}
        <Route path="/admin/entities" element={<EntitiesPage />} />
        <Route path="/admin/optionsets" element={<OptionSetsPage />} />

        {/* Entity Sub-pages */}
        <Route path="/entity/:logicalname/columns" element={<ColumnsPage />} />
        <Route path="/entity/:logicalname/relationships" element={<RelationshipsPage />} />
        
        <Route path="/entity/:logicalname/forms" element={<FormsListPage />} />
        <Route path="/entity/:logicalname/forms/designer" element={<FormDesigner />} />
        
        <Route path="/entity/:logicalname/views" element={<ViewsListPage />} />
        <Route path="/entity/:logicalname/views/designer" element={<ViewDesigner />} />
        
        {/* Record Detail - Must be before Entity List catch-all if path conflicts occur, 
            but here /:logicalname/:id is specific enough */}
        <Route path="/entity/:logicalname/:id" element={<RecordDetail />} />
        
        {/* Default Entity Grid */}
        <Route path="/entity/:logicalname" element={<EntityList />} />
      </Routes>
    </Layout>
  );
}

export default App;
