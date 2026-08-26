
// apps/backend/test/app.e2e-spec.ts
import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

describe('Architecture Training API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // We will store these during setup to use across all tests
  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  let adminId: string;
  let managerId: string;
  let userId: string;

  let supportGroupId: string;
  let salesGroupId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Clean the database (order matters for foreign keys)
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    await prisma.group.deleteMany();

    // 2. Create Test Groups
    const supportGroup = await prisma.group.create({ data: { name: 'support-test' } });
    const salesGroup = await prisma.group.create({ data: { name: 'sales-test' } });
    supportGroupId = supportGroup.id;
    salesGroupId = salesGroup.id;

    // 3. Create Test Users
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    
    const admin = await prisma.user.create({
      data: { email: 'admin-test@example.com', passwordHash, role: Role.ADMIN },
    });
    adminId = admin.id;

    const manager = await prisma.user.create({
      data: {
        email: 'manager-test@example.com',
        passwordHash,
        role: Role.MANAGER,
        groups: { connect: [{ id: supportGroupId }] }, // Manager owns support
      },
    });
    managerId = manager.id;

    const user = await prisma.user.create({
      data: {
        email: 'user-test@example.com',
        passwordHash,
        role: Role.USER,
        groups: { connect: [{ id: supportGroupId }, { id: salesGroupId }] },
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // =====================================================================
  // TASK 1: AUTH, USERS, & GROUPS
  // =====================================================================
  describe('Task 1: Auth & Roles', () => {
    it('/auth/login (POST) - fails with bad password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin-test@example.com', password: 'wrong' })
        .expect(401);
    });

    it('/auth/login (POST) - succeeds and returns JWT', async () => {
      // Login Admin
      const resAdmin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin-test@example.com', password: 'TestPass123!' })
        .expect(201);
      adminToken = resAdmin.body.access_token;

      // Login Manager
      const resManager = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'manager-test@example.com', password: 'TestPass123!' })
        .expect(201);
      managerToken = resManager.body.access_token;

      // Login User
      const resUser = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user-test@example.com', password: 'TestPass123!' })
        .expect(201);
      userToken = resUser.body.access_token;
    });

    it('/me (GET) - fails without token', () => {
      return request(app.getHttpServer()).get('/me').expect(401);
    });

    it('/me (GET) - succeeds with token', () => {
      return request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toEqual('user-test@example.com');
        });
    });

    it('/users (GET) - prevents USER access (403)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('/users (GET) - allows ADMIN access', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Task 1: Group Membership', () => {
    it('/groups/:groupId/members (POST/DELETE) - Admin can add/remove members', async () => {
      // Add user to sales group
      await request(app.getHttpServer())
        .post(`/groups/${salesGroupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: managerId })
        .expect(201);

      // Remove user from sales group
      await request(app.getHttpServer())
        .delete(`/groups/${salesGroupId}/members/${managerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // =====================================================================
  // TASK 2: NOTIFICATIONS
  // =====================================================================
  describe('Task 2: Notifications API', () => {
    it('/notifications (POST) - USER cannot create (403)', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hello', body: 'World', userId })
        .expect(403);
    });

    it('/notifications (POST) - MANAGER cannot target groups out of scope (405)', () => {
      // Manager is in support, trying to send to sales
      return request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Secret', body: 'Sales only', groupId: salesGroupId })
        .expect(405);
    });

    it('/notifications (POST) - MANAGER can target their own group', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ title: 'Support Update', body: 'Please review docs', groupId: supportGroupId })
        .expect(201);
    });

    it('/notifications (POST) - ADMIN can target any user directly', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Notice', body: 'Please update password', userId })
        .expect(201);
    });

    it('/notifications (GET) - USER only sees their own scoped notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // User is in 'support' group, so they got the group message AND the direct message from Admin
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((n) => n.recipientUserId === userId)).toBe(true);
    });

    it('/notifications/:id/read (PATCH) - USER can mark their notification as read', async () => {
      // Fetch a notification first
      const getRes = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${userToken}`);
      
      const notifId = getRes.body.data[0].id;

      // Mark as read
      await request(app.getHttpServer())
        .patch(`/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify it's read
      const verifyRes = await request(app.getHttpServer())
        .get(`/notifications/${notifId}`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(verifyRes.body.status).toBe('READ');
    });

    it('/notifications/:id (GET) - MANAGER cannot view notifications out of scope (405)', async () => {
      // Create a notification for a user in 'sales' from Admin
      const adminRes = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Sales target', body: 'Hit your goals', groupId: salesGroupId });
      
      // We need to fetch the actual ID that was generated, let's query it as Admin
      const listRes = await request(app.getHttpServer())
        .get(`/notifications?groupId=${salesGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      const salesNotifId = listRes.body.data[0].id;

      // Manager (in support) tries to view the sales notification
      await request(app.getHttpServer())
        .get(`/notifications/${salesNotifId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(405);
    });
  });
});
