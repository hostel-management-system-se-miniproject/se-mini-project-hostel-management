const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { MemoryStore } = require('express-session');
const { test } = require('node:test');
const { createApp } = require('../src/app');
const { createReportsRouter } = require('../src/routes/reports');

const admin = { id: 'admin', role: 'admin', usn: null };
const student = { id: 'student', role: 'student', usn: 'PES1UG24CS001' };

const studentsList = [
  { _id: 's1', usn: 'PES1UG24CS001', name: 'Alice', email: 'alice@pes.edu', phone: '9000000001' }
];

const mockModels = {
  Student: {
    find: () => ({
      sort: () => ({
        lean: async () => studentsList
      }),
      lean: async () => studentsList
    })
  },
  Allocation: {
    find: () => ({
      lean: async () => [
        { studentId: 's1', roomId: 'r1', status: 'active' }
      ]
    })
  },
  Room: {
    find: () => ({
      lean: async () => [{ _id: 'r1', roomNo: 'A-204', block: 'A', floor: 2 }]
    }),
    findById: (id) => ({
      lean: async () => (id === 'r1' ? { _id: 'r1', roomNo: 'A-204', block: 'A', floor: 2 } : null)
    })
  },
  Fee: {
    find: () => ({
      sort: () => ({
        lean: async () => [
          { studentId: 's1', amountDue: 50000, totalPaid: 20000, dueDate: new Date('2026-12-31') }
        ]
      })
    })
  },
  Complaint: {
    find: () => ({
      sort: () => ({
        lean: async () => [
          {
            _id: 'c1',
            studentId: 's1',
            category: 'Electrical',
            status: 'Resolved',
            description: 'Light not working',
            remarks: 'Fixed bulb',
            createdAt: new Date('2026-10-25')
          }
        ]
      })
    })
  }
};

function buildApp(sessionUser, options = mockModels) {
  const app = express();
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/reports', createReportsRouter(options));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again',
        details: {}
      }
    });
  });
  return app;
}

test('IT-21 unauthenticated request to reports returns 401 SESSION_EXPIRED', async () => {
  const response = await request(buildApp(null)).get('/api/reports/student?format=csv');
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'SESSION_EXPIRED');
});

test('IT-21 student account attempting report export returns 403 FORBIDDEN', async () => {
  const response = await request(buildApp(student)).get('/api/reports/student?format=csv');
  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('rejects unknown report type with 400 VALIDATION_ERROR', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/invalid?format=csv');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('rejects unknown report format with 400 VALIDATION_ERROR', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/student?format=xml');
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('IT-10 admin exports student report as CSV', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/student?format=csv');
  assert.equal(response.status, 200);
  assert.ok(response.headers['content-type'].includes('text/csv'));
  assert.ok(response.headers['content-disposition'].includes('attachment'));
  assert.ok(response.text.includes('usn,name,email,phone,roomNo,block,floor'));
  assert.ok(response.text.includes('PES1UG24CS001,Alice,alice@pes.edu,9000000001,A-204,A,2'));
});

test('IT-10 admin exports fee report as CSV', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/fee?format=csv');
  assert.equal(response.status, 200);
  assert.ok(response.headers['content-type'].includes('text/csv'));
  assert.ok(response.text.includes('usn,studentName,amountDue,totalPaid,balance,dueDate,status'));
  assert.ok(response.text.includes('PES1UG24CS001,Alice,50000.00,20000.00,30000.00,2026-12-31,Partially Paid'));
});

test('IT-10 admin exports complaint report as CSV', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/complaint?format=csv');
  assert.equal(response.status, 200);
  assert.ok(response.headers['content-type'].includes('text/csv'));
  assert.ok(response.text.includes('complaintId,usn,studentName,category,status,description,remarks,createdAt'));
  assert.ok(response.text.includes('PES1UG24CS001,Alice,Electrical,Resolved,Light not working,Fixed bulb'));
});

test('IT-11 admin exports reports as PDF', async () => {
  for (const type of ['student', 'fee', 'complaint']) {
    const response = await request(buildApp(admin))
      .get(`/api/reports/${type}?format=pdf`)
      .buffer(true);
    assert.equal(response.status, 200);
    assert.equal(response.headers['content-type'], 'application/pdf');
    assert.ok(response.headers['content-disposition'].includes('attachment'));
    assert.ok(response.body.slice(0, 4).toString().startsWith('%PDF'));
  }
});

test('supports export endpoint query parameters as used by frontend API', async () => {
  const response = await request(buildApp(admin)).get('/api/reports/export?type=student&format=csv');
  assert.equal(response.status, 200);
  assert.ok(response.headers['content-type'].includes('text/csv'));
  assert.ok(response.text.includes('PES1UG24CS001'));
});

test('the real app mounts and protects the reports route', async () => {
  const app = createApp({
    authConfig: { sessionSecret: 'secret', sessionTimeoutMinutes: 30 },
    loginService: {},
    sessionStore: new MemoryStore()
  });

  const anonymous = await request(app).get('/api/reports/student?format=csv');
  assert.equal(anonymous.status, 401);
});

test('CSV cells that start with a formula character are neutralised', async () => {
  const { toCsv } = require('../src/routes/reports');
  const csv = toCsv(['a', 'b', 'c'], [{ a: '=HYPERLINK("x")', b: '-5+2', c: 'plain, text' }]);
  assert.ok(csv.includes("\"'=HYPERLINK(\"\"x\"\")\""));
  assert.ok(csv.includes(",'-5+2,"));
  assert.ok(csv.includes('"plain, text"'));
});
