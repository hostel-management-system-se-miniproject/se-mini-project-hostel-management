require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const {
  User,
  Student,
  Room,
  Allocation,
  Fee,
  Complaint,
  Leave,
  Visitor
} = require('../src/models');
const { allocateRoom } = require('../src/services/allocationService');

// Test-only credentials are listed in README.md only. They are not stored as plaintext in MongoDB.
// See the project README for the seeded admin/student credentials used in development and demo data.
const ADMIN_EMAIL = 'admin@pes.edu';
const ADMIN_PASSWORD = 'Admin@123';
const STUDENT_PASSWORD = 'Pass@123';

const studentRecords = Array.from({ length: 20 }, (_, index) => {
  const studentNumber = String(index + 1).padStart(3, '0');
  const usn = `PES1UG24CS${studentNumber}`;
  const name = `Student ${studentNumber}`;
  const email = `student${studentNumber}@pes.edu`;
  const phone = `900000${String(index + 1).padStart(4, '0')}`;

  return { usn, name, email, phone };
});

const roomRecords = [
  { roomNo: 'A-101', block: 'A', floor: 1, sharingType: 'triple', capacity: 3, occupancy: 3 },
  { roomNo: 'A-102', block: 'A', floor: 1, sharingType: 'double', capacity: 2, occupancy: 0 },
  { roomNo: 'A-103', block: 'A', floor: 1, sharingType: 'double', capacity: 2, occupancy: 1 },
  { roomNo: 'A-204', block: 'A', floor: 2, sharingType: 'single', capacity: 1, occupancy: 1 },
  { roomNo: 'B-101', block: 'B', floor: 1, sharingType: 'double', capacity: 2, occupancy: 1 },
  { roomNo: 'B-204', block: 'B', floor: 2, sharingType: 'triple', capacity: 3, occupancy: 0 },
  { roomNo: 'C-101', block: 'C', floor: 1, sharingType: 'quad', capacity: 4, occupancy: 2 },
  { roomNo: 'C-110', block: 'C', floor: 1, sharingType: 'single', capacity: 1, occupancy: 0 },
  { roomNo: 'C-205', block: 'C', floor: 2, sharingType: 'double', capacity: 2, occupancy: 2 }
];

async function clearSeedData() {
  const adminAndStudentEmails = [ADMIN_EMAIL, ...studentRecords.map((student) => student.email)];
  const studentUsns = studentRecords.map((student) => student.usn);
  const roomNumbers = roomRecords.map((room) => room.roomNo);

  await Allocation.deleteMany({});
  await Complaint.deleteMany({});
  await Visitor.deleteMany({});
  await Leave.deleteMany({});
  await Fee.deleteMany({});
  await User.deleteMany({ email: { $in: adminAndStudentEmails } });
  await Student.deleteMany({ usn: { $in: studentUsns } });
  await Room.deleteMany({ roomNo: { $in: roomNumbers } });

  const sessionCollections = await mongoose.connection.db
    .listCollections({ name: 'sessions' })
    .toArray();
  if (sessionCollections.length > 0) {
    await mongoose.connection.db.collection('sessions').deleteMany({});
  }
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  return User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        failedAttempts: 0,
        lockUntil: null
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  );
}

