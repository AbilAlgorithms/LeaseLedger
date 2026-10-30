import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { applyToJSON } from '../utils/schemaHelper.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['LANDLORD', 'TENANT', 'ADMIN'],
      default: 'TENANT',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verifyTokenHash: {
      type: String,
      select: false,
    },
    resetTokenHash: {
      type: String,
      select: false,
    },
    resetExpiresAt: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

applyToJSON(userSchema, ['passwordHash', 'verifyTokenHash', 'resetTokenHash']);

export default mongoose.models.User || mongoose.model('User', userSchema);
