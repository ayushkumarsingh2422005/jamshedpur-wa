import connectDB from './db';
import PoliceStation from '@/models/PoliceStation';
import { POLICE_STATION_SEED_DATA } from './seed-police-stations-data';

export async function seedPoliceStations(options?: {
    /** Deactivate stations whose names are not in the seed list */
    deactivateOthers?: boolean;
}): Promise<{ upserted: number; deactivated: number; total: number }> {
    await connectDB();

    let upserted = 0;
    const seedNames = new Set<string>();

    for (const entry of POLICE_STATION_SEED_DATA) {
        seedNames.add(entry.name);

        await PoliceStation.findOneAndUpdate(
            { name: entry.name },
            {
                name: entry.name,
                nameHindi: entry.nameHindi,
                address: entry.address,
                addressHindi: entry.addressHindi,
                district: 'East Singhbhum',
                location: {
                    type: 'Point',
                    coordinates: [entry.longitude, entry.latitude],
                },
                governmentNumber: entry.governmentNumber || '',
                personalNumber: entry.personalNumber || '',
                inchargeName: entry.inchargeName || '',
                inchargeNameHindi: entry.inchargeNameHindi || '',
                displayOrder: entry.displayOrder,
                showInAssociatedPsList: entry.showInAssociatedPsList !== false,
                isActive: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserted += 1;
    }

    let deactivated = 0;
    if (options?.deactivateOthers) {
        const result = await PoliceStation.updateMany(
            { name: { $nin: [...seedNames] }, isActive: { $ne: false } },
            { $set: { isActive: false } }
        );
        deactivated = result.modifiedCount || 0;
    }

    const total = await PoliceStation.countDocuments({ isActive: { $ne: false } });
    return { upserted, deactivated, total };
}
