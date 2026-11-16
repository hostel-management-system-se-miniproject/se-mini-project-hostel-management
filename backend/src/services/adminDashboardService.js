'use strict';

const {
  Room,
  Fee,
  Complaint,
  Leave,
  Student,
  Allocation,
  Visitor
} = require('../models');

async function getAdminDashboard(models = {
  Room,
  Fee,
  Complaint,
  Leave,
  Student,
  Allocation,
  Visitor
}) {
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const [rooms, fees, openComplaints, unallocatedStudents, pendingLeaves, visitorsInside] = await Promise.all([
    models.Room.aggregate([
      {
        $group: {
          _id: null,
          totalOccupancy: { $sum: '$occupancy' },
          totalCapacity: { $sum: '$capacity' },
          totalRooms: { $sum: 1 },
          vacantRooms: {
            $sum: { $cond: [{ $lt: ['$occupancy', '$capacity'] }, 1, 0] }
          },
          fullRooms: {
            $sum: { $cond: [{ $gte: ['$occupancy', '$capacity'] }, 1, 0] }
          }
        }
      }
    ]),
    models.Fee.aggregate([
      {
        $project: {
          balance: {
            $subtract: ['$amountDue', { $ifNull: ['$totalPaid', 0] }]
          },
          dueDate: 1
        }
      },
      { $match: { balance: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          pendingFeeDues: { $sum: '$balance' },
          overdueFees: {
            $sum: { $cond: [{ $lt: ['$dueDate', startOfTodayUtc] }, 1, 0] }
          }
        }
      }
    ]),
    models.Complaint.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    models.Student.aggregate([
      {
        $lookup: {
          from: models.Allocation.collection.name,
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$studentId', '$$studentId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'activeAllocation'
        }
      },
      { $match: { activeAllocation: { $size: 0 } } },
      { $count: 'unallocatedStudents' }
    ]),
    models.Leave.countDocuments({ status: 'Pending' }),
    models.Visitor.countDocuments({ exitTime: null })
  ]);

  const roomSummary = rooms[0] || {};
  const feeSummary = fees[0] || {};
  const unallocatedSummary = unallocatedStudents[0] || {};

  return {
    totalOccupancy: Number.isInteger(roomSummary.totalOccupancy) ? roomSummary.totalOccupancy : 0,
    totalCapacity: Number.isInteger(roomSummary.totalCapacity) ? roomSummary.totalCapacity : 0,
    vacantRooms: Number.isInteger(roomSummary.vacantRooms) ? roomSummary.vacantRooms : 0,
    pendingFeeDues: Number.isInteger(feeSummary.pendingFeeDues) ? feeSummary.pendingFeeDues : 0,
    openComplaints: Number.isInteger(openComplaints) ? openComplaints : 0,
    totalRooms: Number.isInteger(roomSummary.totalRooms) ? roomSummary.totalRooms : 0,
    fullRooms: Number.isInteger(roomSummary.fullRooms) ? roomSummary.fullRooms : 0,
    unallocatedStudents: Number.isInteger(unallocatedSummary.unallocatedStudents)
      ? unallocatedSummary.unallocatedStudents
      : 0,
    overdueFees: Number.isInteger(feeSummary.overdueFees) ? feeSummary.overdueFees : 0,
    pendingLeaves: Number.isInteger(pendingLeaves) ? pendingLeaves : 0,
    visitorsInside: Number.isInteger(visitorsInside) ? visitorsInside : 0
  };
}

module.exports = { getAdminDashboard };
