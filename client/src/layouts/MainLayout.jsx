import React from 'react';
import Sidebar from '../components/Sidebar';

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar with independent 100vh height & hidden internal scrollbar */}
      <Sidebar />

      {/* Main Page Area with independent 100vh scrolling & hidden scrollbar */}
      <main className="flex-1 h-screen overflow-y-auto no-scrollbar min-w-0 bg-slate-50 dark:bg-slate-900">
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
