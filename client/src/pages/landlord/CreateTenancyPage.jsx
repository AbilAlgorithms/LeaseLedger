import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { propertyApi } from '../../api/property.api';
import { tenancyApi } from '../../api/tenancy.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Calendar, ArrowLeft, Mail, Copy, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateTenancyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId') || '';

  const [propertyId, setPropertyId] = useState(preselectedPropertyId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', false],
    queryFn: async () => {
      const res = await propertyApi.getProperties({ archived: false });
      return res.data.data;
    },
  });

  useEffect(() => {
    if (preselectedPropertyId) {
      setPropertyId(preselectedPropertyId);
    } else if (properties && properties.length > 0 && !propertyId) {
      setPropertyId(properties[0].id);
    }
  }, [preselectedPropertyId, properties]);

  const createMutation = useMutation({
    mutationFn: (data) => tenancyApi.createTenancy(data),
    onSuccess: (res) => {
      toast.success('Tenancy created successfully');
      setCreatedResult(res.data);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create tenancy');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('Please select a property');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    createMutation.mutate({
      propertyId,
      startDate,
      endDate,
      inviteEmail,
      notes,
    });
  };

  const copyInviteLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invitation link copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <Link
        to="/properties"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Properties</span>
      </Link>

      <div className="bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/40 shadow-sm space-y-6">
        <div className="space-y-1">
          <h1 className="font-headline font-bold text-2xl text-primary">Create New Tenancy</h1>
          <p className="text-xs text-on-surface-variant">
            Define tenancy duration and issue a single-use secure invitation link for your tenant
          </p>
        </div>

        {/* If created, show the invitation share card */}
        {createdResult ? (
          <div className="p-6 bg-surface-container-low rounded-lg border border-emerald-200 space-y-4">
            <div className="flex items-center gap-2 text-verified font-bold text-base">
              <Check className="w-5 h-5" />
              <span>Tenancy Created & Ready</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              The tenancy record is now pending move-in inspection. Share the secure invitation link below with
              your tenant. Once they accept, they will be linked to this property.
            </p>

            {createdResult.invitation?.joinUrl ? (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">
                  Tenant Single-Use Invitation Link (7-day validity):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdResult.invitation.joinUrl}
                    className="flex-1 px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded font-mono text-primary select-all"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => copyInviteLink(createdResult.invitation.joinUrl)}
                    icon={copied ? Check : Copy}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
              <Button
                variant="brass"
                size="sm"
                onClick={() => navigate(`/tenancies/${createdResult.data.id}`)}
              >
                Go to Tenancy Timeline
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Property Selector */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                Select Property <span className="text-error">*</span>
              </label>
              {loadingProperties ? (
                <Spinner size="sm" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
                  required
                >
                  {properties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name ? `${p.name} — ` : ''}{p.address} ({p.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tenancy Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />

              <Input
                label="Tenancy End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {/* Tenant Email for Automated Invite */}
            <Input
              label="Tenant Email Address (Optional)"
              type="email"
              placeholder="e.g. ravi@leaseledger.test"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              helperText="If provided, an official invitation link will be dispatched automatically via email."
            />

            {/* Special Tenancy Notes */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                Tenancy Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Includes parking bay #4; pet agreement on file."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={createMutation.isPending}
              icon={Calendar}
            >
              Generate Tenancy & Invitation Link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
