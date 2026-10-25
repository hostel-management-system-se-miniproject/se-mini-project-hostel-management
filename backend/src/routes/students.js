'use strict';

const express = require('express');
const {
  requireAuth,
  requireRole,
  selfOrAdmin,
  ROLES
} = require('../middleware/auth');
const { getStudentDashboard } = require('../services/dashboardService');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createStudentsRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Student: options.Student || models.Student,
      Allocation: options.Allocation || models.Allocation,
      Room: options.Room || models.Room,
      Fee: options.Fee || models.Fee,
      Complaint: options.Complaint || models.Complaint,
      Leave: options.Leave || models.Leave
    };
  };

  router.get('/:usn/dashboard', requireAuth, selfOrAdmin('usn'), async (req, res, next) => {
    try {
      const data = await getStudentDashboard(req.params.usn, getModels());
      if (!data) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Student not found',
            details: {}
          }
        });
      }
      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Student, Allocation, Room } = getModels();
      const pipeline = [];

      if (typeof req.query.search === 'string' && req.query.search !== '') {
        const search = escapeRegex(req.query.search);
        pipeline.push({
          $match: {
            $or: [
              { usn: { $regex: search, $options: 'i' } },
              { name: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      pipeline.push({
        $lookup: {
          from: Allocation.collection.name,
          let: { studentId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$studentId', '$$studentId'] },
              { $eq: ['$status', 'active'] }
            ] } } },
            { $limit: 1 },
            {
              $lookup: {
                from: Room.collection.name,
                localField: 'roomId',
                foreignField: '_id',
                as: 'room'
              }
            },
            { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
            { $project: { roomNo: '$room.roomNo' } }
          ],
          as: 'activeAllocation'
        }
      });

      if (req.query.unallocated === 'true') {
        pipeline.push({ $match: { activeAllocation: { $size: 0 } } });
      }

      pipeline.push({
        $project: {
          _id: 0,
          usn: 1,
          name: 1,
          email: 1,
          phone: 1,
          room: { $ifNull: [{ $arrayElemAt: ['$activeAllocation.roomNo', 0] }, null] }
        }
      });
      pipeline.push({ $sort: { usn: 1 } });
      const students = await Student.aggregate(pipeline);
      return res.json({ success: true, data: students });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createStudentsRouter };
