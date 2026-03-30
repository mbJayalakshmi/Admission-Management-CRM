import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-56 flex-1 min-h-screen">
        <div className="p-7">{children}</div>
      </main>
    </div>
  );
}
