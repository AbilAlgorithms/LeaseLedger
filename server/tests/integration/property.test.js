import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User, Property, Room, InventoryItem, Tenancy, Inspection, ConditionRecord } from '../../src/models/index.js';

let mongoServer;
let landlordA, landlordB, tenant;
let tokenA, tokenB, tokenTenant;

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

  // Seed Landlord A
  const resA = await request(app).post('/api/v1/auth/register').send({
    name: 'Asha Landlord',
    email: 'asha@test.com',
    password: 'Password123',
    role: 'LANDLORD',
  });
  const loginA = await request(app).post('/api/v1/auth/login').send({
    email: 'asha@test.com',
    password: 'Password123',
  });
  tokenA = loginA.body.data.accessToken;
  landlordA = loginA.body.data.user;

  // Seed Landlord B
  const resB = await request(app).post('/api/v1/auth/register').send({
    name: 'Other Landlord',
    email: 'other@test.com',
    password: 'Password123',
    role: 'LANDLORD',
  });
  const loginB = await request(app).post('/api/v1/auth/login').send({
    email: 'other@test.com',
    password: 'Password123',
  });
  tokenB = loginB.body.data.accessToken;
  landlordB = loginB.body.data.user;

  // Seed Tenant
  const resT = await request(app).post('/api/v1/auth/register').send({
    name: 'Ravi Tenant',
    email: 'ravi@test.com',
    password: 'Password123',
    role: 'TENANT',
  });
  const loginT = await request(app).post('/api/v1/auth/login').send({
    email: 'ravi@test.com',
    password: 'Password123',
  });
  tokenTenant = loginT.body.data.accessToken;
  tenant = loginT.body.data.user;
});

describe('Feature 2: Property, Room & Inventory Management API', () => {
  test('Landlord creates property, rooms and items successfully', async () => {
    // 1. Create property
    const propRes = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'flat12',
        address: '12 Park Rd',
        type: 'APARTMENT',
      });

    expect(propRes.status).toBe(201);
    expect(propRes.body.data.address).toBe('12 Park Rd');
    const propertyId = propRes.body.data.id;

    // 2. Add Room
    const roomRes = await request(app)
      .post(`/api/v1/properties/${propertyId}/rooms`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Living Room' });

    expect(roomRes.status).toBe(201);
    expect(roomRes.body.data.name).toBe('Living Room');
    const roomId = roomRes.body.data.id;

    // 3. Add Inventory Item
    const itemRes = await request(app)
      .post(`/api/v1/rooms/${roomId}/items`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Sofa',
        category: 'Furniture',
        quantity: 1,
        description: 'Grey fabric 3-seater',
      });

    expect(itemRes.status).toBe(201);
    expect(itemRes.body.data.name).toBe('Sofa');

    // 4. Retrieve Property Detail
    const detailRes = await request(app)
      .get(`/api/v1/properties/${propertyId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.rooms).toHaveLength(1);
    expect(detailRes.body.data.rooms[0].items).toHaveLength(1);
    expect(detailRes.body.data.rooms[0].items[0].name).toBe('Sofa');
  });

  test('Tenant cannot create a property (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${tokenTenant}`)
      .send({
        address: '100 Main St',
        type: 'HOUSE',
      });

    expect(res.status).toBe(403);
  });

  test('Landlord B cannot edit Landlord A property (403 Forbidden)', async () => {
    const propRes = await request(app)
      .post('/api/v1/properties')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        address: '12 Park Rd',
        type: 'APARTMENT',
      });

    const propertyId = propRes.body.data.id;

    const editRes = await request(app)
      .patch(`/api/v1/properties/${propertyId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijacked Name' });

    expect(editRes.status).toBe(403);
    expect(editRes.body.error.code).toBe('NOT_PROPERTY_OWNER');
  });

  test('Deleting item referenced in inspection marks it archived rather than hard deleting', async () => {
    const prop = await Property.create({
      landlord: landlordA.id,
      address: '12 Park Rd',
      type: 'APARTMENT',
    });
    const room = await Room.create({ property: prop._id, name: 'Living Room' });
    const item = await InventoryItem.create({
      room: room._id,
      property: prop._id,
      name: 'Sofa',
      quantity: 1,
    });
    const tenancy = await Tenancy.create({
      property: prop._id,
      landlord: landlordA.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
    });
    // Create draft inspection first, add condition record, then lock it
    const inspection = await Inspection.create({
      tenancy: tenancy._id,
      type: 'MOVE_IN',
      status: 'DRAFT',
    });
    await ConditionRecord.create({
      inspection: inspection._id,
      item: item._id,
      itemName: 'Sofa',
      roomName: 'Living Room',
      rating: 4,
    });
    inspection.status = 'LOCKED';
    await inspection.save();

    // Delete request on referenced item
    const delRes = await request(app)
      .delete(`/api/v1/items/${item._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.archived).toBe(true);

    const checkItem = await InventoryItem.findById(item._id);
    expect(checkItem.archived).toBe(true);
  });
});
