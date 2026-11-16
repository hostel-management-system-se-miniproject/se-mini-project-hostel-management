const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const request = require('supertest');
const { getNotificationConfig } = require('../src/config/notifications');
const { createSendMail } = require('../src/services/mailer');
const { runFeeNotifications, createFeeNotifier } = require('../src/services/feeNotificationService');
const { startFeeNotificationJob } = require('../src/jobs/feeNotificationJob');
const { createAdminRouter } = require('../src/routes/admin');

// Small fake models and a fake mail sender: no database and no real email.
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-31T09:00:00.000Z');
const silentLogger = { log() {}, error() {} };

function daysFromNow(days) {
  return new Date(Date.UTC(2026, 9, 31) + days * DAY);
}

function matches(fee, filter) {
  if (filter._id !== undefined && fee._id !== filter._id) return false;
  if (filter.$or) {
    return filter.$or.some((clause) => {
      if (clause.lastNotifiedOn === null) return fee.lastNotifiedOn === null;
      if (clause.lastNotifiedOn && clause.lastNotifiedOn.$lt) {
        return fee.lastNotifiedOn !== null && fee.lastNotifiedOn < clause.lastNotifiedOn.$lt;
      }
      return false;
    });
  }
  return true;
}

function createFakes({ fees = [], students = [] } = {}) {
  const store = fees.map((fee) => ({ lastNotifiedOn: null, totalPaid: 0, ...fee }));
  const Fee = {
    store,
    find: (filter) => ({
      lean: async () => store
        .filter((fee) => fee.dueDate >= filter.dueDate.$gte && fee.dueDate < filter.dueDate.$lt)
        .map((fee) => ({ ...fee }))
    }),
    updateOne: async (filter, update) => {
      const fee = store.find((item) => matches(item, filter));
      if (!fee) return { modifiedCount: 0 };
      fee.lastNotifiedOn = update.$set.lastNotifiedOn;
      return { modifiedCount: 1 };
    }
  };
  const Student = {
    find: () => ({
      select: () => ({ lean: async () => students })
    })
  };
  const sent = [];
  const sendMail = async (message) => { sent.push(message); };
  return { Fee, Student, sent, sendMail };
}

const student5 = { _id: 's5', name: 'Student 5', email: 'student5@pes.edu' };
const student6 = { _id: 's6', name: 'Student 6', email: 'student6@pes.edu' };

function run(fakes, extra = {}) {
  return runFeeNotifications({
    Fee: fakes.Fee, Student: fakes.Student, sendMail: fakes.sendMail, now: NOW, logger: silentLogger, ...extra
  });
}

test('notification settings are off without SMTP_HOST and use defaults when on', () => {
  assert.equal(getNotificationConfig({}).enabled, false);
  assert.equal(getNotificationConfig({ SMTP_HOST: '   ' }).enabled, false);

  const config = getNotificationConfig({ SMTP_HOST: 'smtp.example.test', SMTP_USER: 'inbox' });
  assert.equal(config.enabled, true);
  assert.equal(config.port, 587);
  assert.equal(config.secure, false);
  assert.equal(config.from, 'inbox');
  assert.equal(getNotificationConfig({ SMTP_HOST: 'h', SMTP_PORT: '465' }).secure, true);
});

test('the mailer passes the SMTP settings to the transport and sends one message', async () => {
  let transportOptions = null;
  const delivered = [];
  const sendMail = createSendMail(
    getNotificationConfig({ SMTP_HOST: 'smtp.example.test', SMTP_PORT: '2525', SMTP_USER: 'u', SMTP_PASS: 'p', SMTP_FROM: 'hostel@pes.edu' }),
    { createTransport: (options) => { transportOptions = options; return { sendMail: async (message) => delivered.push(message) }; } }
  );

  await sendMail({ to: 'a@pes.edu', subject: 'Subject', text: 'Body' });

  assert.deepEqual(transportOptions, { host: 'smtp.example.test', port: 2525, secure: false, auth: { user: 'u', pass: 'p' } });
  assert.deepEqual(delivered, [{ from: 'hostel@pes.edu', to: 'a@pes.edu', subject: 'Subject', text: 'Body' }]);
});

test('IT-07 a fee with a balance due in 5 days sends one email', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }], students: [student5] });

  const result = await run(fakes);

  assert.deepEqual(result, { sent: 1, failed: 0 });
  assert.equal(fakes.sent.length, 1);
  assert.equal(fakes.sent[0].to, 'student5@pes.edu');
  assert.match(fakes.sent[0].subject, /Hostel fee due on 5 Nov 2026/);
  assert.match(fakes.sent[0].text, /Rs\. 5000/);
  assert.deepEqual(fakes.Fee.store[0].lastNotifiedOn, NOW);
});

