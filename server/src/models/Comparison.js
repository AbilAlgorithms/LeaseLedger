import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const comparisonItemSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
    },
    roomName: {
      type: String,
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    moveInRating: {
      type: Number,
    },
    moveInRatingLabel: {
      type: String,
      default: '',
    },
    moveOutRating: {
      type: Number,
    },
    moveOutRatingLabel: {
      type: String,
      default: '',
    },
    moveInNotes: {
      type: String,
      default: '',
    },
    moveOutNotes: {
      type: String,
      default: '',
    },
    moveInPhotos: [
      {
        type: String,
      },
    ],
    moveOutPhotos: [
      {
        type: String,
      },
    ],
    result: {
      type: String,
      enum: ['UNCHANGED', 'CHANGED_DETERIORATED', 'IMPROVED', 'MISSING'],
      required: true,
    },
    preExisting: {
      type: Boolean,
      default: false,
    },
    amended: {
      type: Boolean,
      default: false,
    },
    amendmentNote: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const meterDeltaSchema = new Schema(
  {
    meterType: {
      type: String,
      enum: ['ELECTRICITY', 'WATER', 'GAS'],
      required: true,
    },
    moveIn: {
      type: Number,
      required: true,
    },
    moveOut: {
      type: Number,
      required: true,
    },
    used: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: 'units',
    },
    anomaly: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const comparisonSchema = new Schema(
  {
    tenancy: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: [true, 'Tenancy reference is required'],
      index: true,
    },
    moveIn: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
    },
    moveOut: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
    },
    items: [comparisonItemSchema],
    meterDeltas: [meterDeltaSchema],
    counts: {
      unchanged: { type: Number, default: 0 },
      deteriorated: { type: Number, default: 0 },
      improved: { type: Number, default: 0 },
      missing: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    summary: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

applyToJSON(comparisonSchema);

export default mongoose.models.Comparison || mongoose.model('Comparison', comparisonSchema);
