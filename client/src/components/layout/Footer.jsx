import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-low/50 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary font-headline">LeaseLedger</span>
          <span>·</span>
          <span>Digital Rental Condition & Handover Management System</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[11px]">IEEE 830 / ISO-216 Compliant</span>
          <span>·</span>
          <span className="font-mono text-[11px]">SHA-256 Tamper-Evident</span>
        </div>
      </div>
    </footer>
  );
}
