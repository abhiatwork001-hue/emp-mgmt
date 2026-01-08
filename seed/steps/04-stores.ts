import { Store, Company } from '../../src/lib/models';
import { STORE_NAMES } from '../constants';
import { slugify } from '../utils/slug';
import { generateRandomAddress } from '../utils/random';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
}

export async function seedStores(data: SeedData): Promise<SeedData> {
  console.log('🏪 Step 4: Creating Stores...');

  // Determine how many stores to create
  const targetStoreCount = 50;
  const randomStoreCount = Math.max(0, targetStoreCount - STORE_NAMES.length);

  const allStoreNames = [...STORE_NAMES];

  // Generate random store names (locations in Portugal or generic)
  const locations = ["Porto", "Coimbra", "Faro", "Braga", "Aveiro", "Leiria", "Setubal", "Viseu", "Evora", "Guarda"];
  const zones = ["Center", "North", "South", "Beach", "Downtown", "Mall", "Airport", "Station"];

  for (let i = 0; i < randomStoreCount; i++) {
    const location = locations[i % locations.length];
    const zone = zones[Math.floor(i / locations.length) % zones.length];
    // Add index to ensure uniqueness if we cycle through all combos
    const uniqueSuffix = Math.floor(i / (locations.length * zones.length)) + 1;
    const suffixStr = uniqueSuffix > 1 ? ` ${uniqueSuffix}` : "";

    allStoreNames.push(`Chickinho ${location} ${zone}${suffixStr}`);
  }

  const stores = await Promise.all(
    allStoreNames.map(name =>
      Store.create({
        companyId: data.company!._id,
        name,
        slug: slugify(name),
        address: generateRandomAddress(),
        managers: [],
        subManagers: [],
        employees: [],
        minEmployees: 10,
        maxEmployees: 40,
        active: true
      })
    )
  );

  // Update company with stores
  if (data.company) {
    await Company.findByIdAndUpdate(data.company._id, {
      branches: stores.map(s => s._id)
    });
  }

  console.log(`✅ Created ${stores.length} stores`);

  return {
    ...data,
    stores
  };
}

