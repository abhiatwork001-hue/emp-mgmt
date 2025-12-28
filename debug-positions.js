const { Position, Employee } = require("./src/lib/models");
const dbConnect = require("./src/lib/db").default;

async function checkData() {
    await dbConnect();

    // 1. Check Positions counts
    const totalPositions = await Position.countDocuments({});
    const activePositions = await Position.countDocuments({ active: true });
    console.log(`Positions: Total=${totalPositions}, Active=${activePositions}`);

    // 2. Check Employee History for user3 (from screenshot)
    const employee = await Employee.findOne({ email: "user3@chickmaster.local" });
    if (employee) {
        console.log(`Employee found: ${employee.firstName} ${employee.lastName}`);
        console.log(`History Length: ${employee.positionHistory?.length || 0}`);
        console.log("History items:", JSON.stringify(employee.positionHistory, null, 2));
    } else {
        console.log("Employee user3@chickmaster.local not found");
        // Try finding any employee with history
        const empWithHistory = await Employee.findOne({ "positionHistory.0": { $exists: true } });
        if (empWithHistory) {
            console.log(`Other employee with history: ${empWithHistory.firstName}, Length: ${empWithHistory.positionHistory.length}`);
        }
    }
    process.exit(0);
}

checkData();
