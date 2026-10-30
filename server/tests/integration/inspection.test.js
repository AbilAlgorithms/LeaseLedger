import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import {
  User,
  Property,
  Room,
  InventoryItem,
  Tenancy,
  Inspection,
  ConditionRecord,
  Photo,
  MeterReading,
  Amendment,
} from '../../src/models/index.js';

let mongoServer;
let landlord, tenant;
let tokenLandlord, tokenTenant;
let property, room, item, tenancy;

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
  await Photo.deleteMany({});
  await MeterReading.deleteMany({});
  await Amendment.deleteMany({});

  // Landlord
  await request(app).post('/api/v1/auth/register').send({
    name: 'Asha Landlord',
    email: 'asha@test.com',
    password: 'Password123',
    role: 'LANDLORD',
  });
  const lLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'asha@test.com',
    password: 'Password123',
  });
  tokenLandlord = lLogin.body.data.accessToken;
  landlord = lLogin.body.data.user;

  // Tenant
  await request(app).post('/api/v1/auth/register').send({
    name: 'Ravi Tenant',
    email: 'ravi@test.com',
    password: 'Password123',
    role: 'TENANT',
  });
  const tLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'ravi@test.com',
    password: 'Password123',
  });
  tokenTenant = tLogin.body.data.accessToken;
  tenant = tLogin.body.data.user;

  // Property, Room, Item
  property = await Property.create({
    landlord: landlord.id,
    address: '12 Park Rd',
    type: 'APARTMENT',
  });
  room = await Room.create({ property: property._id, name: 'Living Room' });
  item = await InventoryItem.create({
    room: room._id,
    property: property._id,
    name: 'Sofa',
    category: 'Furniture',
    quantity: 1,
  });

  // Tenancy with both linked
  tenancy = await Tenancy.create({
    property: property._id,
    landlord: landlord.id,
    tenants: [tenant.id],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'PENDING',
  });
});

describe('Features 4 & 6: Inspection Engine, Dual-Confirmation & Immutability', () => {
  test('Complete Move-In workflow: create, record, meters, dual-confirm, lock & 409 immutability', async () => {
    // 1. Create Move-In inspection
    const createRes = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/inspections`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({ type: 'MOVE_IN' });

    expect(createRes.status).toBe(200);
    expect(createRes.body.data.status).toBe('DRAFT');
    const inspectionId = createRes.body.data.id;

    // Verify condition record was pre-populated for Sofa
    const detailsRes = await request(app)
      .get(`/api/v1/inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${tokenLandlord}`);

    expect(detailsRes.status).toBe(200);
    expect(detailsRes.body.data.records).toHaveLength(1);
    expect(detailsRes.body.data.records[0].itemName).toBe('Sofa');

    // 2. Update Condition Record
    const updateRecRes = await request(app)
      .put(`/api/v1/inspections/${inspectionId}/records/${item._id}`)
      .set('Authorization', `Bearer ${tokenTenant}`)
      .send({
        rating: 4,
        ratingLabel: 'GOOD',
        notes: 'Fabric clean, minor arm wear',
      });

    expect(updateRecRes.status).toBe(200);
    expect(updateRecRes.body.data.rating).toBe(4);

    // 3. Upload Photo with Multer buffer
    const photoBuffer = Buffer.from('fake image file content for testing');
    const photoRes = await request(app)
      .post(`/api/v1/inspections/${inspectionId}/records/${item._id}/photos`)
      .set('Authorization', `Bearer ${tokenTenant}`)
      .attach('photo', photoBuffer, 'sofa.jpg');

    expect(photoRes.status).toBe(201);
    expect(photoRes.body.data.sha256).toBeDefined();
    expect(photoRes.body.data.fileUrl).toBeDefined();

    // 4. Update Electricity Meter Reading
    const meterRes = await request(app)
      .put(`/api/v1/inspections/${inspectionId}/meters/ELECTRICITY`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({
        value: 12450,
        unit: 'kWh',
      });

    expect(meterRes.status).toBe(200);
    expect(meterRes.body.data.value).toBe(12450);

    // 5. Submit inspection to IN_REVIEW
    const submitRes = await request(app)
      .post(`/api/v1/inspections/${inspectionId}/submit`)
      .set('Authorization', `Bearer ${tokenLandlord}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('IN_REVIEW');

    // 6. First Confirmation (Landlord confirms)
    const confirm1 = await request(app)
      .post(`/api/v1/inspections/${inspectionId}/confirm`)
      .set('Authorization', `Bearer ${tokenLandlord}`);

    expect(confirm1.status).toBe(200);
    expect(confirm1.body.locked).toBe(false);

    // 7. Second Confirmation (Tenant confirms -> Atomic Lock!)
    const confirm2 = await request(app)
      .post(`/api/v1/inspections/${inspectionId}/confirm`)
      .set('Authorization', `Bearer ${tokenTenant}`);

    expect(confirm2.status).toBe(200);
    expect(confirm2.body.locked).toBe(true);
    expect(confirm2.body.data.status).toBe('LOCKED');

    // Verify tenancy transitioned to ACTIVE
    const checkTenancy = await Tenancy.findById(tenancy._id);
    expect(checkTenancy.status).toBe('ACTIVE');

    // 8. Immutability check: Attempting update on locked inspection must return 409
    const forbiddenUpdate = await request(app)
      .put(`/api/v1/inspections/${inspectionId}/records/${item._id}`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({ rating: 2 });

    expect(forbiddenUpdate.status).toBe(409);
    expect(forbiddenUpdate.body.error.code).toBe('INSPECTION_LOCKED');

    // 9. Post-lock Amendment
    const amendRes = await request(app)
      .post(`/api/v1/inspections/${inspectionId}/amendments`)
      .set('Authorization', `Bearer ${tokenTenant}`)
      .send({
        reason: 'Correction of note typo',
        target: { model: 'ConditionRecord', id: detailsRes.body.data.records[0].id },
        before: { notes: 'Fabric clean, minor arm wear' },
        after: { notes: 'Fabric clean, minor left arm wear' },
      });

    expect(amendRes.status).toBe(201);
    expect(amendRes.body.data.reason).toBe('Correction of note typo');
  });

  test('Dispute resets status to DRAFT and clears confirmations', async () => {
    // 1. Create and submit inspection
    const ins = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'IN_REVIEW',
      confirmations: [{ user: landlord.id, confirmedAt: new Date() }],
    });
    await ConditionRecord.create({
      inspection: ins._id,
      item: item._id,
      itemName: 'Sofa',
      roomName: 'Living Room',
      rating: 4,
    });

    // 2. Tenant disputes Sofa rating
    const disputeRes = await request(app)
      .post(`/api/v1/inspections/${ins._id}/records/${item._id}/dispute`)
      .set('Authorization', `Bearer ${tokenTenant}`)
      .send({ reason: 'Sofa arm has a large red wine stain not mentioned' });

    expect(disputeRes.status).toBe(200);

    const checkIns = await Inspection.findById(ins._id);
    expect(checkIns.status).toBe('DRAFT');
    expect(checkIns.confirmations).toHaveLength(0);
  });

  test('Move-Out inspection cannot be created if Move-In is not LOCKED', async () => {
    // Move-In still in DRAFT
    await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
    });

    const res = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/inspections`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({ type: 'MOVE_OUT' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MOVE_IN_NOT_LOCKED');
  });
});
