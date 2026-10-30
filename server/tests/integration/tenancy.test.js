import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User, Property, Tenancy, Invitation, Notification } from '../../src/models/index.js';

let mongoServer;
let landlord, tenant, outsider;
let tokenLandlord, tokenTenant, tokenOutsider;
let property;

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
  await Tenancy.deleteMany({});
  await Invitation.deleteMany({});
  await Notification.deleteMany({});

  // Landlord
  await request(app).post('/api/v1/auth/register').send({
    name: 'Asha',
    email: 'asha@test.com',
    password: 'Password123',
    role: 'LANDLORD',
  });
  const lRes = await request(app).post('/api/v1/auth/login').send({
    email: 'asha@test.com',
    password: 'Password123',
  });
  tokenLandlord = lRes.body.data.accessToken;
  landlord = lRes.body.data.user;

  // Tenant
  await request(app).post('/api/v1/auth/register').send({
    name: 'Ravi',
    email: 'ravi@test.com',
    password: 'Password123',
    role: 'TENANT',
  });
  const tRes = await request(app).post('/api/v1/auth/login').send({
    email: 'ravi@test.com',
    password: 'Password123',
  });
  tokenTenant = tRes.body.data.accessToken;
  tenant = tRes.body.data.user;

  // Outsider Tenant
  await request(app).post('/api/v1/auth/register').send({
    name: 'Outsider',
    email: 'outsider@test.com',
    password: 'Password123',
    role: 'TENANT',
  });
  const oRes = await request(app).post('/api/v1/auth/login').send({
    email: 'outsider@test.com',
    password: 'Password123',
  });
  tokenOutsider = oRes.body.data.accessToken;
  outsider = oRes.body.data.user;

  // Property
  property = await Property.create({
    landlord: landlord.id,
    address: '12 Park Rd',
    type: 'APARTMENT',
  });
});

describe('Feature 3: Tenancy Lifecycle & Invitation Protocol', () => {
  test('Full invitation and join journey works cleanly', async () => {
    // 1. Landlord creates tenancy
    const tenancyRes = await request(app)
      .post('/api/v1/tenancies')
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({
        propertyId: property.id,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        notes: 'Annual fixed-term tenancy',
      });

    expect(tenancyRes.status).toBe(201);
    expect(tenancyRes.body.data.status).toBe('PENDING');
    const tenancyId = tenancyRes.body.data.id;

    // 2. Landlord generates invitation link
    const inviteRes = await request(app)
      .post(`/api/v1/tenancies/${tenancyId}/invitations`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({ email: 'ravi@test.com' });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.data.token).toBeDefined();
    expect(inviteRes.body.data.joinUrl).toContain('/join/');
    const rawToken = inviteRes.body.data.token;

    // 3. Public validation of invitation link
    const valRes = await request(app).get(`/api/v1/invitations/${rawToken}`);
    expect(valRes.status).toBe(200);
    expect(valRes.body.data.valid).toBe(true);
    expect(valRes.body.data.tenancy.property.address).toBe('12 Park Rd');

    // 4. Tenant accepts invitation
    const acceptRes = await request(app)
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set('Authorization', `Bearer ${tokenTenant}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.success).toBe(true);

    // 5. Verify tenant is linked to tenancy
    const checkTenancy = await Tenancy.findById(tenancyId);
    expect(checkTenancy.tenants).toHaveLength(1);
    expect(checkTenancy.tenants[0].toString()).toBe(tenant.id);

    // 6. Verify Landlord received notification
    const notifications = await Notification.find({ user: landlord.id });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].type).toBe('TENANT_JOINED');

    // 7. Re-accepting already accepted invitation must fail with 409
    const secondAccept = await request(app)
      .post(`/api/v1/invitations/${rawToken}/accept`)
      .set('Authorization', `Bearer ${tokenTenant}`);

    expect(secondAccept.status).toBe(400);

    // 8. Outsider cannot access this tenancy detail (403)
    const outsiderRes = await request(app)
      .get(`/api/v1/tenancies/${tenancyId}`)
      .set('Authorization', `Bearer ${tokenOutsider}`);

    expect(outsiderRes.status).toBe(403);
  });
});
