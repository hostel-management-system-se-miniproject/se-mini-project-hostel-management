// HMS-16 (UT-24, UT-25, IT-22): admin lists and decides leave requests. No MongoDB needed.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const request = require('supertest');
const { createLeavesRouter } = require('../src/routes/leaves');

const ID1 = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const ID2 = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const ID3 = 'aaaaaaaaaaaaaaaaaaaaaaa3';
const MISSING = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const adminUser = { id: 'admin-1', role: 'admin', usn: null };
const student1 = { id: 'user-1', role: 'student', usn: 'PES1UG24CS001' };
const student2 = { id: 'user-2', role: 'student', usn: 'PES1UG24CS002' };

function createModels() {
  const students = [
    { _id: 's1', userId: 'user-1', usn: 'PES1UG24CS001', name: 'Asha Rao' },
    { _id: 's2', userId: 'user-2', usn: 'PES1UG24CS002', name: 'Ravi Kumar' }
  ];
  const leaves = [
    { _id: ID1, studentId: 's1', startDate: new Date('2026-11-01'), endDate: new Date('2026-11-05'), reason: 'Family function', status: 'Pending', createdAt: new Date('2026-10-20T09:00:00Z'), decidedAt: null },
    { _id: ID2, studentId: 's2', startDate: new Date('2026-11-10'), endDate: new Date('2026-11-12'), reason: 'Medical', status: 'Pending', createdAt: new Date('2026-10-21T09:00:00Z'), decidedAt: null },
    { _id: ID3, studentId: 's1', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-02'), reason: 'Exam travel', status: 'Approved', createdAt: new Date('2026-09-01T09:00:00Z'), decidedAt: new Date('2026-09-02T09:00:00Z'), decidedBy: 'admin-1' }
  ];

  const chain = (value) => ({ select() { return this; }, sort() { return this; }, lean: async () => value });

  const Student = {
    students,
    findOne: ({ userId }) => chain(students.find((item) => item.userId === userId) || null),
    findById: (id) => chain(students.find((item) => item._id === id) || null),
    find: (filter) => chain(students.filter((item) => filter._id.$in.includes(item._id)))
  };

  const Leave = {
    leaves,
    updateCalls: 0,
    find: (filter) => {
      const matching = leaves.filter((item) => !filter.status || item.status === filter.status);
      return { sort: () => ({ lean: async () => [...matching].sort((a, b) => b.createdAt - a.createdAt) }) };
    },
    findById: (id) => chain(leaves.find((item) => item._id === id) || null),
    // Only updates a request that still matches the filter, like the real conditional update.
    findOneAndUpdate: (filter, update) => {
      Leave.updateCalls += 1;
      const found = leaves.find((item) => item._id === filter._id && item.status === filter.status);
      if (found) Object.assign(found, update.$set);
      return chain(found ? { ...found } : null);
    }
  };

  return { Leave, Student };
}

function buildApp(sessionUser, models) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/leaves', createLeavesRouter(models));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  });
  return app;
}

test('GET /api/leaves lists every request newest first with the student USN and name', async () => {
  const response = await request(buildApp(adminUser, createModels())).get('/api/leaves');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.map((item) => item.id), [ID2, ID1, ID3]);
  assert.equal(response.body.data[0].usn, 'PES1UG24CS002');
  assert.equal(response.body.data[0].studentName, 'Ravi Kumar');
  assert.equal(response.body.data[1].startDate, '2026-11-01');
});

test('GET /api/leaves supports the status filter and rejects an unknown status', async () => {
  const app = buildApp(adminUser, createModels());

  const pending = await request(app).get('/api/leaves?status=Pending');
  assert.deepEqual(pending.body.data.map((item) => item.id), [ID2, ID1]);

  const approved = await request(app).get('/api/leaves?status=Approved');
  assert.deepEqual(approved.body.data.map((item) => item.id), [ID3]);

  const rejected = await request(app).get('/api/leaves?status=Rejected');
  assert.deepEqual(rejected.body.data, []);

  const bad = await request(app).get('/api/leaves?status=Maybe');
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'VALIDATION_ERROR');
});

test('a student cannot list all leave requests or decide one (403)', async () => {
  const models = createModels();
  const app = buildApp(student1, models);

  assert.equal((await request(app).get('/api/leaves')).status, 403);
  const decide = await request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' });
  assert.equal(decide.status, 403);
  assert.equal(models.Leave.leaves[0].status, 'Pending');
  assert.equal(models.Leave.updateCalls, 0);
});

