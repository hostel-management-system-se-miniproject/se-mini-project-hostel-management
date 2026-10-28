const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { after, before, beforeEach, test } = require('node:test');
const {
  clearTestDb,
  connectTestDb,
  disconnectTestDb
} = require('../test-support/db');
const {
  Student,
  Room,
  Allocation,
  Fee,
  Complaint,
  Leave,
  Visitor
} = require('../src/models');
const { getAdminDashboard } = require('../src/services/adminDashboardService');
const { allocateRoom, vacateAllocation } = require('../src/services/allocationService');

before(async () => {
  await connectTestDb();
  await Promise.all([
    Student.init(),
    Room.init(),
    Allocation.init(),
    Fee.init(),
    Complaint.init(),
    Leave.init(),
    Visitor.init()
  ]);
});

beforeEach(async () => {
  await clearTestDb();
});

after(async () => {
  await disconnectTestDb();
});

function student(usn) {
  return new Student({
    userId: new mongoose.Types.ObjectId(),
    usn,
    name: usn,
    email: `${usn}@example.com`,
    phone: '9876543210'
  });
}

function room(roomNo, capacity, occupancy) {
  return new Room({
    roomNo,
    block: 'A',
    floor: 1,
    sharingType: 'Double',
    capacity,
    occupancy
  });
}

test('empty database gives zeros for every dashboard field', async () => {
  assert.deepEqual(await getAdminDashboard(), {
    totalOccupancy: 0,
    totalCapacity: 0,
    vacantRooms: 0,
    pendingFeeDues: 0,
    openComplaints: 0,
    totalRooms: 0,
    fullRooms: 0,
    unallocatedStudents: 0,
    overdueFees: 0,
    pendingLeaves: 0,
    visitorsInside: 0
  });
});

test('seeded records produce exact dashboard values and exclude completed records', async () => {
  const [allocatedStudent, unallocatedStudent, anotherStudent] = await Promise.all([
    student('PES1UG24CS001').save(),
    student('PES1UG24CS002').save(),
    student('PES1UG24CS003').save()
  ]);
  const fullRoom = await room('A-101', 2, 2).save();
  await room('A-102', 4, 1).save();

  await Allocation.create({
    studentId: allocatedStudent._id,
    roomId: fullRoom._id,
    status: 'active'
  });
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(yesterday);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);

  await Fee.create([
    { studentId: allocatedStudent._id, amountDue: 500, totalPaid: 100, dueDate: yesterday },
    { studentId: unallocatedStudent._id, amountDue: 300, totalPaid: 0, dueDate: tomorrow },
    { studentId: anotherStudent._id, amountDue: 100, totalPaid: 100, dueDate: yesterday }
  ]);
  await Complaint.create([
    { studentId: allocatedStudent._id, category: 'Electrical', description: 'Fan', status: 'Open' },
    { studentId: unallocatedStudent._id, category: 'Plumbing', description: 'Tap', status: 'In Progress' },
    { studentId: anotherStudent._id, category: 'Furniture', description: 'Chair', status: 'Resolved', isOpen: false },
    { studentId: anotherStudent._id, category: 'Electrical', description: 'Light', status: 'Rejected', isOpen: false }
  ]);
  await Leave.create([
    { studentId: allocatedStudent._id, startDate: tomorrow, endDate: tomorrow, reason: 'Trip', status: 'Pending' },
    { studentId: unallocatedStudent._id, startDate: tomorrow, endDate: tomorrow, reason: 'Trip', status: 'Approved' },
    { studentId: anotherStudent._id, startDate: tomorrow, endDate: tomorrow, reason: 'Trip', status: 'Rejected' }
  ]);
  await Visitor.create([
    { studentId: allocatedStudent._id, name: 'A', contact: '1', purpose: 'Visit', recordedBy: new mongoose.Types.ObjectId() },
    { studentId: unallocatedStudent._id, name: 'B', contact: '2', purpose: 'Visit', exitTime: new Date(), recordedBy: new mongoose.Types.ObjectId() }
  ]);

  assert.deepEqual(await getAdminDashboard(), {
    totalOccupancy: 3,
    totalCapacity: 6,
    vacantRooms: 1,
    pendingFeeDues: 700,
    openComplaints: 2,
    totalRooms: 2,
    fullRooms: 1,
    unallocatedStudents: 2,
    overdueFees: 1,
    pendingLeaves: 1,
    visitorsInside: 1
  });
});

test('IT-09 allocation and vacating update occupancy and unallocated students', async () => {
  const testStudent = await student('PES1UG24CS010').save();
  const testRoom = await room('A-110', 2, 0).save();

  const before = await getAdminDashboard();
  assert.equal(before.unallocatedStudents, 1);
  assert.equal(before.totalOccupancy, 0);

  const allocation = await allocateRoom({
    usn: testStudent.usn,
    roomId: String(testRoom._id)
  });
  const afterAllocation = await getAdminDashboard();
  assert.equal(afterAllocation.unallocatedStudents, 0);
  assert.equal(afterAllocation.totalOccupancy, 1);

  await vacateAllocation({ allocationId: allocation.id, confirm: true });
  const afterVacate = await getAdminDashboard();
  assert.equal(afterVacate.unallocatedStudents, 1);
  assert.equal(afterVacate.totalOccupancy, 0);
});
