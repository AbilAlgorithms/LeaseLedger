import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inspectionApi } from '../../api/inspection.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Badge, { DualVerificationBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  FileCheck,
  Maximize2,
  Edit,
  GitCompare,
  Download,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InspectionReviewPage() {
  const { id: tenancyId, type } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const inspectionType = type.toUpperCase().replace('-', '_');

  const [disputeModalRecord, setDisputeModalRecord] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [amendTargetId, setAmendTargetId] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendNote, setAmendNote] = useState('');

  // Fetch or initialize inspection
  const { data: inspectionInit } = useQuery({
    queryKey: ['inspection-init', tenancyId, inspectionType],
    queryFn: async () => {
      const res = await inspectionApi.createOrGetInspection(tenancyId, inspectionType);
      return res.data.data;
    },
  });

  const inspectionId = inspectionInit?.id || inspectionInit?._id;

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const res = await inspectionApi.getInspection(inspectionId);
      return res.data.data;
    },
    enabled: !!inspectionId,
  });

  const confirmMutation = useMutation({
    mutationFn: () => inspectionApi.confirmInspection(inspectionId),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
      queryClient.invalidateQueries(['tenancy', tenancyId]);
      if (res.data.locked) {
        toast.success('Inspection mutually confirmed and permanently locked!');
      } else {
        toast.success('Your digital confirmation has been registered.');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to register confirmation');
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ itemId, reason }) =>
      inspectionApi.disputeRecord(inspectionId, itemId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
      toast.error('Dispute registered. Inspection returned to Draft.');
      setDisputeModalRecord(null);
      setDisputeReason('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit dispute');
    },
  });

  const amendmentMutation = useMutation({
    mutationFn: (data) => inspectionApi.createAmendment(inspectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
      toast.success('Post-lock amendment recorded in audit log');
      setAmendmentModalOpen(false);
      setAmendReason('');
      setAmendNote('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to record amendment');
    },
  });

  if (isLoading || !inspection) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isLocked = inspection.status === 'LOCKED';
  const tenancy = inspection.tenancy;

  const landlordConfirmed = inspection.confirmations?.some(
    (c) => c.user?.toString() === tenancy.landlord?._id?.toString()
  );
  const tenantConfirmed = inspection.confirmations?.some((c) =>
    tenancy.tenants?.some((t) => t._id?.toString() === c.user?.toString())
  );

  const currentUserAlreadyConfirmed = inspection.confirmations?.some(
    (c) => c.user?.toString() === user.id?.toString()
  );

  const handleDisputeSubmit = (e) => {
    e.preventDefault();
    if (!disputeReason.trim() || !disputeModalRecord) return;
    disputeMutation.mutate({
      itemId: disputeModalRecord.item?._id || disputeModalRecord.item,
      reason: disputeReason.trim(),
    });
  };

  const handleAmendmentSubmit = (e) => {
    e.preventDefault();
    if (!amendReason.trim() || !amendTargetId) return;

    const targetRecord = inspection.records?.find((r) => r.id === amendTargetId || r._id === amendTargetId);

    amendmentMutation.mutate({
      reason: amendReason.trim(),
      target: { model: 'ConditionRecord', id: amendTargetId },
      before: { notes: targetRecord?.notes || '' },
      after: { notes: amendNote.trim() },
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div className="space-y-1">
          <Link
            to={`/tenancies/${tenancyId}`}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Tenancy Timeline</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl text-primary">
              {inspectionType === 'MOVE_IN' ? 'Move-In Condition Review' : 'Move-Out Exit Review'}
            </h1>
            <Badge variant={isLocked ? 'verified' : 'pending'}>
              {inspection.status}
            </Badge>
          </div>
          <p className="text-xs text-on-surface-variant font-mono">
            {tenancy.property?.address}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isLocked && (
            <Link to={`/tenancies/${tenancyId}/inspections/${type}`}>
              <Button variant="secondary" size="sm">
                Edit in Wizard
              </Button>
            </Link>
          )}

          {isLocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAmendmentModalOpen(true)}
              icon={Edit}
            >
              Add Post-Lock Amendment
            </Button>
          )}
        </div>
      </div>

      {/* Sealed Lock Banner or Dual Confirmation Command Bar */}
      {isLocked ? (
        <div className="p-6 bg-surface-container-lowest rounded-lg border border-emerald-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-verified font-bold text-lg font-headline">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>Inspection Permanently Sealed & Immutable</span>
            </div>
            <span className="font-mono text-xs text-on-surface-variant">
              Locked on: {new Date(inspection.lockedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Both parties have digitally confirmed this handover record. By statutory rule, in-place edits are
            prohibited. Any corrections are appended below as verified amendments.
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs">
            <span className="text-on-surface-variant">Mutual Sign-off Trail:</span>
            <DualVerificationBadge
              landlordConfirmed={landlordConfirmed}
              tenantConfirmed={tenantConfirmed}
            />
          </div>
        </div>
      ) : (
        <div className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-headline font-bold text-base text-primary">
                Digital Confirmation & Sign-Off Matrix
              </h3>
              <p className="text-xs text-on-surface-variant">
                Mutual dual-party confirmation is required to lock this inspection into an immutable legal record.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <DualVerificationBadge
                landlordConfirmed={landlordConfirmed}
                tenantConfirmed={tenantConfirmed}
              />
              <Button
                variant="primary"
                size="md"
                disabled={currentUserAlreadyConfirmed}
                isLoading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                icon={CheckCircle2}
              >
                {currentUserAlreadyConfirmed ? 'You Have Confirmed' : 'Digital Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Matrix Table */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-hidden shadow-sm space-y-0">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <h3 className="font-headline font-bold text-base text-primary">
            Asset Condition & Evidentiary Matrix
          </h3>
          <span className="text-xs text-on-surface-variant font-mono">
            {inspection.records?.length || 0} Assets Evaluated
          </span>
        </div>

        <div className="divide-y divide-outline-variant/20">
          {inspection.records?.map((record) => (
            <div key={record.id || record._id} className="p-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-headline font-bold text-base text-primary">
                      {record.itemName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container font-mono text-[10px] text-on-surface-variant">
                      {record.roomName}
                    </span>
                    {record.disputed && <Badge variant="disputed">Disputed</Badge>}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {record.notes ? `"${record.notes}"` : <span className="italic text-outline">No specific notes recorded</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] font-mono uppercase text-outline">
                      Condition
                    </span>
                    <Badge
                      variant={
                        record.rating >= 4
                          ? 'verified'
                          : record.rating === 3
                          ? 'pending'
                          : 'disputed'
                      }
                    >
                      {record.rating} / 5 · {record.ratingLabel}
                    </Badge>
                  </div>

                  {!isLocked && !record.disputed && (
                    <button
                      type="button"
                      onClick={() => setDisputeModalRecord(record)}
                      className="px-2 py-1 text-xs text-damage hover:bg-rose-50 rounded border border-rose-200 transition-colors font-semibold"
                    >
                      Dispute
                    </button>
                  )}
                </div>
              </div>

              {/* Photos Gallery */}
              {record.photos?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {record.photos.map((p) => (
                    <div
                      key={p.id || p._id}
                      className="relative rounded border border-outline-variant/30 overflow-hidden w-20 h-16 bg-surface-container"
                    >
                      <img
                        src={p.fileUrl}
                        alt="Evidence plate"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-white font-mono text-[8px] text-center truncate px-0.5">
                        SHA:{p.sha256?.slice(0, 6)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Utility Meters Table */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30">
          <h3 className="font-headline font-bold text-base text-primary">
            Utility Meter Sign-off
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/20 p-6">
          {inspection.meters?.map((m) => (
            <div key={m.meterType} className="p-3 space-y-1">
              <span className="text-[11px] font-mono uppercase text-outline">
                {m.meterType}
              </span>
              <p className="font-headline font-bold text-xl text-primary font-mono">
                {m.value.toLocaleString()} <span className="text-xs font-normal">{m.unit}</span>
              </p>
              <span className="text-[10px] text-on-surface-variant font-mono">
                Logged {new Date(m.readingDate).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Amendments Audit Log (if any exist) */}
      {inspection.amendments?.length > 0 && (
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 p-6 space-y-4">
          <h3 className="font-headline font-bold text-base text-primary">
            Appended Evidentiary Amendments
          </h3>
          <div className="space-y-3">
            {inspection.amendments.map((amend) => (
              <div
                key={amend.id || amend._id}
                className="p-4 bg-surface-container-low rounded border border-outline-variant/30 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">
                    Author: {amend.author?.name} ({amend.author?.role})
                  </span>
                  <span className="font-mono text-outline">
                    {new Date(amend.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-on-surface-variant">
                  <strong>Reason:</strong> {amend.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      <Modal
        isOpen={!!disputeModalRecord}
        onClose={() => setDisputeModalRecord(null)}
        title="Dispute Condition Entry"
        subtitle={`Flagging "${disputeModalRecord?.itemName}" as inaccurate`}
      >
        <form onSubmit={handleDisputeSubmit} className="space-y-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Filing a dispute reopens this item for renegotiation, reverts the inspection status back to{' '}
            <strong>DRAFT</strong>, and resets all previously collected confirmations.
          </p>

          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Reason for Dispute <span className="text-error">*</span>
            </label>
            <textarea
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Sofa fabric has a visible wine stain not recorded in the condition notes."
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-error focus:ring-error text-on-surface"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDisputeModalRecord(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={disputeMutation.isPending}
            >
              Submit Dispute
            </Button>
          </div>
        </form>
      </Modal>

      {/* Post-Lock Amendment Modal */}
      <Modal
        isOpen={amendmentModalOpen}
        onClose={() => setAmendmentModalOpen(false)}
        title="Add Post-Lock Amendment"
        subtitle="Amendments are append-only corrections and will not overwrite the original record"
      >
        <form onSubmit={handleAmendmentSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Target Record
            </label>
            <select
              value={amendTargetId}
              onChange={(e) => setAmendTargetId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface"
              required
            >
              <option value="">Select an asset to amend...</option>
              {inspection.records?.map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.roomName} — {r.itemName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Amendment Justification <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="e.g. Mutual agreement to clarify armrest scratch location"
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface"
              required
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Updated Notes Value
            </label>
            <textarea
              rows={2}
              value={amendNote}
              onChange={(e) => setAmendNote(e.target.value)}
              placeholder="Enter amended qualitative description..."
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAmendmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={amendmentMutation.isPending}
            >
              Record Amendment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
