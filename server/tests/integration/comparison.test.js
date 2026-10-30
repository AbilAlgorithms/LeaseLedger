import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import {
  User,
  Property,
  Tenancy,
  Inspection,
  ConditionRecord,
  MeterReading,
  Comparison,
  Report,
  Room,
  InventoryItem,
} from '../../src/models/index.js';

let mongoServer;
let landlord, tenant;
let tokenLandlord, tokenTenant;
let property, tenancy;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Property.deleteMany({});
  await Room.deleteMany({});
  await InventoryItem.deleteMany({});
  await Tenancy.deleteMany({});
  await Inspection.deleteMany({});
  await ConditionRecord.deleteMany({});
  await MeterReading.deleteMany({});
  await Comparison.deleteMany({});
  await Report.deleteMany({});

  // Landlord
  await request(app).post('/api/v1/auth/register').send({
    name: 'Asha Landlord',
    email: 'asha@leaseledger.test',
    password: 'Password123',
    role: 'LANDLORD',
  });
  const lLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'asha@leaseledger.test',
    password: 'Password123',
  });
  tokenLandlord = lLogin.body.data.accessToken;
  landlord = lLogin.body.data.user;

  // Tenant
  await request(app).post('/api/v1/auth/register').send({
    name: 'Ravi Tenant',
    email: 'ravi@leaseledger.test',
    password: 'Password123',
    role: 'TENANT',
  });
  const tLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'ravi@leaseledger.test',
    password: 'Password123',
  });
  tokenTenant = tLogin.body.data.accessToken;
  tenant = tLogin.body.data.user;

  // Create Property directly
  property = await Property.create({
    landlord: landlord.id,
    address: '12 Park Road, London',
    type: 'APARTMENT',
  });

  // Create Tenancy directly
  tenancy = await Tenancy.create({
    property: property._id,
    landlord: landlord.id,
    tenants: [tenant.id],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    status: 'ACTIVE',
  });
});

