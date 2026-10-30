import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi } from '../../api/property.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import {
  Building,
  Plus,
  Home,
  Archive,
  ArrowLeft,
  Trash2,
  Edit2,
  Check,
  Package,
  Layers,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ITEM_CATEGORIES = [
  'Furniture',
  'Fixture',
  'Appliance',
  'Wall/Ceiling',
  'Floor',
  'Door/Window',
  'Plumbing',
  'Electrical',
  'Other',
];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modals state
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const [addItemRoomId, setAddItemRoomId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Furniture');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemDesc, setItemDesc] = useState('');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      const res = await propertyApi.getProperty(id);
      return res.data.data;
    },
  });

  const addRoomMutation = useMutation({
    mutationFn: (roomData) => propertyApi.addRoom(id, roomData),
    onSuccess: () => {
      queryClient.invalidateQueries(['property', id]);
      toast.success('Room created successfully');
      setAddRoomOpen(false);
      setNewRoomName('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to add room');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId) => propertyApi.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries(['property', id]);
      toast.success('Room deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Cannot delete room');
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ roomId, itemData }) => propertyApi.addItem(roomId, itemData),
    onSuccess: () => {
      queryClient.invalidateQueries(['property', id]);
      toast.success('Inventory item added');
      setAddItemRoomId(null);
      setItemName('');
      setItemDesc('');
      setItemQuantity(1);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to add item');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId) => propertyApi.deleteItem(itemId),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['property', id]);
      toast.success(res.data.message || 'Item deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete item');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => propertyApi.toggleArchiveProperty(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['property', id]);
      toast.success(res.data.message);
    },
  });

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    addRoomMutation.mutate({ name: newRoomName.trim() });
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!itemName.trim() || !addItemRoomId) return;
    addItemMutation.mutate({
      roomId: addItemRoomId,
      itemData: {
        name: itemName.trim(),
        category: itemCategory,
        quantity: itemQuantity,
        description: itemDesc.trim(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h2 className="text-xl font-bold font-headline text-primary">Property Not Found</h2>
        <Link to="/properties" className="mt-4 inline-block">
          <Button variant="primary" size="sm">
            Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  const totalItemsCount = property.rooms?.reduce((acc, r) => acc + (r.items?.length || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back Link & Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/properties"
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Properties</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => archiveMutation.mutate()}
            icon={Archive}
          >
            {property.archived ? 'Restore Property' : 'Archive Property'}
          </Button>
          <Link to={`/tenancies/new?propertyId=${property.id}`}>
            <Button variant="brass" size="sm" icon={Calendar}>
              Create Tenancy
            </Button>
          </Link>
        </div>
      </div>

      {/* Property Overview Header Card */}
      <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-headline font-bold text-2xl text-primary">
                {property.name || property.address.split(',')[0]}
              </h1>
              <Badge variant="default" size="sm">
                {property.type}
              </Badge>
              {property.archived && <Badge variant="disputed">Archived</Badge>}
            </div>
            <p className="text-xs text-on-surface-variant font-mono">{property.address}</p>
          </div>

          <div className="flex items-center gap-6 text-xs text-on-surface-variant border-t sm:border-t-0 sm:border-l border-outline-variant/30 pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="block font-mono uppercase tracking-wider text-[10px] text-outline">
                Rooms Defined
              </span>
              <span className="font-headline font-bold text-lg text-primary">
                {property.rooms?.length || 0}
              </span>
            </div>
            <div>
              <span className="block font-mono uppercase tracking-wider text-[10px] text-outline">
                Inventory Assets
              </span>
              <span className="font-headline font-bold text-lg text-primary">
                {totalItemsCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Room and Inventory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-lg text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-brass" />
            <span>Rooms & Inventory Ledger</span>
          </h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAddRoomOpen(true)}
            icon={Plus}
          >
            Add Room
          </Button>
        </div>

        {/* Room Accordions / Blocks */}
        {!property.rooms || property.rooms.length === 0 ? (
          <EmptyState
            title="No rooms created yet"
            description="Add rooms (e.g. Living Room, Kitchen, Master Bedroom) to begin cataloging fixtures and items for inspection."
            icon={Layers}
            actionText="Add First Room"
            onAction={() => setAddRoomOpen(true)}
          />
        ) : (
          <div className="space-y-6">
            {property.rooms.map((room) => (
              <div
                key={room.id}
                className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-hidden shadow-sm"
              >
                {/* Room Header */}
                <div className="px-6 py-3.5 bg-surface-container-low/60 border-b border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <h3 className="font-headline font-bold text-base text-primary">
                      {room.name}
                    </h3>
                    <span className="text-xs text-on-surface-variant font-mono">
                      ({room.items?.length || 0} items)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddItemRoomId(room.id)}
                      icon={Plus}
                    >
                      Add Item
                    </Button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete room "${room.name}" and all its inventory items?`)) {
                          deleteRoomMutation.mutate(room.id);
                        }
                      }}
                      className="p-1.5 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items Table / Cards */}
                {!room.items || room.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-on-surface-variant">
                    No items in this room yet.{' '}
                    <button
                      onClick={() => setAddItemRoomId(room.id)}
                      className="text-primary font-semibold underline hover:opacity-80"
                    >
                      Add the first item
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/20">
                    {room.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-6 py-3 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-outline-variant shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-primary">
                                {item.name}
                              </span>
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container font-mono text-on-surface-variant">
                                {item.category}
                              </span>
                              <span className="text-[11px] text-on-surface-variant font-mono">
                                Qty: {item.quantity}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (confirm(`Delete or archive "${item.name}"?`)) {
                                deleteItemMutation.mutate(item.id);
                              }
                            }}
                            className="p-1 text-outline-variant hover:text-error transition-colors"
                            title="Delete / Archive Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <Modal
        isOpen={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        title="Add Room to Property"
        subtitle="Specify the room designation (e.g. Master Bedroom, Balcony)"
      >
        <form onSubmit={handleAddRoom} className="space-y-4">
          <Input
            label="Room Name"
            placeholder="e.g. Living Room"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddRoomOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addRoomMutation.isPending}
            >
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={!!addItemRoomId}
        onClose={() => setAddItemRoomId(null)}
        title="Add Inventory Item"
        subtitle="Catalog a fixture, appliance, or furniture piece for inspection tracking"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input
            label="Item Name"
            placeholder="e.g. Sofa, Dining Table, Wall, Tap"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-headline">
                Category
              </label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary text-on-surface"
              >
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Quantity"
              type="number"
              min="1"
              value={itemQuantity}
              onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          <Input
            label="Initial Description / Model (Optional)"
            placeholder="e.g. 3-seater grey fabric, minor pre-existing scratch"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAddItemRoomId(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addItemMutation.isPending}
            >
              Save Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
