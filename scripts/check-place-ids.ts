
import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";

export async function checkStorePlaceIds() {
    await dbConnect();
    const stores = await Store.find({ active: true }).select('name googlePlaceId address');
    console.log("--- Store Place IDs ---");
    stores.forEach(s => {
        console.log(`Store: ${s.name}`);
        console.log(`  Place ID: ${s.googlePlaceId || 'MISSING'}`);
        console.log(`  Address: ${s.address || 'MISSING'}`);
    });
    console.log("-----------------------");
}

checkStorePlaceIds()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
