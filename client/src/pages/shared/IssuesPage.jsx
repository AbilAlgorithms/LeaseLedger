import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issueApi } from '../../api/issue.api';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import {
  AlertCircle,
  Plus,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  MessageSquare,
  Wrench,
  Maximize2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function IssuesPage() {
  const { id: tenancyId } = useParams();
  const { user, isLandlord } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState(null);

  const [resolveModalIssue, setResolveModalIssue] = useState(null);
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fileInputRef = useRef(null);

  const { data: issues, isLoading } = useQuery({
    queryKey: ['tenancy-issues', tenancyId],
    queryFn: async () => {
      const res = await issueApi.getTenancyIssues(tenancyId);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (formData) => issueApi.createIssue(tenancyId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenancy-issues', tenancyId]);
      toast.success('Incident report submitted successfully');
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setSelectedPhotos([]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit report');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ issueId, data }) => issueApi.updateIssueStatus(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tenancy-issues', tenancyId]);
      toast.success('Issue status updated');
      setResolveModalIssue(null);
      setResolutionNotes('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update status');
    },
  });

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedPhotos((prev) => [...prev, ...files]);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    selectedPhotos.forEach((file) => {
      formData.append('photos', file);
    });

    createMutation.mutate(formData);
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!resolveModalIssue) return;
    statusMutation.mutate({
      issueId: resolveModalIssue.id || resolveModalIssue._id,
      data: {
        status: resolutionStatus,
        resolutionNotes: resolutionNotes.trim(),
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div className="space-y-1">
          <Link
            to={`/tenancies/${tenancyId}`}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tenancy Hub</span>
          </Link>
          <h1 className="font-headline font-bold text-2xl text-primary">
            Mid-Tenancy Incident & Repair Log
          </h1>
          <p className="text-xs text-on-surface-variant">
            Track and document repairs, appliance breakdowns, and maintenance requests during the tenancy term
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={Plus}
        >
          Report Maintenance Incident
        </Button>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : !issues || issues.length === 0 ? (
        <EmptyState
          title="No mid-tenancy incidents reported"
          description="Everything is running smoothly! If maintenance or accidental damage occurs during the tenancy, report it here with photo evidence."
          icon={Wrench}
          actionText="Report First Incident"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id || issue._id}
              className="p-6 bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-outline-variant/20 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-primary">
                      {issue.title}
                    </h3>
                    <Badge
                      variant={
                        issue.status === 'RESOLVED'
                          ? 'verified'
                          : issue.status === 'ACKNOWLEDGED'
                          ? 'pending'
                          : 'disputed'
                      }
                      size="sm"
                    >
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Reported by {issue.reportedBy?.name} ({issue.reportedBy?.role}) on{' '}
                    {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {isLandlord && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setResolveModalIssue(issue);
                      setResolutionStatus(issue.status);
                      setResolutionNotes(issue.resolutionNotes || '');
                    }}
                  >
                    Update Status
                  </Button>
                )}
              </div>

              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {issue.description}
              </p>

              {/* Photo Evidence Plates */}
              {issue.photos?.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-mono font-bold uppercase text-outline block">
                    Evidence Photographic Plates ({issue.photos.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    {issue.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded border border-outline-variant/40 overflow-hidden w-28 h-20 bg-surface-container cursor-pointer"
                        onClick={() => setSelectedLightboxPhoto(photo.fileUrl)}
                      >
                        <img
                          src={photo.fileUrl}
                          alt="Incident evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/75 text-white font-mono text-[8px] text-center truncate px-1">
                          SHA:{photo.sha256?.slice(0, 6)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Notes Banner */}
              {issue.resolutionNotes && (
                <div className="p-3 bg-surface-container-low rounded border border-outline-variant/30 text-xs space-y-1">
                  <span className="font-bold text-primary flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-verified" />
                    <span>Resolution Record:</span>
                  </span>
                  <p className="text-on-surface-variant italic">"{issue.resolutionNotes}"</p>
                  {issue.resolvedAt && (
                    <span className="text-[10px] text-outline font-mono block">
                      Resolved on {new Date(issue.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report New Incident Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Report Maintenance Incident"
        subtitle="Provide clear details and optional photographic evidence"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Incident Title"
            placeholder="e.g. Kitchen tap leaking beneath basin"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Incident Description <span className="text-error">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact details of the incident or required repair..."
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
              required
            />
          </div>

          {/* Photo Attachments Picker */}
          <div className="space-y-2 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Photo Evidence Plates
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              icon={Camera}
            >
              Attach Images ({selectedPhotos.length} selected)
            </Button>
            {selectedPhotos.length > 0 && (
              <p className="text-[11px] text-on-surface-variant font-mono">
                {selectedPhotos.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={!!resolveModalIssue}
        onClose={() => setResolveModalIssue(null)}
        title="Update Issue Status"
        subtitle={`Managing incident: "${resolveModalIssue?.title}"`}
      >
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Status State
            </label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface"
            >
              <option value="OPEN">OPEN (Awaiting action)</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED (Under review / Scheduled)</option>
              <option value="RESOLVED">RESOLVED (Repaired or Closed)</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Resolution Remarks / Vendor Note
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Plumber replaced faulty O-ring on 12 March. Completed."
              className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded text-on-surface"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResolveModalIssue(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={statusMutation.isPending}
            >
              Save Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Modal */}
      <Modal
        isOpen={!!selectedLightboxPhoto}
        onClose={() => setSelectedLightboxPhoto(null)}
        title="Evidence Plate Viewer"
        maxWidth="max-w-2xl"
      >
        {selectedLightboxPhoto && (
          <div className="rounded overflow-hidden bg-black flex items-center justify-center max-h-[65vh]">
            <img
              src={selectedLightboxPhoto}
              alt="Enlarged evidence"
              className="max-h-[65vh] w-auto object-contain"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
