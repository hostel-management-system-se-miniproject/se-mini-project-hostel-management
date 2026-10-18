const {
  User,
  Student,
  Room,
  Allocation,
  Fee,
  Complaint,
  Leave,
  Visitor
} = require('../models');

const models = [User, Student, Room, Allocation, Fee, Complaint, Leave, Visitor];

async function ensureIndexes() {
  await Promise.all(models.map((Model) => Model.createIndexes()));
}

module.exports = { ensureIndexes };
