#!/usr/bin/env npx tsx
/**
 * Create the first super-admin dashboard user (only when no users exist).
 *
 * Usage:
 *   npm run create:admin -- --username admin --email admin@example.com --password 'YourSecurePass'
 *
 * Or via env (optional overrides for args):
 *   ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD
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

function parseArgs(argv: string[]) {
    const out: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith('--')) continue;
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith('--')) {
            out[key] = 'true';
            continue;
        }
        out[key] = next;
        i++;
    }
    return out;
}

loadEnvLocal();

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const username = (args.username || process.env.ADMIN_USERNAME || '').trim();
    const email = (args.email || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = args.password || process.env.ADMIN_PASSWORD || '';
    const phoneNumber = (args.phone || process.env.ADMIN_PHONE || '').trim();

    if (!username || !email || !password) {
        console.error(`Missing required fields.

Usage:
  npm run create:admin -- --username admin --email admin@example.com --password 'YourSecurePass'

Optional:
  --phone 9876543210
`);
        process.exit(1);
    }

    if (password.length < 6) {
        console.error('Password must be at least 6 characters.');
        process.exit(1);
    }

    const { default: connectDB } = await import('../lib/db');
    const { default: User } = await import('../models/User');
    const { fullPermissions } = await import('../lib/admin-permissions');
    const bcrypt = await import('bcryptjs');

    await connectDB();

    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
        console.error(`Admin already exists (${existingCount} user(s)). Use the dashboard to add more, or npm run migrate:admins.`);
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        isSuperAdmin: true,
        canManageAdmins: true,
        canAccessChats: true,
        permissions: fullPermissions(),
        policeStationNames: [],
        allowedComplaintTypes: [],
        isActive: true,
    });

    const dbName = (process.env.MONGO_URI || '').split('/').pop()?.split('?')[0] || '(unknown)';
    console.log(`✓ First super admin created: ${user.username} <${user.email}>`);
    console.log(`  Database: ${dbName}`);
    console.log('You can now log in at /login (hard-refresh if setup form was cached).');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
