import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const inventoryItemSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room reference is required'],
      index: true,
    },
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Other',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

inventoryItemSchema.index({ room: 1, archived: 1 });
inventoryItemSchema.index({ property: 1, archived: 1 });

applyToJSON(inventoryItemSchema);

export default mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