test('the balance in the email is the amount still unpaid', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, totalPaid: 1500, dueDate: daysFromNow(3) }], students: [student5] });

  await run(fakes);

  assert.match(fakes.sent[0].text, /Rs\. 3500/);
});

test('IT-17 a due date far away sends nothing', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f6', studentId: 's6', amountDue: 5000, dueDate: daysFromNow(20) }], students: [student6] });

  assert.deepEqual(await run(fakes), { sent: 0, failed: 0 });
  assert.equal(fakes.sent.length, 0);
  assert.equal(fakes.Fee.store[0].lastNotifiedOn, null);
});

test('the window includes today and 7 days ahead, but not 8 days or yesterday', async () => {
  const fees = [
    { _id: 'today', studentId: 's5', amountDue: 100, dueDate: daysFromNow(0) },
    { _id: 'd7', studentId: 's5', amountDue: 100, dueDate: daysFromNow(7) },
    { _id: 'd8', studentId: 's5', amountDue: 100, dueDate: daysFromNow(8) },
    { _id: 'past', studentId: 's5', amountDue: 100, dueDate: daysFromNow(-1) }
  ];
  const fakes = createFakes({ fees, students: [student5] });

  const result = await run(fakes);

  assert.equal(result.sent, 2);
  const notified = fakes.Fee.store.filter((fee) => fee.lastNotifiedOn !== null).map((fee) => fee._id);
  assert.deepEqual(notified.sort(), ['d7', 'today']);
});

test('a fully paid fee sends nothing', async () => {
  const fakes = createFakes({ fees: [{ _id: 'paid', studentId: 's5', amountDue: 5000, totalPaid: 5000, dueDate: daysFromNow(2) }], students: [student5] });

  assert.deepEqual(await run(fakes), { sent: 0, failed: 0 });
  assert.equal(fakes.sent.length, 0);
});

test('a second run for the same due date sends nothing more', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }], students: [student5] });

  assert.equal((await run(fakes)).sent, 1);
  assert.equal((await run(fakes)).sent, 0);
  assert.equal(fakes.sent.length, 1);
});

test('a student notified for an earlier due date is notified again for a new one', async () => {
  const fakes = createFakes({
    fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5), lastNotifiedOn: daysFromNow(-60) }],
    students: [student5]
  });

  assert.equal((await run(fakes)).sent, 1);
});

test('two runs at the same moment email the student only once', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }], students: [student5] });

  const results = await Promise.all([run(fakes), run(fakes)]);

  assert.equal(results[0].sent + results[1].sent, 1);
  assert.equal(fakes.sent.length, 1);
});

test('a failed send is counted as failed, not sent, and is retried on the next run', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }], students: [student5] });
  const errors = [];

  const failing = await run(fakes, {
    sendMail: async () => { throw new Error('SMTP down'); },
    logger: { log() {}, error: (message) => errors.push(message) }
  });

  assert.deepEqual(failing, { sent: 0, failed: 1 });
  assert.equal(fakes.Fee.store[0].lastNotifiedOn, null);
  assert.match(errors[0], /SMTP down/);

  const retry = await run(fakes);
  assert.deepEqual(retry, { sent: 1, failed: 0 });
});

test('one failed send does not stop the other students', async () => {
  const fakes = createFakes({
    fees: [
      { _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(2) },
      { _id: 'f6', studentId: 's6', amountDue: 5000, dueDate: daysFromNow(3) }
    ],
    students: [student5, student6]
  });

  const result = await run(fakes, {
    sendMail: async (message) => {
      if (message.to === 'student5@pes.edu') throw new Error('mailbox full');
      fakes.sent.push(message);
    }
  });

  assert.deepEqual(result, { sent: 1, failed: 1 });
  assert.equal(fakes.sent[0].to, 'student6@pes.edu');
});

test('a student without an email address is skipped and not marked notified', async () => {
  const fakes = createFakes({
    fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }],
    students: [{ _id: 's5', name: 'Student 5', email: '' }]
  });

  assert.deepEqual(await run(fakes), { sent: 0, failed: 0 });
  assert.equal(fakes.Fee.store[0].lastNotifiedOn, null);
});

test('IT-17 with no SMTP settings the notifier is disabled and builds no mailer', () => {
  let built = false;
  const notifier = createFeeNotifier({ env: {}, models: {}, createSendMail: () => { built = true; } });

  assert.equal(notifier.enabled, false);
  assert.equal(built, false);
});

