import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const tenancySchema = new Schema(
  {
    property: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Property reference is required'],
      index: true,
    },
    landlord: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Landlord reference is required'],
      index: true,
    },
    tenants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (value) {
          return !this.startDate || value > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

tenancySchema.index({ landlord: 1, status: 1 });
tenancySchema.index({ tenants: 1, status: 1 });

applyToJSON(tenancySchema);

export default mongoose.models.Tenancy || mongoose.model('Tenancy', tenancySchema);
