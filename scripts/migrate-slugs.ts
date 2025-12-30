import "dotenv/config";
import mongoose from "mongoose";
import {
    Employee,
    Position,
    Task,
    Notice,
    Note,
    Schedule,
    StoreDepartment
} from "../src/lib/models";
import { slugify } from "../src/lib/utils";

async function migrate() {
    console.log("Connecting to MongoDB...");
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    // --- Migrate Employees ---
    console.log("Migrating Employees...");
    const employees = await Employee.find({ slug: { $exists: false } });
    for (const emp of employees) {
        let baseSlug = slugify(`${emp.firstName} ${emp.lastName}`);
        let slug = baseSlug;
        let counter = 1;
        while (await Employee.findOne({ slug, _id: { $ne: emp._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        emp.slug = slug;
        await emp.save();
        console.log(`Updated Employee: ${emp.firstName} ${emp.lastName} -> ${slug}`);
    }

    // --- Migrate Positions ---
    console.log("Migrating Positions...");
    const positions = await Position.find({ slug: { $exists: false } });
    for (const pos of positions) {
        let baseSlug = slugify(pos.name);
        let slug = baseSlug;
        let counter = 1;
        while (await Position.findOne({ slug, _id: { $ne: pos._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        pos.slug = slug;
        await pos.save();
        console.log(`Updated Position: ${pos.name} -> ${slug}`);
    }

    // --- Migrate Tasks ---
    console.log("Migrating Tasks...");
    const tasks = await Task.find({ slug: { $exists: false } });
    for (const task of tasks) {
        let baseSlug = slugify(task.title);
        let slug = baseSlug;
        let counter = 1;
        while (await Task.findOne({ slug, _id: { $ne: task._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        task.slug = slug;
        await task.save();
        console.log(`Updated Task: ${task.title} -> ${slug}`);
    }

    // --- Migrate Notices ---
    console.log("Migrating Notices...");
    const notices = await Notice.find({ slug: { $exists: false } });
    for (const notice of notices) {
        let baseSlug = slugify(notice.title);
        let slug = baseSlug;
        let counter = 1;
        while (await Notice.findOne({ slug, _id: { $ne: notice._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        notice.slug = slug;
        await notice.save();
        console.log(`Updated Notice: ${notice.title} -> ${slug}`);
    }

    // --- Migrate Notes ---
    console.log("Migrating Notes...");
    const notes = await Note.find({ slug: { $exists: false } });
    for (const note of notes) {
        let baseSlug = slugify(note.title || "Note");
        let slug = baseSlug;
        let counter = 1;
        while (await Note.findOne({ slug, _id: { $ne: note._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        note.slug = slug;
        await note.save();
        console.log(`Updated Note: ${note.title} -> ${slug}`);
    }

    // --- Migrate Schedules ---
    console.log("Migrating Schedules...");
    const schedules = await Schedule.find({ slug: { $exists: false } }).populate({
        path: 'storeDepartmentId',
        select: 'name slug'
    });
    for (const schedule of schedules) {
        const deptName = (schedule.storeDepartmentId as any)?.name || "dept";
        let baseSlug = slugify(`${schedule.year}-w${schedule.weekNumber}-${deptName}`);
        let slug = baseSlug;
        let counter = 1;
        while (await Schedule.findOne({ slug, _id: { $ne: schedule._id } })) {
            slug = `${baseSlug}-${counter++}`;
        }
        schedule.slug = slug;
        await schedule.save();
        console.log(`Updated Schedule: ${schedule.year} W${schedule.weekNumber} -> ${slug}`);
    }

    console.log("Migration Complete!");
    process.exit(0);
}

migrate().catch(e => {
    console.error(e);
    process.exit(1);
});
