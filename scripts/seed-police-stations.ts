#!/usr/bin/env npx tsx
/**
 * Upsert East Singhbhum / Jamshedpur police stations from the official directory.
 *
 * Usage:
 *   npm run seed:stations
 *   npm run seed:stations -- --deactivate-others
 *
 * Source PDFs (in public/):
 *   - East_Singhbhum_Police_Directory (1).pdf
 *   - officers list jsr inhindi (1).pdf (scanned; Hindi names from place names)
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
    const deactivateOthers = process.argv.includes('--deactivate-others');
    const { seedPoliceStations } = await import('../lib/seed-police-stations');
    const { POLICE_STATION_SEED_DATA } = await import('../lib/seed-police-stations-data');

    console.log(`Seeding ${POLICE_STATION_SEED_DATA.length} police station / OP / traffic records…`);
    if (deactivateOthers) {
        console.log('Also deactivating stations not in the seed list.');
    }

    const result = await seedPoliceStations({ deactivateOthers });

    console.log(`✓ Upserted: ${result.upserted}`);
    if (deactivateOthers) {
        console.log(`✓ Deactivated others: ${result.deactivated}`);
    }
    console.log(`✓ Active stations in DB: ${result.total}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