describe('Feature 7 & 8: Comparison Engine & PDF Reports', () => {
  test('Exact SRS worked example reproduction', async () => {
    // 1. Create room and items
    const room = await Room.create({
      property: property._id,
      name: 'General',
    });

    const item1 = await InventoryItem.create({
      property: property._id,
      room: room._id,
      name: 'Bedroom Wall',
      category: 'WALLS_FLOORS',
    });
    const item2 = await InventoryItem.create({
      property: property._id,
      room: room._id,
      name: 'Living Room Sofa',
      category: 'FURNITURE',
    });
    const item3 = await InventoryItem.create({
      property: property._id,
      room: room._id,
      name: 'Dining Table',
      category: 'FURNITURE',
    });
    const item4 = await InventoryItem.create({
      property: property._id,
      room: room._id,
      name: 'Kitchen Tap',
      category: 'FIXTURES',
    });

    // 2. Create Move-In Inspection (DRAFT -> records -> LOCKED)
    const moveIn = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
      startedBy: landlord._id,
    });

    await ConditionRecord.create([
      {
        inspection: moveIn._id,
        item: item1._id,
        roomName: 'Bedroom',
        itemName: 'Bedroom Wall',
        rating: 3,
        ratingLabel: 'FAIR',
        notes: 'Pre-existing scuff near doorway',
        recordedBy: landlord._id,
      },
      {
        inspection: moveIn._id,
        item: item2._id,
        roomName: 'Living Room',
        itemName: 'Living Room Sofa',
        rating: 5,
        ratingLabel: 'EXCELLENT',
        notes: 'Brand new condition',
        recordedBy: landlord._id,
      },
      {
        inspection: moveIn._id,
        item: item3._id,
        roomName: 'Dining Room',
        itemName: 'Dining Table',
        rating: 4,
        ratingLabel: 'GOOD',
        notes: 'Clean surfaces',
        recordedBy: landlord._id,
      },
      {
        inspection: moveIn._id,
        item: item4._id,
        roomName: 'Kitchen',
        itemName: 'Kitchen Tap',
        rating: 2,
        ratingLabel: 'POOR',
        notes: 'Slight leak at base',
        recordedBy: landlord._id,
      },
    ]);

    await MeterReading.create({
      inspection: moveIn._id,
      meterType: 'ELECTRICITY',
      value: 12450,
      unit: 'kWh',
      recordedBy: landlord._id,
    });

    await Inspection.findByIdAndUpdate(moveIn._id, {
      status: 'LOCKED',
      lockedAt: new Date(),
    });

    // 3. Create Move-Out Inspection (DRAFT -> records -> LOCKED)
    const moveOut = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_OUT',
      status: 'DRAFT',
      startedBy: landlord._id,
    });

    await ConditionRecord.create([
      {
        inspection: moveOut._id,
        item: item1._id,
        roomName: 'Bedroom',
        itemName: 'Bedroom Wall',
        rating: 3,
        ratingLabel: 'FAIR',
        notes: 'Same pre-existing scuff near doorway',
        recordedBy: tenant._id,
      },
      {
        inspection: moveOut._id,
        item: item2._id,
        roomName: 'Living Room',
        itemName: 'Living Room Sofa',
        rating: 5,
        ratingLabel: 'EXCELLENT',
        notes: 'Still excellent condition',
        recordedBy: tenant._id,
      },
      {
        inspection: moveOut._id,
        item: item3._id,
        roomName: 'Dining Room',
        itemName: 'Dining Table',
        rating: 2,
        ratingLabel: 'POOR',
        notes: 'Deep scratches on surface',
        recordedBy: tenant._id,
      },
      {
        inspection: moveOut._id,
        item: item4._id,
        roomName: 'Kitchen',
        itemName: 'Kitchen Tap',
        rating: 4,
        ratingLabel: 'GOOD',
        notes: 'Washer repaired by landlord during tenancy',
        recordedBy: tenant._id,
      },
    ]);

    await MeterReading.create({
      inspection: moveOut._id,
      meterType: 'ELECTRICITY',
      value: 15820,
      unit: 'kWh',
      recordedBy: tenant._id,
    });

    await Inspection.findByIdAndUpdate(moveOut._id, {
      status: 'LOCKED',
      lockedAt: new Date(),
    });

    // 4. Trigger Comparison Engine via API
    const res = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/compare`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(200);

    const comp = res.body.data;
    expect(comp.counts.total).toBe(4);
    expect(comp.counts.unchanged).toBe(2);
    expect(comp.counts.deteriorated).toBe(1);
    expect(comp.counts.improved).toBe(1);
    expect(comp.counts.missing).toBe(0);

    // Verify item 1 (Bedroom Wall): unchanged, preExistingWear flagged
    const wall = comp.items.find((i) => i.itemName === 'Bedroom Wall');
    expect(wall.result).toBe('UNCHANGED');
    expect(wall.preExisting).toBe(true);

    // Verify item 2 (Sofa): unchanged, no preExistingWear
    const sofa = comp.items.find((i) => i.itemName === 'Living Room Sofa');
    expect(sofa.result).toBe('UNCHANGED');
    expect(sofa.preExisting).toBe(false);

    // Verify item 3 (Dining Table): deteriorated
    const table = comp.items.find((i) => i.itemName === 'Dining Table');
    expect(table.result).toBe('CHANGED_DETERIORATED');
    expect(table.moveInRating).toBe(4);
    expect(table.moveOutRating).toBe(2);

    // Verify item 4 (Kitchen Tap): improved
    const tap = comp.items.find((i) => i.itemName === 'Kitchen Tap');
    expect(tap.result).toBe('IMPROVED');
    expect(tap.moveInRating).toBe(2);
    expect(tap.moveOutRating).toBe(4);

    // Verify Meter Delta: 15,820 - 12,450 = 3,370 kWh used
    const eleMeter = comp.meterDeltas.find((m) => m.meterType === 'ELECTRICITY');
    expect(eleMeter).toBeDefined();
    expect(eleMeter.used).toBe(3370);

    // Tenancy status should be COMPLETED
    const updatedTen = await Tenancy.findById(tenancy._id);
    expect(updatedTen.status).toBe('COMPLETED');
  });

  test('Performance Benchmark: 200 items compared in <= 5 seconds', async () => {
    // Generate 200 inventory items
    const moveIn = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
      startedBy: landlord._id,
    });
    const moveOut = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_OUT',
      status: 'DRAFT',
      startedBy: landlord._id,
    });

    const miRecords = [];
    const moRecords = [];

    for (let i = 1; i <= 200; i++) {
      const itemId = new mongoose.Types.ObjectId();
      miRecords.push({
        inspection: moveIn._id,
        item: itemId,
        roomName: `Room ${Math.ceil(i / 20)}`,
        itemName: `Item ${i}`,
        rating: (i % 5) + 1,
        ratingLabel: 'GOOD',
        recordedBy: landlord._id,
      });
      moRecords.push({
        inspection: moveOut._id,
        item: itemId,
        roomName: `Room ${Math.ceil(i / 20)}`,
        itemName: `Item ${i}`,
        rating: ((i + 1) % 5) + 1,
        ratingLabel: 'GOOD',
        recordedBy: tenant._id,
      });
    }

    await ConditionRecord.insertMany(miRecords);
    await ConditionRecord.insertMany(moRecords);

    await Inspection.findByIdAndUpdate(moveIn._id, { status: 'LOCKED', lockedAt: new Date() });
    await Inspection.findByIdAndUpdate(moveOut._id, { status: 'LOCKED', lockedAt: new Date() });

    const startTime = Date.now();

    const res = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/compare`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(200);

    const duration = Date.now() - startTime;
    expect(res.body.data.counts.total).toBe(200);
    expect(duration).toBeLessThan(5000); // SRS Requirement: <= 5 seconds
  });

  test('Generate PDF Report and download binary stream', async () => {
    // Setup minimal inspections
    const moveIn = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
      startedBy: landlord._id,
    });
    const moveOut = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_OUT',
      status: 'DRAFT',
      startedBy: landlord._id,
    });

    const itemId = new mongoose.Types.ObjectId();
    await ConditionRecord.create({
      inspection: moveIn._id,
      item: itemId,
      roomName: 'Hall',
      itemName: 'Front Door',
      rating: 5,
      ratingLabel: 'EXCELLENT',
      recordedBy: landlord._id,
    });
    await ConditionRecord.create({
      inspection: moveOut._id,
      item: itemId,
      roomName: 'Hall',
      itemName: 'Front Door',
      rating: 5,
      ratingLabel: 'EXCELLENT',
      recordedBy: tenant._id,
    });

    await Inspection.findByIdAndUpdate(moveIn._id, { status: 'LOCKED', lockedAt: new Date() });
    await Inspection.findByIdAndUpdate(moveOut._id, { status: 'LOCKED', lockedAt: new Date() });

    // Generate Report
    const genRes = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/report`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(201);

    expect(genRes.body.success).toBe(true);
    expect(genRes.body.data.status).toBe('READY');
    expect(genRes.body.data.fileUrl).toBeDefined();

    // Stream download report
    const downRes = await request(app)
      .get(`/api/v1/tenancies/${tenancy._id}/report/download`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(200);

    expect(downRes.headers['content-type']).toMatch(/application\/pdf/);
    const pdfMagicNumber = downRes.body.slice(0, 4).toString('ascii');
    expect(pdfMagicNumber).toBe('%PDF');
  });

  test('Shareable report token creation, public access and revocation', async () => {
    // Generate Report
    const moveIn = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
      startedBy: landlord._id,
    });
    const moveOut = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_OUT',
      status: 'DRAFT',
      startedBy: landlord._id,
    });

    await Inspection.findByIdAndUpdate(moveIn._id, { status: 'LOCKED', lockedAt: new Date() });
    await Inspection.findByIdAndUpdate(moveOut._id, { status: 'LOCKED', lockedAt: new Date() });

    await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/report`)
      .set('Authorization', `Bearer ${tokenLandlord}`);

    // Create shareable link
    const shareRes = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/report/share`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(200);

    const { shareToken } = shareRes.body.data;
    expect(shareToken).toBeDefined();

    // Public unauthenticated access
    const pubRes = await request(app).get(`/api/v1/shared/reports/${shareToken}`).expect(200);

    expect(pubRes.body.success).toBe(true);
    expect(pubRes.body.data.status).toBe('READY');

    // Revoke share link
    await request(app)
      .delete(`/api/v1/tenancies/${tenancy._id}/report/share`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(200);

    // Access after revocation should fail 404
    await request(app).get(`/api/v1/shared/reports/${shareToken}`).expect(404);
  });
});