async function seedStudents() {
  for (const student of studentRecords) {
    const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 10);

    const userDoc = await User.findOneAndUpdate(
      { email: student.email },
      {
        $set: {
          email: student.email,
          passwordHash,
          role: 'student',
          failedAttempts: 0,
          lockUntil: null
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    await Student.findOneAndUpdate(
      { usn: student.usn },
      {
        $set: {
          userId: userDoc._id,
          usn: student.usn,
          name: student.name,
          email: student.email,
          phone: student.phone
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
  }
}

async function seedRooms() {
  for (const room of roomRecords) {
    await Room.findOneAndUpdate(
      { roomNo: room.roomNo },
      {
        $set: {
          ...room,
          occupancy: 0
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
  }
}

const allocationRecords = [
  { studentNumber: '001', roomNo: 'A-101' },
  { studentNumber: '002', roomNo: 'A-101' },
  { studentNumber: '003', roomNo: 'A-101' },
  { studentNumber: '004', roomNo: 'A-103' },
  { studentNumber: '005', roomNo: 'A-204' },
  { studentNumber: '006', roomNo: 'B-101' },
  { studentNumber: '007', roomNo: 'C-101' },
  { studentNumber: '008', roomNo: 'C-101' },
  { studentNumber: '009', roomNo: 'C-205' },
  { studentNumber: '010', roomNo: 'C-205' }
];

async function seedAllocations() {
  const roomsByNumber = new Map(
    (await Room.find({ roomNo: { $in: roomRecords.map((room) => room.roomNo) } }))
      .map((room) => [room.roomNo, room])
  );

  for (const allocation of allocationRecords) {
    const student = studentRecords.find(
      ({ usn }) => usn.endsWith(allocation.studentNumber)
    );
    const room = roomsByNumber.get(allocation.roomNo);

    await allocateRoom({
      usn: student.usn,
      roomId: String(room._id)
    });
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function seedDashboardRecords(adminUser) {
  const students = await Student.find({
    usn: { $in: studentRecords.slice(0, 10).map((student) => student.usn) }
  });
  const studentsByUsn = new Map(students.map((student) => [student.usn, student]));
  const student001 = studentsByUsn.get('PES1UG24CS001');
  const student002 = studentsByUsn.get('PES1UG24CS002');

  // Dates are relative to the day the seed runs, so the demo never shows a due date or
  // leave that is already in the past.
  const now = Date.now();
  const paidOn = new Date(now - 20 * DAY_MS);

  await Fee.create({
    studentId: student001._id,
    amountDue: 10000,
    dueDate: new Date(now + 30 * DAY_MS),
    totalPaid: 4000,
    payments: [{
      amount: 4000,
      paidOn,
      recordedBy: adminUser._id,
      recordedAt: paidOn
    }]
  });

  // Complaints start with an "Open" history entry, exactly like complaints made through the API.
  await Complaint.create({
    studentId: student001._id,
    category: 'Electrical',
    description: 'Room light is not working.',
    status: 'Open',
    isOpen: true,
    history: [{ status: 'Open', remarks: null, at: new Date(now), by: student001.userId }]
  });

  // Categories must be one of the contract's three: Electrical, Plumbing, Furniture.
  await Complaint.create({
    studentId: student002._id,
    category: 'Furniture',
    description: 'Desk drawer is broken.',
    status: 'Resolved',
    isOpen: false,
    remarks: 'Drawer repaired by the maintenance team.',
    history: [
      { status: 'Open', remarks: null, at: new Date(now - 2 * DAY_MS), by: student002.userId },
      {
        status: 'Resolved',
        remarks: 'Drawer repaired by the maintenance team.',
        at: new Date(now - DAY_MS),
        by: adminUser._id
      }
    ]
  });

  await Leave.create({
    studentId: student001._id,
    startDate: new Date(now + 7 * DAY_MS),
    endDate: new Date(now + 9 * DAY_MS),
    reason: 'Family visit',
    status: 'Pending'
  });
}

async function printSummary() {
  const [users, students, rooms, allocations, fees, complaints] = await Promise.all([
    User.countDocuments(),
    Student.countDocuments(),
    Room.countDocuments(),
    Allocation.countDocuments(),
    Fee.countDocuments(),
    Complaint.countDocuments()
  ]);

  console.log(
    `Seed summary: users=${users}, students=${students}, rooms=${rooms}, allocations=${allocations}, fees=${fees}, complaints=${complaints}`
  );
}

async function seedDatabase() {
  await connectDatabase();
  await clearSeedData();
  const adminUser = await seedAdmin();
  await seedStudents();
  await seedRooms();
  await seedAllocations();
  await seedDashboardRecords(adminUser);

  await printSummary();
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase };