import dns from 'node:dns';
import mongoose from 'mongoose';

// Node's built-in resolver sometimes fails to read the OS's configured DNS
// servers on Windows and falls back to 127.0.0.1, which breaks the SRV
// lookup that mongodb+srv:// URIs depend on. Pointing it at public resolvers
// avoids that failure mode without requiring any system config changes.
// Scoped to Windows only so it doesn't override resolver config in
// environments that rely on internal/VPC DNS (Docker, Kubernetes, private
// Atlas endpoints).
if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
