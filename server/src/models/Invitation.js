import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const invitationSchema = new Schema(
  {
    tenancy: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: [true, 'Tenancy reference is required'],
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
      default: 'PENDING',
      required: true,
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

applyToJSON(invitationSchema, ['tokenHash']);

export default mongoose.models.Invitation || mongoose.model('Invitation', invitationSchema);
