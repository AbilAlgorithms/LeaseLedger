import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api/admin.api.js';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-brass">
            SYSTEM ADMINISTRATION & COMPLIANCE
          </span>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight mt-1">
            Governance Control Center
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Global ecosystem overview, regulatory compliance, and system-wide audit integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadStats}>
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Governance & Impartiality Warning Banner */}
      <div className="p-4 bg-emerald-950 text-white rounded-lg border-l-4 border-brass shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-brass uppercase font-bold">
            🛡 Statutory Impartiality Protocol:
          </span>
        </div>
        <p className="text-xs text-stone-300 leading-relaxed">
          LeaseLedger operates on a zero-tamper evidentiary model. System Administrators retain full operational oversight (account suspension, system taxonomies, and audit verification), but are architecturally barred from altering condition ratings, deleting inspection plates, or signing off on handovers on behalf of parties.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Platform Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Total Registered Users</span>
          <p className="text-3xl font-serif text-stone-900 mt-2">{stats?.users?.total || 0}</p>
          <div className="mt-2 text-xs text-stone-600 flex gap-2">
            <span>Landlords: <strong>{stats?.users?.landlords || 0}</strong></span>
            <span>·</span>
            <span>Tenants: <strong>{stats?.users?.tenants || 0}</strong></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Properties Ledger</span>
          <p className="text-3xl font-serif text-stone-900 mt-2">{stats?.properties || 0}</p>
          <p className="mt-2 text-xs text-stone-500">Active real-estate units</p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Tenancies Status</span>
          <p className="text-3xl font-serif text-stone-900 mt-2">{stats?.tenancies?.active || 0}</p>
          <p className="mt-2 text-xs text-stone-600">
            Active: <strong>{stats?.tenancies?.active || 0}</strong> · Completed: <strong>{stats?.tenancies?.completed || 0}</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">Sealed Handover Dossiers</span>
          <p className="text-3xl font-serif text-primary mt-2">{stats?.reports || 0}</p>
          <p className="mt-2 text-xs text-emerald-700 font-medium">
            Locked Inspections: {stats?.inspections?.locked || 0}
          </p>
        </div>
      </div>

      {/* Admin Modules Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/users"
          className="group block bg-white p-6 rounded-lg border border-stone-200 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-2xl">👥</span>
            <span className="text-xs font-mono text-stone-400 group-hover:text-primary transition-colors">→</span>
          </div>
          <h3 className="font-serif text-xl text-stone-900 mt-4 group-hover:text-primary transition-colors">
            User Accounts & Security
          </h3>
          <p className="text-stone-600 text-xs mt-2 leading-relaxed">
            Search, inspect user roles, and enforce account suspension or reinstatement for security compliance.
          </p>
        </Link>

        <Link
          to="/admin/config"
          className="group block bg-white p-6 rounded-lg border border-stone-200 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-mono text-stone-400 group-hover:text-primary transition-colors">→</span>
          </div>
          <h3 className="font-serif text-xl text-stone-900 mt-4 group-hover:text-primary transition-colors">
            Global Taxonomies & Scale
          </h3>
          <p className="text-stone-600 text-xs mt-2 leading-relaxed">
            Manage global rating scales, condition level nomenclature, and official inventory item categories.
          </p>
        </Link>

        <Link
          to="/admin/audit"
          className="group block bg-white p-6 rounded-lg border border-stone-200 hover:border-primary transition-all shadow-sm"
        >
          <div className="flex justify-between items-start">
            <span className="text-2xl">📜</span>
            <span className="text-xs font-mono text-stone-400 group-hover:text-primary transition-colors">→</span>
          </div>
          <h3 className="font-serif text-xl text-stone-900 mt-4 group-hover:text-primary transition-colors">
            Evidentiary Audit Logs
          </h3>
          <p className="text-stone-600 text-xs mt-2 leading-relaxed">
            Append-only tamper-evident transaction logs capturing IP addresses, timestamps, and authentication operations.
          </p>
        </Link>
      </div>
    </div>
  );
}
