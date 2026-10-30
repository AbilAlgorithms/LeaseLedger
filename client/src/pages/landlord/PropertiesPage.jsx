import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi } from '../../api/property.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Building, Plus, Home, Archive, ArrowRight, MapPin, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('APARTMENT');

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', showArchived],
    queryFn: async () => {
      const res = await propertyApi.getProperties({ archived: showArchived });
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (newProperty) => propertyApi.createProperty(newProperty),
    onSuccess: () => {
      queryClient.invalidateQueries(['properties']);
      toast.success('Property registered successfully');
      setCreateModalOpen(false);
      setName('');
      setAddress('');
      setType('APARTMENT');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create property');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      toast.error('Property address is required');
      return;
    }
    createMutation.mutate({ name, address, type });
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
        <div>
          <h1 className="font-headline font-bold text-2xl sm:text-3xl text-primary">Managed Properties</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            Maintain your property portfolios, room configurations, and item inventory baselines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            icon={Archive}
          >
            {showArchived ? 'View Active' : 'View Archived'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            icon={Plus}
          >
            Add Property
          </Button>
        </div>
      </div>

      {/* Property Cards Grid */}
      {isLoading ? (
        <Spinner size="lg" />
      ) : !properties || properties.length === 0 ? (
        <EmptyState
          title={showArchived ? 'No archived properties' : 'No properties registered yet'}
          description="Register your first rental property to begin setting up rooms, inventory items, and tenancy handovers."
          icon={Building}
          actionText={showArchived ? undefined : 'Add First Property'}
          onAction={showArchived ? undefined : () => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 hover:border-primary/50 transition-all shadow-sm flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-base text-primary leading-tight">
                        {prop.name || prop.address.split(',')[0]}
                      </h3>
                      <span className="text-[11px] font-mono text-outline uppercase tracking-wider">
                        {prop.type}
                      </span>
                    </div>
                  </div>
                  {prop.archived && <Badge variant="disputed">Archived</Badge>}
                </div>

                <div className="flex items-start gap-2 text-xs text-on-surface-variant">
                  <MapPin className="w-4 h-4 shrink-0 text-outline-variant mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">{prop.address}</span>
                </div>
              </div>

              <div className="px-6 py-3 bg-surface-container-low/40 border-t border-outline-variant/30 flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-mono">
                  Created {new Date(prop.createdAt).toLocaleDateString()}
                </span>
                <Link to={`/properties/${prop.id}`}>
                  <Button variant="ghost" size="sm" icon={ArrowRight}>
                    Manage Inventory
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Property Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Property"
        subtitle="Provide address and property classification"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Property Nickname / Unit (Optional)"
            placeholder="e.g. flat12 or Highbury Mews Unit 12"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Full Physical Address"
            placeholder="e.g. 12 Park Rd, Melbourne VIC 3000"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
              Property Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
            >
              <option value="APARTMENT">Apartment / Unit</option>
              <option value="HOUSE">Detached House</option>
              <option value="ROOM">Individual Room</option>
              <option value="OTHER">Other Residential</option>
            </select>
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
              Register Property
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
