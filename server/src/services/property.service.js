import { Property, Room, InventoryItem, ConditionRecord, Inspection, Tenancy } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { logAudit } from './audit.service.js';

async function assertPropertyOwner(propertyId, landlordId) {
  const property = await Property.findById(propertyId);
  if (!property) throw ApiError.notFound('Property not found');
  if (property.landlord.toString() !== landlordId.toString()) {
    throw ApiError.forbidden('You do not own this property', 'NOT_PROPERTY_OWNER');
  }
  return property;
}

export async function createProperty(landlordId, data, req = null) {
  const property = await Property.create({
    ...data,
    landlord: landlordId,
  });

  await logAudit({
    user: landlordId,
    action: 'PROPERTY_CREATED',
    entity: { model: 'Property', id: property._id },
    meta: { address: property.address },
    req,
  });

  return property;
}

export async function getProperties(landlordId, { archived = false } = {}) {
  const query = { landlord: landlordId };
  if (archived !== undefined) {
    query.archived = archived === 'true' || archived === true;
  }
  return Property.find(query).sort({ createdAt: -1 });
}

export async function getPropertyById(propertyId, user) {
  const property = await Property.findById(propertyId).populate('landlord', 'name email phone');
  if (!property) throw ApiError.notFound('Property not found');

  // Verify access: Landlord owner or linked tenant or admin
  const isOwner = property.landlord._id.toString() === user._id.toString();
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    // Check if user is a tenant in any active/pending tenancy for this property
    const isTenant = await Tenancy.exists({
      property: propertyId,
      tenants: user._id,
    });
    if (!isTenant) {
      throw ApiError.forbidden('Access denied to this property');
    }
  }

  // Load rooms and inventory items
  const rooms = await Room.find({ property: propertyId }).sort({ order: 1, createdAt: 1 });
  const items = await InventoryItem.find({ property: propertyId, archived: false }).sort({ createdAt: 1 });

  const roomsWithItems = rooms.map((room) => ({
    ...room.toJSON(),
    items: items.filter((item) => item.room.toString() === room._id.toString()),
  }));

  return {
    ...property.toJSON(),
    rooms: roomsWithItems,
  };
}

export async function updateProperty(propertyId, landlordId, data, req = null) {
  await assertPropertyOwner(propertyId, landlordId);

  const updated = await Property.findByIdAndUpdate(propertyId, { $set: data }, { new: true, runValidators: true });

  await logAudit({
    user: landlordId,
    action: 'PROPERTY_UPDATED',
    entity: { model: 'Property', id: propertyId },
    meta: data,
    req,
  });

  return updated;
}

export async function toggleArchiveProperty(propertyId, landlordId, req = null) {
  const property = await assertPropertyOwner(propertyId, landlordId);
  property.archived = !property.archived;
  await property.save();

  await logAudit({
    user: landlordId,
    action: property.archived ? 'PROPERTY_ARCHIVED' : 'PROPERTY_RESTORED',
    entity: { model: 'Property', id: propertyId },
    req,
  });

  return property;
}

export async function addRoom(propertyId, landlordId, { name, order = 0 }) {
  await assertPropertyOwner(propertyId, landlordId);

  const existing = await Room.findOne({ property: propertyId, name: name.trim() });
  if (existing) {
    throw ApiError.conflict('A room with this name already exists in this property');
  }

  return Room.create({
    property: propertyId,
    name: name.trim(),
    order,
  });
}

export async function updateRoom(roomId, landlordId, { name }) {
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await assertPropertyOwner(room.property, landlordId);

  const conflict = await Room.findOne({
    property: room.property,
    name: name.trim(),
    _id: { $ne: roomId },
  });
  if (conflict) {
    throw ApiError.conflict('A room with this name already exists in this property');
  }

  room.name = name.trim();
  await room.save();
  return room;
}

export async function deleteRoom(roomId, landlordId) {
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await assertPropertyOwner(room.property, landlordId);

  // Check if any items in this room are referenced in a LOCKED inspection
  const itemIds = (await InventoryItem.find({ room: roomId }).select('_id')).map((i) => i._id);
  if (itemIds.length > 0) {
    const isReferencedInLocked = await ConditionRecord.exists({
      item: { $in: itemIds },
    });
    if (isReferencedInLocked) {
      throw ApiError.conflict(
        'Cannot delete room containing items referenced in an existing inspection. Archive items instead.',
        'ROOM_IN_LOCKED_INSPECTION'
      );
    }
  }

  await InventoryItem.deleteMany({ room: roomId });
  await Room.findByIdAndDelete(roomId);
  return { message: 'Room and its items deleted successfully' };
}

export async function addItem(roomId, landlordId, data) {
  const room = await Room.findById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  await assertPropertyOwner(room.property, landlordId);

  return InventoryItem.create({
    ...data,
    room: roomId,
    property: room.property,
  });
}

export async function updateItem(itemId, landlordId, data) {
  const item = await InventoryItem.findById(itemId);
  if (!item) throw ApiError.notFound('Inventory item not found');
  await assertPropertyOwner(item.property, landlordId);

  return InventoryItem.findByIdAndUpdate(itemId, { $set: data }, { new: true, runValidators: true });
}

export async function deleteItem(itemId, landlordId) {
  const item = await InventoryItem.findById(itemId);
  if (!item) throw ApiError.notFound('Inventory item not found');
  await assertPropertyOwner(item.property, landlordId);

  // Check if referenced in any inspection
  const isReferenced = await ConditionRecord.exists({ item: itemId });
  if (isReferenced) {
    // If referenced in an inspection, SRS Rule: cannot delete, archive instead!
    item.archived = true;
    await item.save();
    return {
      archived: true,
      message: 'Item has historical inspection references and was archived rather than deleted.',
    };
  }

  await InventoryItem.findByIdAndDelete(itemId);
  return { message: 'Item deleted permanently' };
}
