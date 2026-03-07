import mongoose from "mongoose";
import dns from "node:dns";

export async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI");
  }

  // Some Windows/VPN DNS setups reject SRV queries used by mongodb+srv.
  // Allow overriding resolvers from .env, e.g. DNS_SERVERS=1.1.1.1,8.8.8.8
  if (process.env.DNS_SERVERS) {
    const servers = process.env.DNS_SERVERS
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length > 0) {
      dns.setServers(servers);
    }
  }

  await mongoose.connect(mongoUri);
}
