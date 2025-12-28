import { EmployeeForm } from "@/components/employees/employee-form";

export default function NewEmployeePage() {
    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Add New Employee</h1>
                <p className="text-zinc-400">Create a new employee record and assign them to a store.</p>
            </div>

            <div className="bg-[#1e293b] border border-zinc-800 rounded-lg p-6">
                <EmployeeForm />
            </div>
        </div>
    );
}
