import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Store } from '@/lib/models';

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

export async function GET() {
    try {
        await dbConnect();

        let updated = 0;
        let notFound = 0;
        const logs = [];

        for (const update of storeUpdates) {
            const store = await Store.findOne({
                name: { $regex: new RegExp(update.name, 'i') },
                active: true
            });

            if (store) {
                store.googlePlaceId = update.googlePlaceId;
                store.address = update.address;

                if (!store.ratingHistory) {
                    store.ratingHistory = [];
                }

                await store.save();
                updated++;
                logs.push(`Updated: ${store.name}`);
            } else {
                notFound++;
                logs.push(`Not found: ${update.name}`);
            }
        }

        return NextResponse.json({
            success: true,
            updated,
            notFound,
            logs
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
