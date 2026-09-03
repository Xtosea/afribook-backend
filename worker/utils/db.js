import { MongoClient } from "mongodb";

let client;
let db;

export async function getDatabase(env) {
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!client) {
    client = new MongoClient(env.MONGO_URI);
    await client.connect();
    db = client.db();
  }

  return db;
}
