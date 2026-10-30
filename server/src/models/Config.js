import mongoose from 'mongoose';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const configSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

applyToJSON(configSchema);

export default mongoose.models.Config || mongoose.model('Config', configSchema);
