'use strict';

// GET /api/rooms (HMS-07, SRS FR-002.1). Admin only.
// Filters: block, floor, sharing, available. With no filters every room is returned.

const express = require('express');
const { requireAuth, requireRole, ROLES } = require('../middleware/auth');

function errorBody(code, message, details = {}) {
  return { success: false, error: { code, message, details } };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reads one query value. A missing or blank value means "no filter".
// A repeated parameter (?block=A&block=B) arrives as an array and is rejected.
function readText(query, name, details) {
  const raw = query[name];
  if (raw === undefined) return null;
  if (typeof raw !== 'string') {
    details[name] = `${name} must be given once`;
    return null;
  }
  const value = raw.trim();
  return value === '' ? null : value;
}

function parseRoomFilters(query = {}) {
  const details = {};
  const filter = {};

  const block = readText(query, 'block', details);
  if (block) {
    filter.block = { $regex: `^${escapeRegex(block)}$`, $options: 'i' };
  }

  const sharing = readText(query, 'sharing', details);
  if (sharing) {
    filter.sharingType = { $regex: `^${escapeRegex(sharing)}$`, $options: 'i' };
  }

  const floor = readText(query, 'floor', details);
  if (floor !== null) {
    if (/^\d+$/.test(floor)) {
      filter.floor = Number(floor);
    } else {
      details.floor = 'floor must be a whole number, 0 or more';
    }
  }

  const available = readText(query, 'available', details);
  if (available !== null) {
    if (available === 'true') {
      filter.$expr = { $lt: ['$occupancy', '$capacity'] };
    } else if (available !== 'false') {
      details.available = 'available must be true or false';
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true, filter };
}

function toRoomView(room) {
  const capacity = room.capacity;
  const occupancy = room.occupancy || 0;
  return {
    id: String(room._id),
    roomNo: room.roomNo,
    block: room.block,
    floor: room.floor,
    sharingType: room.sharingType,
    capacity,
    occupancy,
    vacancy: Math.max(capacity - occupancy, 0)
  };
}

function createRoomsRouter(options = {}) {
  const router = express.Router();
  // Loaded lazily so the router can be tested with an in-memory fake.
  const getRoom = () => options.Room || require('../models').Room;

  router.get('/', requireAuth, requireRole(ROLES.ADMIN), async (req, res, next) => {
    const parsed = parseRoomFilters(req.query);
    if (!parsed.ok) {
      return res.status(400).json(errorBody('VALIDATION_ERROR', 'One or more filters are invalid', parsed.details));
    }

    try {
      const rooms = await getRoom().find(parsed.filter).sort({ block: 1, floor: 1, roomNo: 1 }).lean();
      return res.json({ success: true, data: rooms.map(toRoomView) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createRoomsRouter, parseRoomFilters, toRoomView };
