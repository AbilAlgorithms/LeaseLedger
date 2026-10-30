import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app.js';
import { User } from '../../src/models/index.js';

let mongoServer;

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
});

describe('Feature 1: Authentication & User Management API', () => {
  test('POST /api/v1/auth/register creates user and returns verification token in dev', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Asha Landlord',
        email: 'asha@leaseledger.test',
        password: 'Password123',
        role: 'LANDLORD',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('asha@leaseledger.test');
    expect(res.body.data.user.role).toBe('LANDLORD');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.verifyToken).toBeDefined();

    // Verify email with the returned token
    const verifyRes = await request(app).get(`/api/v1/auth/verify-email/${res.body.data.verifyToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);

    const userInDb = await User.findOne({ email: 'asha@leaseledger.test' });
    expect(userInDb.emailVerified).toBe(true);
  });

  test('POST /api/v1/auth/login authenticates user and sets refresh cookie', async () => {
    // Seed user
    const user = await User.create({
      name: 'Ravi Tenant',
      email: 'ravi@leaseledger.test',
      passwordHash: 'Password123',
      role: 'TENANT',
      emailVerified: true,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ravi@leaseledger.test',
        password: 'Password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.name).toBe('Ravi Tenant');

    // Verify cookie was set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/jwt_refresh=/);
  });

  test('POST /api/v1/auth/refresh rotates tokens', async () => {
    await User.create({
      name: 'Ravi',
      email: 'ravi@leaseledger.test',
      passwordHash: 'Password123',
      role: 'TENANT',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ravi@leaseledger.test', password: 'Password123' });

    const cookie = loginRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.headers['set-cookie']).toBeDefined();
  });

  test('GET /api/v1/users/me returns authenticated user profile', async () => {
    await User.create({
      name: 'Asha',
      email: 'asha@leaseledger.test',
      passwordHash: 'Password123',
      role: 'LANDLORD',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'asha@leaseledger.test', password: 'Password123' });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.name).toBe('Asha');
    expect(meRes.body.data.role).toBe('LANDLORD');
  });

  test('Suspended account is blocked from logging in with 403', async () => {
    await User.create({
      name: 'Suspended User',
      email: 'bad@leaseledger.test',
      passwordHash: 'Password123',
      role: 'TENANT',
      isActive: false, // Suspended
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bad@leaseledger.test', password: 'Password123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  test('Password reset flow works end-to-end', async () => {
    await User.create({
      name: 'Reset Test',
      email: 'reset@leaseledger.test',
      passwordHash: 'OldPassword123',
      role: 'TENANT',
    });

    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'reset@leaseledger.test' });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.resetToken;
    expect(resetToken).toBeDefined();

    const resetRes = await request(app)
      .post(`/api/v1/auth/reset-password/${resetToken}`)
      .send({ password: 'NewPassword999' });

    expect(resetRes.status).toBe(200);

    // Verify login with new password
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'reset@leaseledger.test', password: 'NewPassword999' });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.data.accessToken).toBeDefined();
  });

  test('GDPR export and anonymization endpoints function correctly', async () => {
    await User.create({
      name: 'Export User',
      email: 'export@leaseledger.test',
      passwordHash: 'Password123',
      role: 'TENANT',
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'export@leaseledger.test', password: 'Password123' });

    const token = loginRes.body.data.accessToken;

    const exportRes = await request(app)
      .get('/api/v1/users/me/export')
      .set('Authorization', `Bearer ${token}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.data.user.email).toBe('export@leaseledger.test');

    const deleteRes = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const userInDb = await User.findById(loginRes.body.data.user.id);
    expect(userInDb.name).toBe('Deactivated User');
    expect(userInDb.isActive).toBe(false);
  });
});
