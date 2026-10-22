'use strict';

const {
  Student,
  Allocation,
  Room,
  Fee,
  Complaint,
  Leave
} = require('../models');

function queryLean(query) {
  return typeof query.lean === 'function' ? query.lean() : query;
}

function findOneLean(Model, filter, projection) {
  return queryLean(Model.findOne(filter, projection));
}

function findByIdLean(Model, id, projection) {
  return queryLean(Model.findById(id, projection));
}

function deriveFeeSummary(feeDoc) {
  if (feeDoc == null) {
    return null;
  }

  const { amountDue, dueDate, totalPaid } = feeDoc;
  let status;
  if (totalPaid === 0) {
    status = 'Due';
  } else if (totalPaid < amountDue) {
    status = 'Partially Paid';
  } else {
    status = 'Paid';
  }

  return {
    amountDue,
    dueDate: dueDate.toISOString().slice(0, 10),
    totalPaid,
    balance: amountDue - totalPaid,
    status
  };
}

async function getStudentDashboard(usn, models = {
  Student,
  Allocation,
  Room,
  Fee,
  Complaint,
  Leave
}) {
  const normalizedUsn = String(usn || '').trim().toUpperCase();
  const student = await findOneLean(
    models.Student,
    { usn: normalizedUsn },
    { _id: 1, usn: 1, name: 1, email: 1, phone: 1 }
  );

  if (!student) {
    return null;
  }

  const [allocation, fee, openComplaints, totalComplaints, pendingLeaves, totalLeaves] = await Promise.all([
    findOneLean(
      models.Allocation,
      { studentId: student._id, status: 'active' },
      { _id: 0, roomId: 1 }
    ),
    findOneLean(
      models.Fee,
      { studentId: student._id },
      { _id: 0, amountDue: 1, dueDate: 1, totalPaid: 1 }
    ),
    models.Complaint.countDocuments({
      studentId: student._id,
      status: { $in: ['Open', 'In Progress'] }
    }),
    models.Complaint.countDocuments({ studentId: student._id }),
    models.Leave.countDocuments({ studentId: student._id, status: 'Pending' }),
    models.Leave.countDocuments({ studentId: student._id })
  ]);

  const room = allocation
    ? await findByIdLean(
      models.Room,
      allocation.roomId,
      { _id: 0, roomNo: 1, block: 1, floor: 1, sharingType: 1 }
    )
    : null;

  return {
    student: {
      usn: student.usn,
      name: student.name,
      email: student.email,
      phone: student.phone
    },
    room: room
      ? {
        roomNo: room.roomNo,
        block: room.block,
        floor: room.floor,
        sharingType: room.sharingType
      }
      : null,
    fee: deriveFeeSummary(fee),
    complaints: {
      open: openComplaints,
      total: totalComplaints
    },
    leaves: {
      pending: pendingLeaves,
      total: totalLeaves
    }
  };
}

module.exports = { deriveFeeSummary, getStudentDashboard };
