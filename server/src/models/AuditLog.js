import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      index: true,
    },
    entity: {
      model: {
        type: String,
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true,
      },
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'entity.id': 1 });

// Append-only rule: Block all update and delete queries on AuditLog
const blockAuditModification = function (next) {
  const err = new Error('Audit logs are immutable and cannot be updated or deleted.');
  err.code = 'AUDIT_LOG_IMMUTABLE';
  err.statusCode = 403;
  next(err);
};

['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'findOneAndDelete'].forEach((hook) => {
  auditLogSchema.pre(hook, blockAuditModification);
});

applyToJSON(auditLogSchema);

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
