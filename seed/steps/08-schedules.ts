import { Schedule, StoreDepartment, ShiftDefinition, Employee, VacationRecord } from '../../src/lib/models';
import { slugify } from '../utils/slug';
import { getDateRangeForWeek, addDaysToDate as addDays } from '../utils/dates';
import { pickMultiple, randomBoolean, randomInt } from '../utils/random';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
  employees?: any[];
  shiftDefinitions?: any[];
  schedules?: any[];
}

const CUSTOM_SHIFTS = [
  { name: "Morning", startTime: "09:00", endTime: "17:30", breakMinutes: 30, color: "#3B82F6" },
  { name: "Long", startTime: "12:00", endTime: "22:30", breakMinutes: 60, color: "#F59E0B" },
  { name: "Evening", startTime: "14:30", endTime: "23:00", breakMinutes: 30, color: "#10B981" }
];

export async function seedSchedules(data: SeedData): Promise<SeedData> {
  console.log('📅 Step 8: Creating Schedules (Custom Logic)...');

  const storeDepartments = data.storeDepartments || [];
  // Refetch employees to ensure we have the latest assignments (storeId, storeDepartmentId)
  console.log('   REFETCHING employees from DB to get assignments...');
  const employees = await Employee.find({});

  // Fetch all vacation records to respect them
  const allVacations = await VacationRecord.find({});
  const schedules: any[] = [];
  const yearsToSeed = [2025, 2026]; // Last year + early this year

  for (const dept of storeDepartments) {
    // Determine if this is Lx Factory
    const isLxFactory = (data.stores || []).find(s => s._id.toString() === dept.storeId.toString())?.name === 'Lx Factory';
    const isKitchen = dept.name.includes('Kitchen');
    const isFoh = dept.name.includes('Front');

    // Define shifts based on department
    let deptShifts = [];
    if (isLxFactory && isKitchen) {
      deptShifts = [
        { name: "Morning", startTime: "09:00", endTime: "17:30", breakMinutes: 30, color: "#3B82F6", requiredHeadcount: 2 },
        { name: "Afternoon", startTime: "14:00", endTime: "22:30", breakMinutes: 30, color: "#10B981", requiredHeadcount: 2 }
      ];
    } else if (isLxFactory && isFoh) {
      deptShifts = [
        { name: "Morning", startTime: "10:00", endTime: "18:30", breakMinutes: 30, color: "#3B82F6", requiredHeadcount: 1 },
        { name: "Long", startTime: "12:30", endTime: "22:30", breakMinutes: 60, color: "#F59E0B", requiredHeadcount: 2 }
      ];
    } else {
      // Generic shifts
      deptShifts = CUSTOM_SHIFTS.map(s => ({ ...s, requiredHeadcount: 2 }));
    }

    // Create definitions
    await ShiftDefinition.deleteMany({ storeDepartmentId: dept._id });
    const createdDefs = [];
    for (const s of deptShifts) {
      const def = await ShiftDefinition.create({ ...s, storeDepartmentId: dept._id, maxAllowedHeadcount: 4 });
      createdDefs.push(def);
    }

    // Get employees
    let deptEmployees = employees.filter(e => e.storeDepartmentId?.toString() === dept._id.toString());

    // Fallbacks for non-Lx Factory or if empty
    if (deptEmployees.length === 0) {
      if (isLxFactory) {
        console.log(`⚠️ Expected employees in Lx Factory ${dept.name} but found none. Relying on previous step.`);
        // Try store match only
        deptEmployees = employees.filter(e => e.storeId?.toString() === dept.storeId.toString());
      } else {
        deptEmployees = employees.filter(e => e.storeId?.toString() === dept.storeId.toString());
        if (deptEmployees.length < 5) deptEmployees = employees.slice(0, 15); // Grab some extras
      }
    }

    console.log(`Processing schedules for ${dept.name} (${deptEmployees.length} employees)...`);

    for (const year of yearsToSeed) {
      const maxWeek = year === 2026 ? 14 : 52;

      for (let week = 1; week <= maxWeek; week++) {
        const dateRange = getDateRangeForWeek(year, week);
        const schedule = await createWeeklySchedule(
          dept,
          deptEmployees,
          createdDefs,
          year,
          week,
          dateRange,
          employees,
          allVacations
        );
        if (schedule) schedules.push(schedule);
      }
    }
  }

  console.log(`✅ Created ${schedules.length} schedules`);
  return { ...data, schedules };
}

