import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuditLogs } from '../../api/admin.api.js';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Input from '../../components/ui/Input.jsx';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 25 };
      if (actionFilter) params.action = actionFilter;

      const res = await getAuditLogs(params);
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action) => {
    const isSecurity = /SUSPEND|REINSTATE|DELETE|REVOKE/i.test(action);
    const isComplete = /LOCKED|COMPLETED|GENERATED|SEALED/i.test(action);

    if (isSecurity) {
      return (
        <span className="font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          {action}
        </span>
      );
    }
    if (isComplete) {
      return (
        <span className="font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {action}
        </span>
      );
    }
    return (
      <span className="font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-stone-100 text-stone-800 border border-stone-200">
        {action}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">Audit Ledger</span>
          </nav>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">
            Append-Only Evidentiary Audit Trail
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Cryptographic ledger tracking authentication, condition updates, locking actions, and security operations.
          </p>
        </div>

        <Link to="/admin">
          <Button variant="outline">← Admin Overview</Button>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs uppercase font-semibold text-stone-500">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs font-mono bg-white border border-stone-300 rounded px-3 py-2 text-stone-700"
          >
            <option value="">All Actions</option>
            <option value="USER_REGISTERED">USER_REGISTERED</option>
            <option value="USER_SUSPENDED">USER_SUSPENDED</option>
            <option value="USER_REINSTATED">USER_REINSTATED</option>
            <option value="INSPECTION_LOCKED">INSPECTION_LOCKED</option>
            <option value="COMPARISON_GENERATED">COMPARISON_GENERATED</option>
            <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            <option value="CONFIG_UPDATED">CONFIG_UPDATED</option>
          </select>
        </div>

        <Button variant="outline" className="text-xs" onClick={() => fetchLogs(pagination.page)}>
          Refresh Log Feed
        </Button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            No audit records found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-stone-700">
                {logs.map((log) => (
                  <tr key={log._id || log.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.user ? (
                        <div>
                          <div className="font-sans font-medium text-stone-900">{log.user.name}</div>
                          <div className="text-[10px] text-stone-400">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic font-sans">System Process</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-stone-600 whitespace-nowrap">
                      {log.entity?.model} ({log.entity?.id?.toString().slice(-6)})
                    </td>
                    <td className="py-3 px-4 text-[11px] text-stone-500 whitespace-nowrap">
                      {log.ip || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-stone-500 max-w-xs truncate">
                      {log.meta ? JSON.stringify(log.meta) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs text-stone-600">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} audit entries)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
