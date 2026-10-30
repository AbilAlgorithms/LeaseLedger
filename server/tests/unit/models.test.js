import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  User,
  Property,
  Room,
  InventoryItem,
  Tenancy,
  Inspection,
  ConditionRecord,
  Amendment,
  AuditLog,
  Config,
} from '../../src/models/index.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Mongoose Models & Immutability Rules', () => {
  test('User hashes password on save and verifies via comparePassword', async () => {
    const user = await User.create({
      name: 'Asha Landlord',
      email: 'asha@leaseledger.test',
      passwordHash: 'Asha@1234',
      role: 'LANDLORD',
    });

    expect(user.passwordHash).not.toBe('Asha@1234');
    expect(user.passwordHash.length).toBeGreaterThan(20);

    const matches = await user.comparePassword('Asha@1234');
    expect(matches).toBe(true);

    const wrong = await user.comparePassword('WrongPassword');
    expect(wrong).toBe(false);
  });

  test('Tenancy validates that endDate must be after startDate', async () => {
    const landlord = await User.create({
      name: 'Owner',
      email: 'owner@test.com',
      passwordHash: 'Pass@1234',
      role: 'LANDLORD',
    });

    const property = await Property.create({
      landlord: landlord._id,
      address: '12 Park Rd',
      type: 'APARTMENT',
    });

    const invalidTenancy = new Tenancy({
      property: property._id,
      landlord: landlord._id,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-05-01'), // Earlier than start date
      status: 'PENDING',
    });

    await expect(invalidTenancy.save()).rejects.toThrow();
  });

  test('Inspection immutability guard blocks updates to LOCKED inspections', async () => {
    const landlord = await User.create({
      name: 'Asha',
      email: 'asha2@test.com',
      passwordHash: 'Pass@1234',
      role: 'LANDLORD',
    });

    const property = await Property.create({
      landlord: landlord._id,
      address: '12 Park Rd',
      type: 'APARTMENT',
    });

    const tenancy = await Tenancy.create({
      property: property._id,
      landlord: landlord._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    });

    const inspection = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'LOCKED',
      lockedAt: new Date(),
    });

    // Attempting to update a locked inspection must fail with HTTP 409 INSPECTION_LOCKED
    await expect(
      Inspection.updateOne({ _id: inspection._id }, { notes: 'Tampered notes' })
    ).rejects.toThrow('Inspection is locked');
  });

  test('Amendment is append-only and blocks updates or deletes', async () => {
    const user = await User.create({
      name: 'Editor',
      email: 'editor@test.com',
      passwordHash: 'Pass@1234',
      role: 'LANDLORD',
    });

    const property = await Property.create({
      landlord: user._id,
      address: '12 Park Rd',
      type: 'APARTMENT',
    });

    const tenancy = await Tenancy.create({
      property: property._id,
      landlord: user._id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      status: 'ACTIVE',
    });

    const inspection = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'LOCKED',
    });

    const amendment = await Amendment.create({
      inspection: inspection._id,
      author: user._id,
      reason: 'Typo correction on meter serial',
      target: { model: 'ConditionRecord', id: new mongoose.Types.ObjectId() },
      before: { rating: 4 },
      after: { rating: 5 },
    });

    // Attempting update on amendment must be rejected
    await expect(
      Amendment.updateOne({ _id: amendment._id }, { reason: 'Unauthorized modification' })
    ).rejects.toThrow('Amendments are append-only');
  });

  test('AuditLog is append-only and blocks deletion', async () => {
    const user = await User.create({
      name: 'Auditor',
      email: 'audit@test.com',
      passwordHash: 'Pass@1234',
      role: 'ADMIN',
    });

    const log = await AuditLog.create({
      user: user._id,
      action: 'USER_REGISTERED',
      entity: { model: 'User', id: user._id },
    });

    await expect(AuditLog.deleteOne({ _id: log._id })).rejects.toThrow('Audit logs are immutable');
  });

  test('Config stores and retrieves default system configurations', async () => {
    const scale = [
      { value: 5, label: 'EXCELLENT', color: 'emerald' },
      { value: 4, label: 'GOOD', color: 'teal' },
      { value: 3, label: 'FAIR', color: 'amber' },
      { value: 2, label: 'POOR', color: 'orange' },
      { value: 1, label: 'DAMAGED', color: 'red' },
      { value: 0, label: 'MISSING', color: 'rose' },
    ];

    await Config.create({
      key: 'conditionScale',
      value: scale,
      description: 'Standard 5-point condition evaluation scale',
    });

    const retrieved = await Config.findOne({ key: 'conditionScale' });
    expect(retrieved.value).toHaveLength(6);
    expect(retrieved.value[0].label).toBe('EXCELLENT');
  });
});
