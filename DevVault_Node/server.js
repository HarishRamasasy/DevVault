import app from './app.js';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Hosts send SIGTERM on deploy/restart; finish in-flight requests first.
  process.on('SIGTERM', () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  });
};

startServer();
