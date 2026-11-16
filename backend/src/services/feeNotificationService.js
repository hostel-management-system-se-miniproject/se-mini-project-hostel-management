'use strict';

const { getNotificationConfig } = require('../config/notifications');

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;

// All dates are compared in UTC, the same way the rest of the API stores dates.
function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDueDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(date));
}

function buildMessage(student, fee, balance) {
  const dueText = formatDueDate(fee.dueDate);
  return {
    to: student.email,
    subject: `Hostel fee due on ${dueText}`,
    text: [
      `Hello ${student.name || 'student'},`,
      '',
      `Your hostel fee balance of Rs. ${balance} is due on ${dueText}.`,
      'Please pay it on or before the due date.',
      '',
      'Hostel Management'
    ].join('\n')
  };
}

// Finds fee records with a balance whose due date is from today to 7 days ahead,
// and emails each student once per due date. A record counts as already notified
// when lastNotifiedOn is on or after the day the 7-day window opened for its due date.
// Resolves to { sent, failed }. A send is counted only after the mail server accepted it.
async function runFeeNotifications({ Fee, Student, sendMail, now = new Date(), logger = console }) {
  const todayStart = startOfUtcDay(now);
  const windowEnd = new Date(todayStart.getTime() + (WINDOW_DAYS + 1) * DAY_MS);

  const fees = await Fee.find({ dueDate: { $gte: todayStart, $lt: windowEnd } }).lean();
  const candidates = fees.filter((fee) => {
    const balance = Number(fee.amountDue) - Number(fee.totalPaid || 0);
    return balance > 0;
  });

  if (candidates.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const students = await Student.find({ _id: { $in: candidates.map((fee) => fee.studentId) } })
    .select('_id name email')
    .lean();
  const studentById = new Map(students.map((student) => [String(student._id), student]));

  let sent = 0;
  let failed = 0;

  for (const fee of candidates) {
    const student = studentById.get(String(fee.studentId));
    if (!student || !student.email) {
      continue;
    }

    const balance = Number(fee.amountDue) - Number(fee.totalPaid || 0);
    const windowOpened = new Date(new Date(fee.dueDate).getTime() - WINDOW_DAYS * DAY_MS);
    const previous = fee.lastNotifiedOn || null;

    // Claim the record first with a conditional update, so two runs at the same
    // moment (the daily job and a manual run) cannot both email the same student.
    const claim = await Fee.updateOne(
      {
        _id: fee._id,
        $or: [{ lastNotifiedOn: null }, { lastNotifiedOn: { $lt: windowOpened } }]
      },
      { $set: { lastNotifiedOn: now } }
    );
    if (!claim || claim.modifiedCount !== 1) {
      continue;
    }

    try {
      await sendMail(buildMessage(student, fee, balance));
      sent += 1;
    } catch (error) {
      failed += 1;
      logger.error(`Fee notification failed for fee ${String(fee._id)}: ${error.message}`);
      // Put the old value back so the next run tries this student again.
      await Fee.updateOne({ _id: fee._id }, { $set: { lastNotifiedOn: previous } });
    }
  }

  return { sent, failed };
}

// Returns { enabled, run }. When SMTP is not configured, enabled is false and run
// is never meant to be called.
function createFeeNotifier({ env = process.env, models, createSendMail, logger = console } = {}) {
  const config = getNotificationConfig(env);
  if (!config.enabled) {
    return { enabled: false, run: async () => ({ sent: 0, failed: 0 }) };
  }

  const resolvedModels = models || require('../models');
  const buildSendMail = createSendMail || require('./mailer').createSendMail;
  const sendMail = buildSendMail(config);

  return {
    enabled: true,
    run: (now = new Date()) => runFeeNotifications({
      Fee: resolvedModels.Fee,
      Student: resolvedModels.Student,
      sendMail,
      now,
      logger
    })
  };
}

module.exports = { runFeeNotifications, createFeeNotifier, buildMessage, WINDOW_DAYS };
