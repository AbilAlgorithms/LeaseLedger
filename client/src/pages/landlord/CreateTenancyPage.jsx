import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { propertyApi } from '../../api/property.api';
import { tenancyApi } from '../../api/tenancy.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Calendar, ArrowLeft, Copy, Check, Plus, Search, Building } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateTenancyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedPropertyId = searchParams.get('propertyId') || '';

  const [propertyMode, setPropertyMode] = useState('select'); // 'select' | 'new'
  const [propertyId, setPropertyId] = useState(preselectedPropertyId);
  const [searchFilter, setSearchFilter] = useState('');
  
  // New property fields (allow typing)
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('APARTMENT');
  const [newPropertyName, setNewPropertyName] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setPropertyMode('select');
    } else if (properties) {
      if (properties.length === 0) {
        // Automatically default to "Type New Address" mode if no properties exist
        setPropertyMode('new');
      } else if (!propertyId) {
        setPropertyId(properties[0].id || properties[0]._id);
      }
    }
  }, [preselectedPropertyId, properties]);

  const filteredProperties = (properties || []).filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const addressMatch = p.address?.toLowerCase().includes(q);
    const nameMatch = p.name?.toLowerCase().includes(q);
    const typeMatch = p.type?.toLowerCase().includes(q);
    return addressMatch || nameMatch || typeMatch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Start and end dates are required');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setIsSubmitting(true);
    try {
      let targetPropertyId = propertyId;

      // If user typed a new property, create it first
      if (propertyMode === 'new') {
        const trimmedAddress = newPropertyAddress.trim();
        if (!trimmedAddress || trimmedAddress.length < 3) {
          toast.error('Please enter a valid property address (at least 3 characters)');
          setIsSubmitting(false);
          return;
        }

        const propRes = await propertyApi.createProperty({
          address: trimmedAddress,
          type: newPropertyType,
          name: newPropertyName.trim() || undefined,
        });

        const createdProperty = propRes.data.data;
        targetPropertyId = createdProperty.id || createdProperty._id;
        queryClient.invalidateQueries(['properties']);
      } else {
        if (!targetPropertyId) {
          toast.error('Please select a property or choose to type a new address');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await tenancyApi.createTenancy({
        propertyId: targetPropertyId,
        startDate,
        endDate,
        inviteEmail: inviteEmail.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success('Tenancy created successfully!');
      setCreatedResult(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create tenancy'
      );
    } finally {
      setIsSubmitting(false);
    }
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
                onClick={() => navigate(`/tenancies/${createdResult.data.id || createdResult.data._id}`)}
              >
                Go to Tenancy Timeline
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Property Selector or Direct Address Typing */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                  Property <span className="text-error">*</span>
                </label>
                
                {/* Mode Selector Pill Buttons */}
                <div className="flex items-center gap-1 p-0.5 bg-surface-container-low rounded border border-outline-variant/30 text-xs">
                  <button
                    type="button"
                    onClick={() => setPropertyMode('select')}
                    className={`px-2.5 py-1 rounded transition-colors font-medium ${
                      propertyMode === 'select'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropertyMode('new')}
                    className={`px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1 ${
                      propertyMode === 'new'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Type New Address
                  </button>
                </div>
              </div>

              {loadingProperties ? (
                <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded text-xs text-on-surface-variant">
                  <Spinner size="sm" />
                  <span>Loading your properties...</span>
                </div>
              ) : propertyMode === 'select' ? (
                <div className="space-y-2">
                  {properties && properties.length > 0 ? (
                    <>
                      {/* Search Filter for typing to search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type to filter properties by address or name..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary text-on-surface placeholder:text-outline"
                        />
                        <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2" />
                      </div>

                      <select
                        value={propertyId}
                        onChange={(e) => setPropertyId(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
                        required={propertyMode === 'select'}
                      >
                        <option value="">-- Choose a property ({filteredProperties.length} available) --</option>
                        {filteredProperties.map((p) => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.name ? `${p.name} — ` : ''}{p.address} ({p.type})
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                      <p className="text-amber-800 font-medium">
                        No registered properties found in your account yet.
                      </p>
                      <p className="text-amber-700">
                        Click <strong>"Type New Address"</strong> above to enter your property directly on this form, or{' '}
                        <Link to="/properties" className="underline font-semibold hover:text-amber-900">
                          click here to add a property with full room inventory
                        </Link>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Type New Address Mode */
                <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary font-mono">
                    <Building className="w-4 h-4 text-brass" />
                    <span>Quick Add Property Details</span>
                  </div>

                  <Input
                    label="Property Address"
                    placeholder="e.g. Flat 4B, 18 Kensington Gardens, London"
                    value={newPropertyAddress}
                    onChange={(e) => setNewPropertyAddress(e.target.value)}
                    required={propertyMode === 'new'}
                    helperText="Enter the full street address for this tenancy."
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1 text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                        Property Type
                      </label>
                      <select
                        value={newPropertyType}
                        onChange={(e) => setNewPropertyType(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary text-on-surface"
                      >
                        <option value="APARTMENT">Apartment / Flat</option>
                        <option value="HOUSE">Detached / Semi House</option>
                        <option value="ROOM">Individual Room</option>
                        <option value="OTHER">Other / Commercial</option>
                      </select>
                    </div>

                    <Input
                      label="Property Nickname (Optional)"
                      placeholder="e.g. Kensington Studio"
                      value={newPropertyName}
                      onChange={(e) => setNewPropertyName(e.target.value)}
                    />
                  </div>
                </div>
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
              isLoading={isSubmitting}
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
