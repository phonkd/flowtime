import session from "express-session";
import createMemoryStore from "memorystore";

// Create a memory store for sessions
const MemoryStore = createMemoryStore(session);

// Export a function to create a memory store
export function createMemorySessionStore() {
  return new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
}