test('with SMTP settings the notifier is enabled and runs the job with the fake mailer', async () => {
  const fakes = createFakes({ fees: [{ _id: 'f5', studentId: 's5', amountDue: 5000, dueDate: daysFromNow(5) }], students: [student5] });
  const notifier = createFeeNotifier({
    env: { SMTP_HOST: 'smtp.example.test' },
    models: { Fee: fakes.Fee, Student: fakes.Student },
    createSendMail: () => fakes.sendMail,
    logger: silentLogger
  });

  assert.equal(notifier.enabled, true);
  assert.deepEqual(await notifier.run(NOW), { sent: 1, failed: 0 });
});

test('the daily job is not scheduled when notifications are disabled', () => {
  let scheduled = false;
  const task = startFeeNotificationJob({
    notifier: { enabled: false },
    cron: { schedule: () => { scheduled = true; } },
    logger: silentLogger
  });

  assert.equal(task, null);
  assert.equal(scheduled, false);
});

test('the daily job is scheduled once a day and runs the notifier', async () => {
  const calls = [];
  let callback = null;
  const fakeTask = { stop() {} };
  const task = startFeeNotificationJob({
    notifier: { enabled: true, run: async () => { calls.push('run'); return { sent: 2, failed: 0 }; } },
    cron: { schedule: (expression, fn) => { calls.push(expression); callback = fn; return fakeTask; } },
    logger: silentLogger
  });

  assert.equal(task, fakeTask);
  assert.equal(calls[0], '0 8 * * *');
  await callback();
  assert.deepEqual(calls, ['0 8 * * *', 'run']);
});

test('a job run that throws is logged and does not crash', async () => {
  const errors = [];
  let callback = null;
  startFeeNotificationJob({
    notifier: { enabled: true, run: async () => { throw new Error('boom'); } },
    cron: { schedule: (_expression, fn) => { callback = fn; return {}; } },
    logger: { log() {}, error: (message) => errors.push(message) }
  });

  await callback();

  assert.match(errors[0], /boom/);
});

test('a missing node-cron package does not stop the app from starting', () => {
  const errors = [];
  const task = startFeeNotificationJob({
    notifier: { enabled: true, run: async () => ({ sent: 0, failed: 0 }) },
    cron: { schedule: () => { throw new Error('cannot start'); } },
    logger: { log() {}, error: (message) => errors.push(message) }
  });

  assert.equal(task, null);
  assert.match(errors[0], /cannot start/);
});

function buildApp(sessionUser, notifier) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = sessionUser ? { user: sessionUser } : {};
    next();
  });
  app.use('/api/admin', createAdminRouter({ getNotifier: () => notifier, getAdminDashboard: async () => ({}) }));
  app.use((err, _req, res, _next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again', details: {} } });
  });
  return app;
}

const adminUser = { id: 'a1', role: 'admin', usn: null };
const studentUser = { id: 'u1', role: 'student', usn: 'PES1UG24CS001' };

test('POST /api/admin/notifications/run needs an admin session', async () => {
  const notifier = { enabled: true, run: async () => ({ sent: 1, failed: 0 }) };

  assert.equal((await request(buildApp(null, notifier)).post('/api/admin/notifications/run')).status, 401);
  assert.equal((await request(buildApp(studentUser, notifier)).post('/api/admin/notifications/run')).status, 403);
});

test('IT-17 the run endpoint returns 503 NOTIFICATIONS_DISABLED and sends nothing when SMTP is not configured', async () => {
  let ran = false;
  const notifier = { enabled: false, run: async () => { ran = true; return { sent: 0, failed: 0 }; } };

  const response = await request(buildApp(adminUser, notifier)).post('/api/admin/notifications/run');

  assert.equal(response.status, 503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'NOTIFICATIONS_DISABLED');
  assert.equal(response.body.error.message, 'Notifications are not configured');
  assert.equal(ran, false);
});

test('the run endpoint returns the number of emails sent', async () => {
  const notifier = { enabled: true, run: async () => ({ sent: 3, failed: 0 }) };

  const response = await request(buildApp(adminUser, notifier)).post('/api/admin/notifications/run');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: { sent: 3 } });
});

test('the run endpoint returns sent 0 when no fee is due', async () => {
  const notifier = { enabled: true, run: async () => ({ sent: 0, failed: 0 }) };

  const response = await request(buildApp(adminUser, notifier)).post('/api/admin/notifications/run');

  assert.deepEqual(response.body, { success: true, data: { sent: 0 } });
});

test('an unexpected error in the run endpoint gives the safe 500 body', async () => {
  const notifier = { enabled: true, run: async () => { throw new Error('secret detail'); } };

  const response = await request(buildApp(adminUser, notifier)).post('/api/admin/notifications/run');

  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(response.body), /secret detail/);
});
