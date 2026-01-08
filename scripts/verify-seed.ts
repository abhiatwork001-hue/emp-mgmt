import mongoose from 'mongoose';
import { Employee, Schedule, VacationRecord, AbsenceRequest, Store, StoreDepartment } from '../src/lib/models';
import 'dotenv/config';

async function verifySeed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log('Connected to DB');

        // 1. Verify users
        const techUser = await Employee.findOne({ email: 'tech@chickinho.com' });
        console.log('Tech User:', techUser ? '✅ Found' : '❌ Missing');

        const asish = await Employee.findOne({ email: 'asish.poudel@chickinho.com' });
        console.log('Asish:', asish ? '✅ Found' : '❌ Missing');
        if (asish) console.log('Asish Store:', await Store.findById(asish.storeId).then((s: any) => s?.name));

        // 2. Verify Lx Factory Assignments
        const lx = await Store.findOne({ name: 'Lx Factory' });
        if (lx) {
            const managers = await Employee.find({ _id: { $in: lx.managers } });
            console.log('Lx Managers:', managers.map((m: any) => m.firstName).join(', '));

            const kitchenDept = await StoreDepartment.findOne({ storeId: lx._id, name: { $regex: 'Kitchen' } });
            const fohDept = await StoreDepartment.findOne({ storeId: lx._id, name: { $regex: 'Front' } });

            if (kitchenDept) {
                const head = await Employee.findById(kitchenDept.headOfDepartment);
                console.log('Lx Kitchen Head:', head?.firstName);
                const staff = await Employee.find({ storeDepartmentId: kitchenDept._id });
                console.log('Lx Kitchen Staff Count:', staff.length);
                console.log('Lx Kitchen Staff:', staff.map((s: any) => s.firstName).slice(0, 5).join(', '));
            }

            if (fohDept) {
                const head = await Employee.findById(fohDept.headOfDepartment);
                console.log('Lx FOH Head:', head?.firstName);
                const staff = await Employee.find({ storeDepartmentId: fohDept._id });
                console.log('Lx FOH Staff Count:', staff.length);
            }
        }

        // 3. Verify Vacations "Yesterday"
        const now = new Date();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // We generated requests/records. Let's check records starting yesterday.
        // Allow fuzzy match for "yesterday" due to timezones/seed run time.
        const recentVacations = await VacationRecord.find({
            from: {
                $gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
                $lt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
            }
        });
        console.log(`Found ${recentVacations.length} vacations starting around yesterday.`);

        // 4. Verify Absences "Tomorrow"
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
        const recentAbsences = await AbsenceRequest.find({
            date: {
                $gte: new Date(now.getTime() + 0.5 * 24 * 60 * 60 * 1000),
                $lt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
            }
        });
        console.log(`Found ${recentAbsences.length} absence requests for tomorrow.`);

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verifySeed();
