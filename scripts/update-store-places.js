/**
 * Migration Script: Update Chickinho Stores with Google Place IDs and Addresses
 * 
 * Run this once to update all store records with real Google Places data
 * Usage: node scripts/update-store-places.js
 */

import dbConnect from '../src/lib/db.js';
import { Store } from '../src/lib/models.js';

const storeUpdates = [
    {
        name: "Lx Factory",
        googlePlaceId: "ChIJW300h6U0GQ0R_BGyDzUt5f4",
        address: "R. Rodrigues de Faria 103, 1300-501 Lisboa, Portugal"
    },
    {
        name: "Campolide",
        googlePlaceId: "ChIJhWbDum0zGQ0RiLLwiWOA4lA",
        address: "Rua Marquês de Fronteira 117F, 1070-292 Lisboa, Portugal"
    },
    {
        name: "Telheiras",
        googlePlaceId: "ChIJB4aCO_MzGQ0RKWB6a47UFf8",
        address: "Largo José João Farinha Júnior, 1600-302 Lisboa, Portugal"
    },
    {
        name: "Ubbo",
        googlePlaceId: "ChIJkewSUmLNHg0Ro9LHz134jLU",
        address: "Centro Comercial UBBO, Av. Cruzeiro Seixas 5 e 7, 2650-505 Amadora, Portugal"
    },
    {
        name: "Linda a Velha",
        googlePlaceId: "ChIJPTHwJAfNHg0R82nQJPMOQ6E",
        address: "Alameda António Sérgio 76D, 2795-022 Linda-a-Velha, Portugal"
    }
];

async function updateStores() {
    try {
        await dbConnect();
        console.log('Connected to database');

        let updated = 0;
        let notFound = 0;

        for (const update of storeUpdates) {
            // Find store by name (case-insensitive, partial match)
            const store = await Store.findOne({
                name: { $regex: new RegExp(update.name, 'i') },
                active: true
            });

            if (store) {
                console.log(`\nUpdating: ${store.name}`);
                console.log(`  Place ID: ${update.googlePlaceId}`);
                console.log(`  Address: ${update.address}`);

                store.googlePlaceId = update.googlePlaceId;
                store.address = update.address;

                // Initialize ratingHistory if not exists
                if (!store.ratingHistory) {
                    store.ratingHistory = [];
                }

                await store.save();
                updated++;
                console.log(`  ✓ Updated successfully`);
            } else {
                console.log(`\n✗ Store not found: ${update.name}`);
                notFound++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`Migration Complete!`);
        console.log(`  Updated: ${updated}`);
        console.log(`  Not Found: ${notFound}`);
        console.log('='.repeat(50));

        process.exit(0);
    } catch (error) {
        console.error('Migration Error:', error);
        process.exit(1);
    }
}

updateStores();
