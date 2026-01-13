import { Supplier, ISupplierItem, Employee } from '../../src/lib/models';
import fs from 'fs';
import path from 'path';

const suppliersDataPath = path.join(__dirname, '../suppliers_data.json');

export async function importSuppliers() {
    console.log('📦 Importing Suppliers from JSON...');

    if (!fs.existsSync(suppliersDataPath)) {
        console.error('❌ suppliers_data.json not found!');
        return;
    }

    const rawData = fs.readFileSync(suppliersDataPath, 'utf8');
    const suppliersData = JSON.parse(rawData);

    // Get a system user to assign as creator (e.g. Admin)
    const adminUser = await Employee.findOne({ email: 'admin@chickinho.pt' });
    const creatorId = adminUser?._id;

    if (!creatorId) {
        console.warn('⚠️ Admin user not found. Using partial seed without specific creator.');
    }

    for (const supplierInfo of suppliersData) {
        const { name, items } = supplierInfo;

        console.log(`Processing Supplier: ${name} (${items.length} items)`);

        let supplier = await Supplier.findOne({ name });

        if (!supplier) {
            console.log(`   (+) Creating new supplier: ${name}`);
            supplier = new Supplier({
                name,
                category: "Imported",
                active: true,
                createdBy: creatorId,
                items: [],
                deliverySchedule: [{ dayOfWeek: 1, orderCutoff: { leadDays: 1, time: "17:00" } }] // Default schedule
            });
        } else {
            console.log(`   (i) Updating existing supplier: ${name}`);
        }

        // Map items to SupplierItem format
        const supplierItems: ISupplierItem[] = items.map((item: any) => ({
            name: item.name,
            sku: item.sku || '',
            unit: item.unit || 'Unidade',
            category: 'Geral', // Default category
            price: 0 // Unknown price
        }));

        supplier.items = supplierItems;
        supplier.createdBy = supplier.createdBy || creatorId; // Ensure createdBy is set if it was missing

        await supplier.save();
    }

    console.log('✅ Suppliers imported successfully!');
}
