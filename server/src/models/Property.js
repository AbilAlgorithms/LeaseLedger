import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const propertySchema = new Schema(
  {
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord reference is required'],
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Property address is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['APARTMENT', 'HOUSE', 'ROOM', 'OTHER'],
      default: 'APARTMENT',
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    metadata: {
      postcode: String,
      city: String,
      state: String,
      country: { type: String, default: 'AU' },
    },
  },
  {
    timestamps: true,
  }
);

propertySchema.index({ landlord: 1, archived: 1 });

applyToJSON(propertySchema);

export default mongoose.models.Property || mongoose.model('Property', propertySchema);
