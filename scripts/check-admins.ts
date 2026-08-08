#!/usr/bin/env npx tsx
/**
 * List dashboard admin users (debug helper).
 * Usage: npx tsx scripts/check-admins.ts
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
    const envPath = resolve(process.cwd(), '.env.local');
    if (!existsSync(envPath)) {
        console.error('Missing .env.local with MONGO_URI');
        process.exit(1);
    }
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = val;
        }
    }
}

loadEnvLocal();

async function main() {
    const { default: connectDB } = await import('../lib/db');
    const { default: User } = await import('../models/User');

    await connectDB();

    const uri = process.env.MONGO_URI || '';
    const dbPart = uri.includes('/') ? uri.split('/').pop()?.split('?')[0] : '(unknown)';
    const count = await User.countDocuments();
    const users = await User.find({}).select('username email isSuperAdmin isActive createdAt').lean();

    console.log(`Database: ${dbPart}`);
    console.log(`User count: ${count}`);
    if (!users.length) {
        console.log('No admin users found — /login will show the setup form.');
    } else {
        for (const u of users) {
            console.log(`- ${u.username} <${u.email}> super=${!!u.isSuperAdmin} active=${u.isActive !== false}`);
        }
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
