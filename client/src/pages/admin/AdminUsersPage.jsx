import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsers, suspendUser, reinstateUser } from '../../api/admin.api.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'suspend' | 'reinstate'
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers(1);
  }, [role, status]);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (role) params.role = role;
      if (status) params.status = status;

      const res = await getUsers(params);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleConfirmAction = async () => {
    if (!targetUser) return;
    setProcessing(true);
    try {
      if (actionType === 'suspend') {
        await suspendUser(targetUser.id || targetUser._id);
      } else {
        await reinstateUser(targetUser.id || targetUser._id);
      }
      setTargetUser(null);
      setActionType(null);
      fetchUsers(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${actionType} user`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">User Directory</span>
          </nav>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">
            User Accounts & Enforcement
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Manage authenticated actors, view verification state, and apply compliance suspensions.
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
          <Button type="submit" variant="secondary" className="text-xs">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="text-xs bg-white border border-stone-300 rounded px-3 py-2 text-stone-700"
          >
            <option value="">All Roles</option>
            <option value="LANDLORD">Landlords</option>
            <option value="TENANT">Tenants</option>
            <option value="ADMIN">Admins</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-xs bg-white border border-stone-300 rounded px-3 py-2 text-stone-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <Spinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-stone-500 text-sm">
            No users match the specified search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Email Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {users.map((u) => (
                  <tr key={u.id || u._id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">{u.name}</div>
                      <div className="text-stone-500 font-mono text-[11px]">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.emailVerified ? (
                        <span className="text-emerald-700 font-medium">✓ Verified</span>
                      ) : (
                        <span className="text-amber-600">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-500 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'ADMIN' && (
                        u.isActive ? (
                          <Button
                            variant="outline"
                            className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                            onClick={() => {
                              setTargetUser(u);
                              setActionType('suspend');
                            }}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            onClick={() => {
                              setTargetUser(u);
                              setActionType('reinstate');
                            }}
                          >
                            Reinstate
                          </Button>
                        )
                      )}
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
              Page {pagination.page} of {pagination.pages} ({pagination.total} total users)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchUsers(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {targetUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setTargetUser(null);
            setActionType(null);
          }}
          title={actionType === 'suspend' ? 'Confirm User Suspension' : 'Confirm User Reinstatement'}
        >
          <div className="space-y-4 text-sm">
            <p className="text-stone-700">
              Are you sure you want to <strong>{actionType}</strong> account{' '}
              <span className="font-mono font-semibold">{targetUser.email}</span>?
            </p>
            {actionType === 'suspend' && (
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded border border-rose-200">
                Suspending this user will immediately revoke API access and invalidate future login attempts until reinstated.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTargetUser(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className={actionType === 'suspend' ? 'bg-rose-700 hover:bg-rose-800' : ''}
                onClick={handleConfirmAction}
                disabled={processing}
              >
                {processing ? <Spinner size="sm" /> : `Confirm ${actionType}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
