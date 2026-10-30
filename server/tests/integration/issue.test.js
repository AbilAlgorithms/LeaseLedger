import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User, Property, Tenancy, IssueReport, Notification } from '../../src/models/index.js';

let mongoServer;
let landlord, tenant;
let tokenLandlord, tokenTenant;
let tenancy;

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
  await IssueReport.deleteMany({});
  await Notification.deleteMany({});

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

  // Property & Tenancy
  const property = await Property.create({
    landlord: landlord.id,
    address: '12 Park Rd',
    type: 'APARTMENT',
  });
  tenancy = await Tenancy.create({
    property: property._id,
    landlord: landlord.id,
    tenants: [tenant.id],
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    status: 'ACTIVE',
  });
});

describe('Features 5 & 9: Mid-Tenancy Issues & Notification Center', () => {
  test('Tenant reports issue with photo, landlord is notified, and status transitions to RESOLVED', async () => {
    // 1. Tenant logs issue with photo attachment
    const fakePhoto = Buffer.from('fake photo evidence for issue');
    const issueRes = await request(app)
      .post(`/api/v1/tenancies/${tenancy._id}/issues`)
      .set('Authorization', `Bearer ${tokenTenant}`)
      .field('title', 'Kitchen Sink Faucet Leaking')
      .field('description', 'Steady drip under the sink basin after washing dishes')
      .attach('photos', fakePhoto, 'leak.jpg');

    expect(issueRes.status).toBe(201);
    expect(issueRes.body.data.title).toBe('Kitchen Sink Faucet Leaking');
    expect(issueRes.body.data.photos).toHaveLength(1);
    expect(issueRes.body.data.photos[0].sha256).toBeDefined();
    const issueId = issueRes.body.data.id;

    // 2. Verify Landlord received in-app notification
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenLandlord}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.meta.unreadCount).toBe(1);
    expect(notifRes.body.data[0].type).toBe('ISSUE_REPORTED');
    const notifId = notifRes.body.data[0].id;

    // 3. Mark notification as read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${tokenLandlord}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.data.isRead).toBe(true);

    // 4. Landlord resolves the issue
    const resolveRes = await request(app)
      .patch(`/api/v1/issues/${issueId}/status`)
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .send({
        status: 'RESOLVED',
        resolutionNotes: 'Plumber replaced washer on 15 Feb',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('RESOLVED');
    expect(resolveRes.body.data.resolvedAt).toBeDefined();

    // 5. Verify Tenant received resolution notification
    const tenantNotifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${tokenTenant}`);

    expect(tenantNotifRes.status).toBe(200);
    expect(tenantNotifRes.body.data.some((n) => n.type === 'ISSUE_STATUS_UPDATED')).toBe(true);

    // 6. Mark all as read
    const markAllRes = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${tokenTenant}`);

    expect(markAllRes.status).toBe(200);
  });
});
