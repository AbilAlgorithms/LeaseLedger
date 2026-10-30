import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenancyApi } from '../../api/tenancy.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Badge, { DualVerificationBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import {
  Building,
  UserCheck,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  GitCompare,
  ArrowRight,
  Copy,
  Check,
  Plus,
  ArrowLeft,
  Share2,
  Clock,
  Shield,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenancyDetailPage() {
  const { id } = useParams();
  const { user, isLandlord } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  const { data: tenancy, isLoading, error } = useQuery({
    queryKey: ['tenancy', id],
    queryFn: async () => {
      const res = await tenancyApi.getTenancy(id);
      return res.data.data;
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: (email) => tenancyApi.createInvitation(id, { email }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['tenancy', id]);
      toast.success('New invitation link created');
      setInviteModalOpen(false);
      setInviteEmail('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create invitation');
    },
  });

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(true);
    toast.success('Invitation link copied');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !tenancy) {
    return (
      <div className="max-w-md mx-auto my-12 text-center space-y-4">
        <h2 className="text-xl font-bold font-headline text-primary">Tenancy Not Accessible</h2>
        <p className="text-xs text-on-surface-variant">
          You are not an authorized participant in this tenancy record.
        </p>
        <Link to="/dashboard">
          <Button variant="primary" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const moveInInspection = tenancy.inspections?.find((i) => i.type === 'MOVE_IN');
  const moveOutInspection = tenancy.inspections?.find((i) => i.type === 'MOVE_OUT');

  const moveInLocked = moveInInspection?.status === 'LOCKED';
  const moveOutLocked = moveOutInspection?.status === 'LOCKED';

  const moveInConfirmedLandlord = moveInInspection?.confirmations?.some(
    (c) => c.user?.toString() === tenancy.landlord?._id?.toString()
  );
  const moveInConfirmedTenant = moveInInspection?.confirmations?.some((c) =>
    tenancy.tenants?.some((t) => t._id?.toString() === c.user?.toString())
  );

  const moveOutConfirmedLandlord = moveOutInspection?.confirmations?.some(
    (c) => c.user?.toString() === tenancy.landlord?._id?.toString()
  );
  const moveOutConfirmedTenant = moveOutInspection?.confirmations?.some((c) =>
    tenancy.tenants?.some((t) => t._id?.toString() === c.user?.toString())
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">Tenancy Lifecycle:</span>
          <Badge
            variant={
              tenancy.status === 'ACTIVE'
                ? 'verified'
                : tenancy.status === 'COMPLETED'
                ? 'brass'
                : 'pending'
            }
          >
            {tenancy.status}
          </Badge>
        </div>
      </div>

      {/* Tenancy Overview Dossier Header */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-outline-variant/30 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-mono text-[10px] uppercase">
                {tenancy.property?.type || 'APARTMENT'}
              </span>
              <span className="text-xs font-mono text-outline">
                Ref: #LL-{tenancy.id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-primary">
              {tenancy.property?.address}
            </h1>
            <p className="text-xs text-on-surface-variant font-mono flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-brass" />
              <span>
                Term: {new Date(tenancy.startDate).toLocaleDateString()} –{' '}
                {new Date(tenancy.endDate).toLocaleDateString()}
              </span>
            </p>
          </div>

          {/* Quick Action Button for Comparison/Report if completed */}
          {tenancy.comparison && (
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/tenancies/${tenancy.id}/comparison`}>
                <Button variant="primary" size="sm" icon={GitCompare}>
                  View Comparison
                </Button>
              </Link>
              <Link to={`/tenancies/${tenancy.id}/report`}>
                <Button variant="brass" size="sm" icon={Download}>
                  PDF Dossier
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Parties Matrix: Landlord & Tenants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Landlord Card */}
          <div className="p-4 bg-surface-container-low rounded border border-outline-variant/30 flex items-start gap-3">
            <span className="px-2 py-1 bg-primary text-on-primary rounded font-mono font-bold text-xs">
              LL
            </span>
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                Landlord / Owner
              </span>
              <h4 className="font-headline font-bold text-sm text-primary">
                {tenancy.landlord?.name}
              </h4>
              <p className="text-xs text-on-surface-variant font-mono">{tenancy.landlord?.email}</p>
            </div>
          </div>

          {/* Tenants Card */}
          <div className="p-4 bg-surface-container-low rounded border border-outline-variant/30 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 bg-secondary-container text-on-secondary-container rounded font-mono font-bold text-xs">
                TN
              </span>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                  Tenant(s) of Record
                </span>
                {!tenancy.tenants || tenancy.tenants.length === 0 ? (
                  <p className="text-xs text-pending font-medium">Awaiting Tenant Acceptance</p>
                ) : (
                  tenancy.tenants.map((t) => (
                    <div key={t.id || t._id}>
                      <h4 className="font-headline font-bold text-sm text-primary">{t.name}</h4>
                      <p className="text-xs text-on-surface-variant font-mono">{t.email}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {isLandlord && (!tenancy.tenants || tenancy.tenants.length === 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInviteModalOpen(true)}
                icon={Plus}
              >
                Invite Tenant
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invitations Drawer (for Landlord if pending) */}
      {isLandlord && tenancy.invitations?.length > 0 && (!tenancy.tenants || tenancy.tenants.length === 0) && (
        <div className="p-5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-pending font-mono uppercase">
              <Clock className="w-4 h-4" />
              <span>Pending Tenant Invitation</span>
            </div>
            <span className="text-[11px] text-on-surface-variant font-mono">
              Expires {new Date(tenancy.invitations[0].expiresAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/join/${tenancy.invitations[0].tokenHash}`}
              className="flex-1 px-3 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded font-mono select-all text-on-surface"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyUrl(`${window.location.origin}/join/${tenancy.invitations[0].tokenHash}`)}
              icon={copiedToken ? Check : Copy}
            >
              {copiedToken ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {/* Primary Tenancy Timeline Track */}
      <div className="space-y-4">
        <h2 className="font-headline font-bold text-xl text-primary">Evidentiary Handover Timeline</h2>

        <div className="space-y-4">
          {/* Timeline Step 1: Onboarding & Linking */}
          <div className="p-5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-verified flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-base text-primary">
                  1. Tenancy Agreement & Invitation
                </h3>
                <Badge variant={tenancy.tenants?.length > 0 ? 'verified' : 'pending'}>
                  {tenancy.tenants?.length > 0 ? 'Tenant Joined' : 'Invitation Issued'}
                </Badge>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Property terms established and participant access tokens authenticated.
              </p>
            </div>
          </div>

          {/* Timeline Step 2: Move-In Inspection */}
          <div
            className={`p-6 rounded-lg border transition-all ${
              moveInLocked
                ? 'bg-surface-container-lowest border-emerald-300'
                : 'bg-surface-container-lowest border-outline-variant/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    moveInLocked
                      ? 'bg-emerald-100 text-verified'
                      : 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {moveInLocked ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-primary">
                      2. Move-In Baseline Inspection
                    </h3>
                    <Badge
                      variant={
                        moveInLocked
                          ? 'verified'
                          : moveInInspection?.status === 'IN_REVIEW'
                          ? 'pending'
                          : 'default'
                      }
                    >
                      {moveInInspection ? moveInInspection.status : 'NOT STARTED'}
                    </Badge>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {moveInLocked
                      ? `Sealed & immutable at ${new Date(moveInInspection.lockedAt).toLocaleString()}`
                      : 'Joint room walk-through, condition ratings, photographic plates & meter readings.'}
                  </p>
                  {moveInInspection && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-on-surface-variant text-[11px]">Sign-off status:</span>
                      <DualVerificationBadge
                        landlordConfirmed={moveInConfirmedLandlord}
                        tenantConfirmed={moveInConfirmedTenant}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Link
                  to={
                    moveInLocked
                      ? `/tenancies/${tenancy.id}/inspections/move-in/review`
                      : `/tenancies/${tenancy.id}/inspections/move-in`
                  }
                >
                  <Button
                    variant={moveInLocked ? 'secondary' : 'primary'}
                    size="sm"
                    icon={ArrowRight}
                  >
                    {moveInLocked
                      ? 'View Sealed Baseline'
                      : moveInInspection?.status === 'IN_REVIEW'
                      ? 'Review & Confirm'
                      : moveInInspection
                      ? 'Resume Inspection'
                      : 'Start Move-In Inspection'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Timeline Step 3: Mid-Tenancy Maintenance */}
          <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-bold text-base text-primary">
                    3. Mid-Tenancy Incident Log
                  </h3>
                  <Badge variant="default" size="sm">
                    {tenancy.issues?.length || 0} Reported
                  </Badge>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Log repairs, appliance failures, or accidental damages occurring during the tenancy term.
                </p>
              </div>
            </div>

            <div>
              <Link to={`/tenancies/${tenancy.id}/issues`}>
                <Button variant="secondary" size="sm" icon={ArrowRight}>
                  View Incident Log
                </Button>
              </Link>
            </div>
          </div>

          {/* Timeline Step 4: Move-Out Inspection */}
          <div
            className={`p-6 rounded-lg border transition-all ${
              !moveInLocked
                ? 'bg-surface-container-low/40 border-outline-variant/20 opacity-70'
                : moveOutLocked
                ? 'bg-surface-container-lowest border-emerald-300'
                : 'bg-surface-container-lowest border-outline-variant/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    moveOutLocked
                      ? 'bg-emerald-100 text-verified'
                      : 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  {moveOutLocked ? <Lock className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-primary">
                      4. Move-Out Exit Inspection
                    </h3>
                    <Badge
                      variant={
                        moveOutLocked
                          ? 'verified'
                          : moveOutInspection?.status === 'IN_REVIEW'
                          ? 'pending'
                          : 'default'
                      }
                    >
                      {moveOutInspection ? moveOutInspection.status : 'PENDING EXIT'}
                    </Badge>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {!moveInLocked
                      ? 'Locked until the Move-In baseline inspection is confirmed and sealed by both parties.'
                      : moveOutLocked
                      ? `Sealed at ${new Date(moveOutInspection.lockedAt).toLocaleString()}`
                      : 'Evaluates items side-by-side against Move-In baseline photos and readings.'}
                  </p>
                  {moveOutInspection && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-on-surface-variant text-[11px]">Sign-off status:</span>
                      <DualVerificationBadge
                        landlordConfirmed={moveOutConfirmedLandlord}
                        tenantConfirmed={moveOutConfirmedTenant}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Link
                  to={
                    moveOutLocked
                      ? `/tenancies/${tenancy.id}/inspections/move-out/review`
                      : `/tenancies/${tenancy.id}/inspections/move-out`
                  }
                >
                  <Button
                    variant={moveOutLocked ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={!moveInLocked}
                    icon={ArrowRight}
                  >
                    {moveOutLocked
                      ? 'View Exit Records'
                      : moveOutInspection?.status === 'IN_REVIEW'
                      ? 'Review & Confirm'
                      : moveOutInspection
                      ? 'Resume Inspection'
                      : 'Start Move-Out Inspection'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Timeline Step 5: Automated Comparison & Report */}
          <div
            className={`p-6 rounded-lg border transition-all ${
              !moveOutLocked
                ? 'bg-surface-container-low/40 border-outline-variant/20 opacity-70'
                : 'bg-surface-container-lowest border-brass shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-brass text-white flex items-center justify-center shrink-0 mt-0.5">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-primary">
                      5. Comparison Engine & Final Report
                    </h3>
                    {tenancy.comparison && <Badge variant="brass">Comparison Ready</Badge>}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {tenancy.comparison?.summary
                      ? tenancy.comparison.summary
                      : 'Automated differential algorithm runs automatically upon move-out confirmation.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link to={`/tenancies/${tenancy.id}/comparison`}>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!moveOutLocked}
                    icon={GitCompare}
                  >
                    View Diff
                  </Button>
                </Link>
                <Link to={`/tenancies/${tenancy.id}/report`}>
                  <Button
                    variant="brass"
                    size="sm"
                    disabled={!moveOutLocked}
                    icon={Download}
                  >
                    Certified PDF
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Additional Tenant"
        subtitle="Generates a single-use secure link valid for 7 days"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createInviteMutation.mutate(inviteEmail);
          }}
          className="space-y-4"
        >
          <Input
            label="Tenant Email Address"
            type="email"
            placeholder="e.g. co-tenant@leaseledger.test"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createInviteMutation.isPending}
            >
              Generate Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
