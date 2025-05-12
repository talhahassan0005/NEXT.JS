import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local\n' +
      'Format for Atlas: mongodb+srv://<user>:<pass>@cluster.example.net/yourdb\n' +
      'Format for Local: mongodb://localhost:27017/Fast'
    );
  }

  if (cached.conn) {
    console.log('📦 Using existing database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      family: 4,
    };

    console.log('🔌 Establishing new database connection');

    cached.promise = mongoose.connect(MONGODB_URI, options)
      .then((mongooseInstance) => {
        console.log('✅ Database connected successfully');
        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null; // Reset on error
        throw new Error(
          `Failed to connect to MongoDB: ${error.message}\nPlease check your network or credentials.`
        );
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    console.log(`🗄️ ${collectionName}.${method}`, { query, doc });
  });
}

mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connection open');
});
mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('⏏️ Mongoose disconnected due to app termination');
  process.exit(0);
});

export default dbConnect;