test('without a session the admin endpoints return 401', async () => {
  const app = buildApp(null, createModels());

  assert.equal((await request(app).get('/api/leaves')).status, 401);
  assert.equal((await request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' })).status, 401);
  assert.equal((await request(app).get(`/api/leaves/${ID1}`)).status, 401);
});

test('UT-24 an admin approves a Pending request', async () => {
  const models = createModels();
  const response = await request(buildApp(adminUser, models)).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, ID1);
  assert.equal(response.body.data.status, 'Approved');
  assert.ok(response.body.data.decidedAt);
  assert.equal(models.Leave.leaves[0].status, 'Approved');
  assert.equal(models.Leave.leaves[0].decidedBy, 'admin-1');
});

test('UT-25 an admin rejects a Pending request', async () => {
  const models = createModels();
  const response = await request(buildApp(adminUser, models)).put(`/api/leaves/${ID2}/decision`).send({ decision: 'Rejected' });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.status, 'Rejected');
  assert.equal(models.Leave.leaves[1].status, 'Rejected');
});

test('IT-22 deciding an already decided request returns 409 ALREADY_DECIDED and changes nothing', async () => {
  const models = createModels();
  const app = buildApp(adminUser, models);

  const first = await request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' });
  assert.equal(first.status, 200);
  const decidedAt = models.Leave.leaves[0].decidedAt;

  const second = await request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Rejected' });
  assert.equal(second.status, 409);
  assert.equal(second.body.error.code, 'ALREADY_DECIDED');
  assert.equal(models.Leave.leaves[0].status, 'Approved');
  assert.equal(models.Leave.leaves[0].decidedAt, decidedAt);

  const seeded = await request(app).put(`/api/leaves/${ID3}/decision`).send({ decision: 'Rejected' });
  assert.equal(seeded.status, 409);
});

test('two admins deciding at the same moment produce exactly one winner', async () => {
  const models = createModels();
  const app = buildApp(adminUser, models);

  const [a, b] = await Promise.all([
    request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' }),
    request(app).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Rejected' })
  ]);

  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test('a missing or invalid decision returns 400 without touching the request', async () => {
  const models = createModels();
  const app = buildApp(adminUser, models);

  for (const body of [{}, { decision: '' }, { decision: 'Pending' }, { decision: 'approve' }, { decision: 42 }]) {
    const response = await request(app).put(`/api/leaves/${ID1}/decision`).send(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(models.Leave.leaves[0].status, 'Pending');
  assert.equal(models.Leave.updateCalls, 0);
});

test('an unknown or malformed id returns 404 NOT_FOUND', async () => {
  const app = buildApp(adminUser, createModels());

  assert.equal((await request(app).put(`/api/leaves/${MISSING}/decision`).send({ decision: 'Approved' })).status, 404);
  assert.equal((await request(app).put('/api/leaves/not-an-id/decision').send({ decision: 'Approved' })).status, 404);
  assert.equal((await request(app).get(`/api/leaves/${MISSING}`)).status, 404);
  assert.equal((await request(app).get('/api/leaves/not-an-id')).status, 404);
});

test('GET /api/leaves/{id} works for the owner and for an admin, but not for another student', async () => {
  const models = createModels();

  const owner = await request(buildApp(student1, models)).get(`/api/leaves/${ID1}`);
  assert.equal(owner.status, 200);
  assert.equal(owner.body.data.usn, 'PES1UG24CS001');
  assert.equal(owner.body.data.status, 'Pending');

  const admin = await request(buildApp(adminUser, models)).get(`/api/leaves/${ID1}`);
  assert.equal(admin.status, 200);

  const other = await request(buildApp(student2, models)).get(`/api/leaves/${ID1}`);
  assert.equal(other.status, 403);
  assert.equal(other.body.data, undefined);
});

test('the student sees the new status right after the admin decides (ST-05)', async () => {
  const models = createModels();
  await request(buildApp(adminUser, models)).put(`/api/leaves/${ID1}/decision`).send({ decision: 'Approved' });

  const mine = await request(buildApp(student1, models)).get(`/api/leaves/${ID1}`);
  assert.equal(mine.body.data.status, 'Approved');
  assert.ok(mine.body.data.decidedAt);
});

test('/mine is still matched before /:id', async () => {
  const models = createModels();
  models.Leave.find = (filter) => ({ sort: () => ({ lean: async () => models.Leave.leaves.filter((item) => item.studentId === filter.studentId) }) });
  const response = await request(buildApp(student1, models)).get('/api/leaves/mine');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.length, 2);
});

test('a database failure returns the safe 500 body', async () => {
  const models = createModels();
  models.Leave.find = () => { throw new Error('secret database detail'); };
  const response = await request(buildApp(adminUser, models)).get('/api/leaves');

  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
});