async function createWeeklySchedule(
  dept: any,
  deptEmployees: any[],
  shiftDefs: any[],
  year: number,
  week: number,
  dateRange: { startDate: Date; endDate: Date },
  allEmployees: any[],
  allVacations: any[]
): Promise<any> {

  const now = new Date();
  const weekDate = dateRange.startDate;
  let status = 'draft';

  if (weekDate < now) status = 'published';
  else {
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    status = weekDate < twoWeeksOut ? 'published' : 'draft';
  }

  const createdBy = dept.managers?.[0] || allEmployees.find(e => e.roles?.includes('hr')) || allEmployees[0];
  const days: any[] = [];
  let currentDate = new Date(dateRange.startDate);

  // Assign days off logic: "two days off together"
  // Map employee ID -> [days off indices 0-6]
  const employeeDaysOff = new Map<string, number[]>();
  // Strategy: Assign a random start day (0-5) for 2 consecutive days off.
  // 0=Sun, 1=Mon, ... 
  // Wait, week usually starts Monday in this system? check `getDateRangeForWeek`. 
  // `randomDateInRange` uses standard JS dates. 
  // Let's assume standard Monday start for simplicity of 2 days together.

  for (const emp of deptEmployees) {
    const startDayOff = randomInt(0, 5); // 0=Mon, ... 5=Sat. So can be Mon-Tue (0,1) to Sat-Sun (5,6)
    employeeDaysOff.set(emp._id.toString(), [startDayOff, startDayOff + 1]);
  }

  // Iterate 7 days of the week
  for (let i = 0; i < 7; i++) {
    const currentDayDate = new Date(currentDate);
    const dayShifts: any[] = [];

    // Filter out employees who have this day (i) as OFF
    // Note: This logic assumes `i` maps to the random indices we generated.
    // We treat `i=0` as first day of week.

    const availableForDay = deptEmployees.filter(emp => {
      const daysOff = employeeDaysOff.get(emp._id.toString());
      if (daysOff && daysOff.includes(i)) return false; // Is day off

      // Check vacation
      const onVacation = allVacations.some(vac =>
        vac.employeeId.toString() === emp._id.toString() &&
        currentDayDate >= vac.from && currentDayDate <= vac.to
      );
      if (onVacation) return false;

      return true;
    });

    for (const shiftDef of shiftDefs) {
      // Find employees not yet assigned TODAY
      const availableForShift = availableForDay.filter(emp =>
        !dayShifts.some(s => s.employees.includes(emp._id))
      );

      // Require headcount?
      const required = shiftDef.requiredHeadcount || 2;

      // "schedule missing employee to complete shifts min . store short staffed."
      // We simulate this by occasionally NOT filling the full requirement if available < required, 
      // OR by filling exactly required.
      // If we don't have enough, we just put whoever we have.

      const toAssignCount = Math.min(required, availableForShift.length);
      const assigned = pickMultiple(availableForShift, toAssignCount);

      if (assigned.length > 0) {
        dayShifts.push({
          shiftDefinitionId: shiftDef._id,
          shiftName: shiftDef.name,
          startTime: shiftDef.startTime,
          endTime: shiftDef.endTime,
          breakMinutes: shiftDef.breakMinutes,
          color: shiftDef.color,
          employees: assigned.map((e: any) => e._id),
          requiredHeadcount: required,
        });
      }
    }

    days.push({
      date: currentDayDate,
      isHoliday: false,
      shifts: dayShifts
    });

    currentDate = addDays(currentDate, 1);
  }

  const slug = slugify(`${year}-w${week}-${dept.slug}`);

  // Create schedule
  const schedule = await Schedule.create({
    storeId: dept.storeId,
    storeDepartmentId: dept._id,
    slug,
    weekNumber: week,
    year,
    dateRange,
    status,
    approvalHistory: status === 'published' ? [{
      status: 'published',
      changedBy: createdBy._id,
      createdAt: new Date()
    }] : [],
    createdBy: createdBy._id,
    days,
  });

  // Update employees
  const scheduleEmployees = days.flatMap(d => d.shifts.flatMap((s: any) => s.employees));
  const uniqueEmps = [...new Set(scheduleEmployees.map((e: any) => e.toString()))];

  for (const empId of uniqueEmps) {
    await Employee.findByIdAndUpdate(empId, {
      $addToSet: { schedules: schedule._id }
    });
  }

  return schedule;
}

