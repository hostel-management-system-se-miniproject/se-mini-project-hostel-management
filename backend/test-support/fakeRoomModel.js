'use strict';

// A small in-memory stand-in for the Room model. It understands only the
// filter shapes that src/routes/rooms.js builds, so route tests run without MongoDB.

function matches(room, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$expr') {
      return room.occupancy < room.capacity;
    }
    if (condition && condition.$regex) {
      return new RegExp(condition.$regex, condition.$options).test(String(room[key]));
    }
    return room[key] === condition;
  });
}

function createFakeRoomModel(rooms) {
  const model = {
    lastFilter: null,
    find(filter) {
      model.lastFilter = filter;
      let result = rooms.filter((room) => matches(room, filter));
      const query = {
        sort(order) {
          const keys = Object.keys(order);
          result = [...result].sort((a, b) => {
            for (const key of keys) {
              if (a[key] < b[key]) return -1;
              if (a[key] > b[key]) return 1;
            }
            return 0;
          });
          return query;
        },
        lean() {
          return Promise.resolve(result);
        }
      };
      return query;
    }
  };
  return model;
}

module.exports = { createFakeRoomModel };
