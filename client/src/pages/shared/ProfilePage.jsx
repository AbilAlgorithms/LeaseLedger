import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { User, Mail, Phone, ShieldCheck, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({ name, phone });
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await authApi.exportUserData();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `leaseledger-export-${user.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Your complete GDPR data archive was downloaded.');
    } catch (err) {
      toast.error('Failed to export data archive');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success('Your account has been deactivated and anonymized.');
      setDeleteModalOpen(false);
      await logout();
    } catch (err) {
      toast.error('Failed to process account deletion');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-headline font-bold text-2xl sm:text-3xl text-primary">User Profile & Settings</h1>
        <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
          Manage your personal details, role affiliations, and statutory privacy data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Summary Card */}
        <div className="md:col-span-1 bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary-container text-brass mx-auto flex items-center justify-center font-bold text-xl font-headline">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-headline font-bold text-base text-primary">{user?.name}</h3>
            <p className="text-xs text-on-surface-variant font-mono">{user?.email}</p>
            <div className="pt-2">
              <Badge variant={user?.role === 'LANDLORD' ? 'landlord' : user?.role === 'TENANT' ? 'tenant' : 'admin'}>
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 space-y-2 text-xs">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Account Status:</span>
              <span className="font-semibold text-verified flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Email Verified:</span>
              <span className="font-semibold text-verified">
                {user?.emailVerified ? 'Yes' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Member Since:</span>
              <span className="font-mono">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form & Privacy Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40 space-y-4">
            <h3 className="font-headline font-bold text-base text-primary">Personal Details</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                value={user?.email || ''}
                disabled
                helperText="Email cannot be changed directly as it is bound to legal inspection records."
              />

              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+61 400 123 456"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdating}
              >
                Save Profile Changes
              </Button>
            </form>
          </div>

          {/* GDPR & Privacy Controls */}
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40 space-y-4">
            <h3 className="font-headline font-bold text-base text-primary">Data Privacy & Statutory Rights</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              In accordance with privacy principles (GDPR / Australian Privacy Principles), you may export your
              entire digital evidence record or deactivate your account. Tenancy inspection records are preserved in
              anonymized form for statutory dispute limitation periods (7 years).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportData}
                isLoading={isExporting}
                icon={Download}
              >
                Download Data Archive (JSON)
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                icon={Trash2}
              >
                Deactivate & Anonymize Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete / Anonymize Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Account Deactivation"
        subtitle="This action anonymizes your personal information"
      >
        <div className="space-y-4 text-xs text-on-surface-variant">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-damage flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              Your name, email, and phone will be permanently redacted. Historical locked inspection evidence will
              remain sealed with anonymized identifiers to satisfy statutory dispute resolution rules.
            </p>
          </div>
          <p>Are you sure you wish to proceed with deactivation?</p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteAccount}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
