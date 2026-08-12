import { MongoClient } from "mongodb";

import { loadEnvLocal } from "./load-env";

/**
 * The only sanctioned way to grant/revoke the `admin` role (see
 * docs/ARCHITECTURE.md "Admin authorization"). Talks to the `user`
 * collection directly with the native MongoDB driver — the same
 * collection Better Auth's `mongodbAdapter` manages (see `src/lib/auth.ts`)
 * — deliberately bypassing Better Auth's HTTP API, because the `role`
 * field is declared `input: false` there specifically so no API call,
 * client or server, can ever set it. This script is that one exception,
 * run manually by a trusted operator with direct database access.
 *
 * Usage:
 *   npm run admin:promote -- someone@example.com
 *   npm run admin:demote  -- someone@example.com
 */

async function main() {
  loadEnvLocal();

  const email = process.argv[2]?.trim().toLowerCase();
  const mode = process.env.npm_lifecycle_event === "admin:demote" ? "demote" : "promote";

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:promote -- <email>  (or admin:demote)");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    const users = db.collection("user");

    const user = await users.findOne({ email });
    if (!user) {
      console.error(`No user found with email "${email}". They must sign up first.`);
      process.exit(1);
    }

    const nextRole = mode === "demote" ? "customer" : "admin";
    if (user.role === nextRole) {
      console.log(`"${email}" already has role "${nextRole}". Nothing to do.`);
      return;
    }

    await users.updateOne({ _id: user._id }, { $set: { role: nextRole, updatedAt: new Date() } });
    console.log(`"${email}": role "${user.role ?? "customer"}" -> "${nextRole}".`);
    if (nextRole === "admin") {
      console.log("They must sign out and back in for the new role to appear in their session.");
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
