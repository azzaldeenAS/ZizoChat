const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function connectDB() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB connected');
    } else {
      const mongoServer = await MongoMemoryServer.create({ 
        binary: { 
          version: '7.0.14', 
          os: { os: 'linux', dist: 'Ubuntu', release: '22.04' },
          arch: 'aarch64' 
        } 
      });
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, { dbName: 'zizochat' });
      console.log('✅ MongoDB connected (In-Memory)');
    }
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
