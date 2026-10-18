require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../src/config/database');
const { User, Student, Room } = require('../src/models');

// Test-only credentials used only in this script and the README. These are never stored as plain text in MongoDB.
// admin@pes.edu / Admin@123
// student001@pes.edu to student020@pes.edu / Pass@123
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

  await User.deleteMany({ email: { $in: adminAndStudentEmails } });
  await Student.deleteMany({ usn: { $in: studentUsns } });
  await Room.deleteMany({ roomNo: { $in: roomNumbers } });
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await User.findOneAndUpdate(
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
        $set: room
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

async function seedDatabase() {
  await connectDatabase();
  await clearSeedData();
  await seedAdmin();
  await seedStudents();
  await seedRooms();

  console.log('Seeded demo data: 1 admin, 20 students, 9 rooms');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error.message);
      process.exit(1);
    });
}

module.exports = { seedDatabase, ADMIN_EMAIL, STUDENT_PASSWORD, roomRecords, studentRecords };
