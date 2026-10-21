'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');
const { AllocationError } = require('../services/allocationService');

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createAllocationsRouter(options = {}) {
  const router = express.Router();
  const getModels = () => {
    const models = require('../models');
    return {
      Allocation: options.Allocation || models.Allocation,
      Student: options.Student || models.Student,
      Room: options.Room || models.Room
    };
  };
  const getAllocateRoom = () => (
    options.allocateRoom || require('../services/allocationService').allocateRoom
  );

  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const { Allocation, Student, Room } = getModels();
      const pipeline = [
        {
          $lookup: {
            from: Student.collection.name,
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: Room.collection.name,
            localField: 'roomId',
            foreignField: '_id',
            as: 'room'
          }
        },
        { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } }
      ];

      if (req.query.active === 'true' || req.query.active === 'false') {
        pipeline.unshift({ $match: { status: req.query.active === 'true' ? 'active' : 'inactive' } });
      }
      if (typeof req.query.usn === 'string') {
        pipeline.push({
          $match: {
            'student.usn': {
              $regex: `^${escapeRegex(req.query.usn)}$`,
              $options: 'i'
            }
          }
        });
      }
      if (typeof req.query.roomId === 'string') {
        if (!mongoose.isValidObjectId(req.query.roomId)) {
          return res.json({ success: true, data: [] });
        }
        pipeline.unshift({ $match: { roomId: new mongoose.Types.ObjectId(req.query.roomId) } });
      }

      pipeline.push(
        { $sort: { startedAt: -1, _id: -1 } },
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            usn: { $ifNull: ['$student.usn', null] },
            studentName: { $ifNull: ['$student.name', null] },
            roomId: { $toString: '$roomId' },
            roomNo: { $ifNull: ['$room.roomNo', null] },
            status: 1,
            startedAt: 1,
            endedAt: { $ifNull: ['$endedAt', null] },
            endReason: { $ifNull: ['$endReason', null] }
          }
        }
      );

      const allocations = await Allocation.aggregate(pipeline);
      return res.json({ success: true, data: allocations });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    try {
      const data = await getAllocateRoom()(req.body || {});
      return res.status(201).json({ success: true, data });
    } catch (error) {
      if (error instanceof AllocationError) {
        return res.status(error.status).json(errorBody(error.code, error.message));
      }
      return next(error);
    }
  });

  return router;
}

module.exports = { createAllocationsRouter };
