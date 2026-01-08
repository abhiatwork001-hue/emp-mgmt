import { VacationRequest, VacationRecord, AbsenceRequest, AbsenceRecord, Employee, Schedule } from '../../src/lib/models';
import { addDaysToDate as addDays } from '../utils/dates';
import { pick, randomBoolean, randomInt, randomDateInRange, isPast } from '../utils/random';

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

export async function seedVacationsAndAbsences(data: SeedData): Promise<SeedData> {
  console.log('🌴 Step 9: Creating Vacations and Absences...');

  const employees = data.employees || [];
  const schedules = data.schedules || [];

  let vacationRequestCount = 0;
  let vacationRecordCount = 0;
  let absenceRequestCount = 0;
  let absenceRecordCount = 0;

  const now = new Date();
  const yearStart = new Date(2025, 0, 1);
  const yearEnd = new Date(2026, 2, 31); // End of March 2026

  for (const employee of employees) {
    // 20-30% of employees have vacation history
    if (randomBoolean(0.25)) {
      // Create vacation records (approved past vacations)
      const recordCount = randomInt(1, 3);
      for (let i = 0; i < recordCount; i++) {
        const fromDate = randomDateInRange(yearStart, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        const days = randomInt(3, 10);
        const toDate = addDays(fromDate, days);

        if (toDate > now) continue; // Only past vacations as records

        const record = await VacationRecord.create({
          employeeId: employee._id,
          from: fromDate,
          to: toDate,
          totalDays: days,
          year: fromDate.getFullYear(),
          approvedBy: pick(data.employees?.filter(e => e.roles?.includes('hr') || e.roles?.includes('owner')) || [])?._id
        });

        vacationRecordCount++;

        // Update employee
        await Employee.findByIdAndUpdate(employee._id, {
          $addToSet: { vacations: record._id },
          $inc: { 'vacationTracker.usedDays': days }
        });
      }

      // "from last vaction make a due over vacation"
      // Logic: If they used < 22 days, maybe carry over some?
      // Or just simluate some employees having rollover days explicitly.
      const usedDays = await VacationRecord.aggregate([
        { $match: { employeeId: employee._id } },
        { $group: { _id: null, total: { $sum: "$totalDays" } } }
      ]).then(res => res[0]?.total || 0);

      const defaultAllowance = 22;
      if (usedDays < defaultAllowance) {
        const checkDueOver = randomBoolean(0.5);
        if (checkDueOver) {
          const rollover = Math.min(5, defaultAllowance - usedDays); // Cap rollover at 5? or full?
          await Employee.findByIdAndUpdate(employee._id, {
            'vacationTracker.rolloverDays': rollover
          });
        }
      }


      // Create vacation requests (pending, approved, rejected)
      const requestCount = randomInt(1, 4);
      for (let i = 0; i < requestCount; i++) {
        // "show employees on the vacation still till next week. some starting from yesterday, and some ending this week sunday"
        // We force some specific scenarios if random conditions met
        let fromDate, days;
        const scenario = randomInt(0, 15);

        if (scenario === 0) {
          // Case 1: Started yesterday, ends next week Sunday
          // "yesterday" relative to now
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 1);
          // "next week Sunday"
          // Find next Sunday from now
          const dayOfWeek = now.getDay();
          const daysUntilNextSunday = (7 - dayOfWeek) + 7; // Next week's Sunday
          const nextSunday = addDays(now, daysUntilNextSunday);
          days = Math.floor((nextSunday.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        } else if (scenario === 1) {
          // Case 2: Ends this week Sunday
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 4); // Started a few days ago
          const dayOfWeek = now.getDay();
          const daysUntilSunday = 7 - dayOfWeek;
          days = 4 + daysUntilSunday;
        } else if (scenario === 2) {
          // Case 3: "active today, till next week"
          // Starts a few days ago, ends next week
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() - 3);
          days = 10;
        } else if (scenario === 3) {
          // Case 4: "starting from tomorrow"
          fromDate = new Date(now);
          fromDate.setDate(now.getDate() + 1);
          days = 7;
        } else {
          fromDate = randomDateInRange(
            new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
          );
          days = randomInt(2, 7);
        }

        const toDate = addDays(fromDate, days);

        const statuses: ('pending' | 'approved' | 'rejected' | 'cancelled')[] =
          ['pending', 'approved', 'rejected', 'cancelled'];
        let status = pick(statuses);

        // If vacation is in the past, it should be approved or rejected
        if (isPast(fromDate)) {
          status = pick(['approved', 'rejected']);
        }

        // Force scenarios to be approved
        if (scenario >= 0 && scenario <= 3) status = 'approved';

        // Some employees are currently on vacation
        if (fromDate <= now && toDate >= now && randomBoolean(0.3)) {
          status = 'approved';
        }

        const reviewedBy = status !== 'pending'
          ? pick(data.employees?.filter(e => e.roles?.includes('hr') || e.roles?.includes('owner')) || [])?._id
          : undefined;

        const request = await VacationRequest.create({
          employeeId: employee._id,
          requestedFrom: fromDate,
          requestedTo: toDate,
          totalDays: days,
          comments: randomBoolean(0.5) ? 'Family vacation' : undefined,
          status,
          reviewedBy,
          reviewedAt: status !== 'pending' ? randomDateInRange(fromDate, now) : undefined,
          storeDepartmentWarnings: status === 'rejected' ? ['Conflict with schedule'] : undefined
        });

        vacationRequestCount++;

        // If approved (even if currently active), create a RECORD? 
        // Logic usually: Record is created when it is approved? OR after it happens?
        // Usually when approved.
        if (status === 'approved') {
          const record = await VacationRecord.create({
            employeeId: employee._id,
            from: fromDate,
            to: toDate,
            totalDays: days,
            year: fromDate.getFullYear(),
            approvedBy: reviewedBy
          });

          await Employee.findByIdAndUpdate(employee._id, {
            $addToSet: { vacations: record._id },
            $inc: { 'vacationTracker.usedDays': days }
          });
        }
      }
    }

    // 15-25% of employees have absence history
    if (randomBoolean(0.2)) {
      // Create absence records (past absences)
      const recordCount = randomInt(1, 5);
      for (let i = 0; i < recordCount; i++) {
        const date = randomDateInRange(
          yearStart,
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        );

        // Find a schedule for this employee on this date
        const employeeSchedules = schedules.filter(s =>
          s.employees?.some((e: any) => e.toString() === employee._id.toString()) ||
          s.days?.some((d: any) =>
            d.shifts?.some((shift: any) =>
              shift.employees?.some((e: any) => e.toString() === employee._id.toString())
            )
          )
        );

        const schedule = pick(employeeSchedules);
        let shiftRef: any = undefined;

        if (schedule) {
          const day = schedule.days?.find((d: any) =>
            new Date(d.date).toDateString() === date.toDateString()
          );
          const shift = day?.shifts?.find((s: any) =>
            s.employees?.some((e: any) => e.toString() === employee._id.toString())
          );

          if (shift) {
            shiftRef = {
              scheduleId: schedule._id,
              dayDate: date,
              shiftName: shift.shiftName
            };
          }
        }

        const record = await AbsenceRecord.create({
          employeeId: employee._id,
          date,
          reason: pick(['Sick', 'Personal emergency', 'Family matter']),
          type: pick(['sick', 'personal']),
          justification: pick(['Justified', 'Unjustified']),
          shiftRef,
          approvedBy: pick(data.employees?.filter(e => e.roles?.includes('hr') || e.roles?.includes('manager')) || [])?._id
        });

        absenceRecordCount++;

        await Employee.findByIdAndUpdate(employee._id, {
          $addToSet: { absences: record._id }
        });
      }

      // Create absence requests (pending, approved, rejected)
      const requestCount = randomInt(1, 3);
      for (let i = 0; i < requestCount; i++) {
        let date;
        const scenario = randomInt(0, 10);

        if (scenario === 0) {
          // "put employee on absence and tomorrow as well"
          // Generate absence for tomorrow
          date = addDays(now, 1);
        } else if (scenario === 1) {
          // "absence today"
          date = new Date(now);
        } else {
          date = randomDateInRange(
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          );
        }

        const statuses: ('pending' | 'approved' | 'rejected' | 'cancelled')[] =
          ['pending', 'approved', 'rejected', 'cancelled'];
        let status = pick(statuses);

        // If absence is in the past, it should be approved or rejected
        if (isPast(date)) {
          status = pick(['approved', 'rejected']);
        }

        // Some employees are absent tomorrow (triggers coverage)
        // Ensure scenario 0 (Tomorrow) is visible
        if (scenario === 0) {
          status = 'approved';
        } else if (date.toDateString() === addDays(now, 1).toDateString() && randomBoolean(0.2)) {
          status = 'approved';
        } else if (scenario === 1) {
          status = 'approved'; // Today active
        }

        const reviewedBy = status !== 'pending'
          ? pick(data.employees?.filter(e => e.roles?.includes('hr') || e.roles?.includes('manager')) || [])?._id
          : undefined;

        const request = await AbsenceRequest.create({
          employeeId: employee._id,
          date,
          type: pick(['sick', 'late', 'personal']),
          reason: pick(['Feeling unwell', 'Family emergency', 'Transportation issue']),
          justification: status === 'approved' ? pick(['Justified', 'Unjustified']) : undefined,
          status,
          approvedBy: reviewedBy
        });

        absenceRequestCount++;

        // If approved and in the past, create a record
        if (status === 'approved' && isPast(date)) {
          const schedule = pick(schedules.filter(s =>
            s.days?.some((d: any) =>
              new Date(d.date).toDateString() === date.toDateString()
            )
          ));

          let shiftRef: any = undefined;
          if (schedule) {
            const day = schedule.days?.find((d: any) =>
              new Date(d.date).toDateString() === date.toDateString()
            );
            const shift = day?.shifts?.find((s: any) =>
              s.employees?.some((e: any) => e.toString() === employee._id.toString())
            );

            if (shift) {
              shiftRef = {
                scheduleId: schedule._id,
                dayDate: date,
                shiftName: shift.shiftName
              };
            }
          }

          const record = await AbsenceRecord.create({
            employeeId: employee._id,
            date,
            reason: request.reason,
            type: request.type,
            justification: request.justification,
            shiftRef,
            approvedBy: reviewedBy
          });

          await Employee.findByIdAndUpdate(employee._id, {
            $addToSet: { absences: record._id }
          });
        }
      }
    }
  }

  console.log(`✅ Created ${vacationRequestCount} vacation requests`);
  console.log(`✅ Created ${vacationRecordCount} vacation records`);
  console.log(`✅ Created ${absenceRequestCount} absence requests`);
  console.log(`✅ Created ${absenceRecordCount} absence records`);

  return data;
}

