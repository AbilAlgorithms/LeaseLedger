import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User, Config, AuditLog } from '../../src/models/index.js';

let mongoServer;
let admin, landlord, tenant;
let tokenAdmin, tokenLandlord, tokenTenant;

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
  await Config.deleteMany({});
  await AuditLog.deleteMany({});

  // 1. Create Admin directly (since public registration rejects ADMIN role for security)
  await User.create({
    name: 'System Admin',
    email: 'admin@leaseledger.test',
    passwordHash: 'AdminPassword123',
    role: 'ADMIN',
    emailVerified: true,
  });
  const aLogin = await request(app).post('/api/v1/auth/login').send({
    email: 'admin@leaseledger.test',
    password: 'AdminPassword123',
  });
  tokenAdmin = aLogin.body.data.accessToken;
  admin = aLogin.body.data.user;

  // 2. Create Landlord
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

  // 3. Create Tenant
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
});

describe('Feature 10: System Administration & Compliance', () => {
  test('Access Control: Non-admins cannot access admin endpoints', async () => {
    // Unauthenticated
    await request(app).get('/api/v1/admin/users').expect(401);

    // Landlord
    await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokenLandlord}`)
      .expect(403);

    // Tenant
    await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokenTenant}`)
      .expect(403);
  });

  test('Admin can list users with pagination, search and role filter', async () => {
    // List all users
    const resAll = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(resAll.body.data.pagination.total).toBe(3);
    expect(resAll.body.data.users.length).toBe(3);

    // Search by name
    const resSearch = await request(app)
      .get('/api/v1/admin/users?search=Ravi')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(resSearch.body.data.users.length).toBe(1);
    expect(resSearch.body.data.users[0].name).toBe('Ravi Tenant');

    // Filter by role
    const resLandlords = await request(app)
      .get('/api/v1/admin/users?role=LANDLORD')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(resLandlords.body.data.users.length).toBe(1);
    expect(resLandlords.body.data.users[0].email).toBe('asha@leaseledger.test');
  });

  test('Admin user suspension and reinstatement lifecycle', async () => {
    // 1. Suspend Tenant
    const suspRes = await request(app)
      .patch(`/api/v1/admin/users/${tenant.id}/suspend`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(suspRes.body.data.isActive).toBe(false);

    // 2. Tenant tries to make authenticated API call -> 403 ACCOUNT_SUSPENDED
    await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${tokenTenant}`)
      .expect(403);

    // 3. Tenant tries to login -> 403 ACCOUNT_SUSPENDED
    const loginFail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ravi@leaseledger.test', password: 'Password123' })
      .expect(403);

    expect(loginFail.body.error.code).toBe('ACCOUNT_SUSPENDED');

    // 4. Reinstate Tenant
    const reinstRes = await request(app)
      .patch(`/api/v1/admin/users/${tenant.id}/reinstate`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(reinstRes.body.data.isActive).toBe(true);

    // 5. Tenant logs in successfully
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ravi@leaseledger.test', password: 'Password123' })
      .expect(200);
  });

  test('Admin cannot suspend self or another admin', async () => {
    await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/suspend`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400);
  });

  test('Global configuration read, update and persistence', async () => {
    // Read default condition scale
    const defScale = await request(app)
      .get('/api/v1/admin/config/conditionScale')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(defScale.body.data.value['5']).toBe('EXCELLENT');

    // Update condition scale
    const customScale = {
      5: 'PRISTINE',
      4: 'SATISFACTORY',
      3: 'MODERATE_WEAR',
      2: 'DAMAGED',
      1: 'UNINHABITABLE',
    };

    const updateRes = await request(app)
      .put('/api/v1/admin/config/conditionScale')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        value: customScale,
        description: 'Updated standard condition scale for high-end properties',
      })
      .expect(200);

    expect(updateRes.body.data.value['5']).toBe('PRISTINE');

    // Fetch updated config
    const fetchRes = await request(app)
      .get('/api/v1/admin/config/conditionScale')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(fetchRes.body.data.value['5']).toBe('PRISTINE');
  });

  test('Audit log tracking and query filter', async () => {
    // Trigger an audited action (suspend user)
    await request(app)
      .patch(`/api/v1/admin/users/${tenant.id}/suspend`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    // Query audit logs
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs?action=USER_SUSPENDED')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(auditRes.body.data.logs.length).toBeGreaterThanOrEqual(1);
    expect(auditRes.body.data.logs[0].action).toBe('USER_SUSPENDED');
    expect(auditRes.body.data.logs[0].user.email).toBe('admin@leaseledger.test');
  });

  test('Admin platform stats overview', async () => {
    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(statsRes.body.data.users.total).toBe(3);
    expect(statsRes.body.data.users.landlords).toBe(1);
    expect(statsRes.body.data.users.tenants).toBe(1);
  });
});
