import { Employee } from '../../src/lib/models';
import { randomDateInRange, pick, randomBoolean } from '../utils/random';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
  employees?: any[];
}

export async function seedPositionHistory(data: SeedData): Promise<SeedData> {
  console.log('📜 Step 7: Creating Position History...');
  
  const employees = data.employees || [];
  const positions = data.positions || [];
  const stores = data.stores || [];
  const storeDepartments = data.storeDepartments || [];
  
  let totalHistoryCount = 0;
  
  for (const employee of employees) {
    // 30% of employees have position history
    if (!randomBoolean(0.3)) continue;
    
    const historyEntries: any[] = [];
    const currentPosition = employee.positionId;
    const currentStore = employee.storeId;
    const currentDept = employee.storeDepartmentId;
    
    // Generate 1-3 historical positions
    const historyCount = Math.floor(Math.random() * 3) + 1;
    let lastDate = employee.joinedOn || new Date(2020, 0, 1);
    
    for (let i = 0; i < historyCount; i++) {
      const fromDate = randomDateInRange(
        lastDate,
        new Date(2024, 11, 31)
      );
      
      // Don't create history that overlaps with current position
      if (fromDate > new Date(2024, 6, 1)) break;
      
      const toDate = randomDateInRange(
        fromDate,
        new Date(Math.min(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000, new Date(2024, 11, 31).getTime()))
      );
      
      const historicalPosition = pick(positions.filter(p => p._id.toString() !== currentPosition?.toString()));
      const historicalStore = pick(stores.filter(s => s._id.toString() !== currentStore?.toString()));
      const historicalDept = pick(storeDepartments.filter(sd => 
        sd.storeId.toString() === historicalStore?._id.toString() &&
        sd._id.toString() !== currentDept?.toString()
      ));
      
      historyEntries.push({
        positionId: historicalPosition?._id,
        storeId: historicalStore?._id,
        storeDepartmentId: historicalDept?._id,
        reason: pick([
          'Promotion',
          'Department transfer',
          'Store transfer',
          'Role change',
          'Temporary assignment'
        ]),
        from: fromDate,
        to: toDate,
        assignedBy: pick(employees.filter(e => e.roles?.includes('hr') || e.roles?.includes('owner')))?._id
      });
      
      lastDate = toDate;
    }
    
    if (historyEntries.length > 0) {
      await Employee.findByIdAndUpdate(employee._id, {
        positionHistory: historyEntries
      });
      totalHistoryCount += historyEntries.length;
    }
  }
  
  console.log(`✅ Created position history for ${totalHistoryCount} entries`);
  
  return data;
}

