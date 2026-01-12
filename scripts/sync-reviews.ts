import dotenv from "dotenv";
dotenv.config();

import { refreshAllStoresReviews } from "../src/lib/actions/google-places.actions";
import dbConnect from "../src/lib/db";

async function main() {
    console.log("Starting manual review sync...");
    await dbConnect();
    const result = await refreshAllStoresReviews();
    console.log("Sync Result:", JSON.stringify(result, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
