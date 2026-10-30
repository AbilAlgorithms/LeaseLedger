import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const issuePhotoSchema = new Schema(
  {
    fileUrl: {
      type: String,
      required: true,
    },
    sha256: {
      type: String,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const issueReportSchema = new Schema(
  {
    tenancy: {
      type: Schema.Types.ObjectId,
      ref: 'Tenancy',
      required: [true, 'Tenancy reference is required'],
      index: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'OPEN',
      required: true,
    },
    photos: [issuePhotoSchema],
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

issueReportSchema.index({ tenancy: 1, createdAt: -1 });

applyToJSON(issueReportSchema);

export default mongoose.models.IssueReport || mongoose.model('IssueReport', issueReportSchema);
