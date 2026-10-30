import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const meterReadingSchema = new Schema(
  {
    inspection: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    meterType: {
      type: String,
      enum: ['ELECTRICITY', 'WATER', 'GAS'],
      required: [true, 'Meter type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Meter reading value is required'],
      min: [0, 'Meter value cannot be negative'],
    },
    unit: {
      type: String,
      default: 'units',
      trim: true,
    },
    readingDate: {
      type: Date,
      default: Date.now,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    sha256: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

meterReadingSchema.index({ inspection: 1, meterType: 1 }, { unique: true });

meterReadingSchema.pre('save', async function (next) {
  const Inspection = mongoose.model('Inspection');
  const parent = await Inspection.findById(this.inspection).select('status').lean();
  if (parent && parent.status === 'LOCKED') {
    const err = new Error('Cannot modify meter reading; parent inspection is locked.');
    err.code = 'INSPECTION_LOCKED';
    err.statusCode = 409;
    return next(err);
  }
  next();
});

const queryLockGuard = async function (next) {
  const query = this.getQuery();
  const existing = await this.model.findOne(query).select('inspection').lean();
  if (existing) {
    const Inspection = mongoose.model('Inspection');
    const parent = await Inspection.findById(existing.inspection).select('status').lean();
    if (parent && parent.status === 'LOCKED') {
      const err = new Error('Cannot update meter reading; parent inspection is locked.');
      err.code = 'INSPECTION_LOCKED';
      err.statusCode = 409;
      return next(err);
    }
  }
  next();
};

['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'findOneAndDelete'].forEach((hook) => {
  meterReadingSchema.pre(hook, queryLockGuard);
});

applyToJSON(meterReadingSchema);

export default mongoose.models.MeterReading || mongoose.model('MeterReading', meterReadingSchema);
