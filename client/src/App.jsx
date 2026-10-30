import React from 'react';
import { Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <header className="h-16 border-b border-outline-variant/30 bg-surface-container-lowest px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-brass font-bold font-headline">LL</div>
          <span className="font-headline font-bold text-primary tracking-tight text-lg">LeaseLedger</span>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<div className="max-w-xl mx-auto p-8 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-center"><h1 className="text-2xl font-bold font-headline text-primary">LeaseLedger System Ready</h1><p className="mt-2 text-on-surface-variant">Digital Rental Condition & Handover Management System</p></div>} />
        </Routes>
      </main>
    </div>
  );
}
