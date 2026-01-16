"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListTodo } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

interface AssignTaskButtonProps {
    employee: any;
    currentUser: any;
}

import { useTranslations } from "next-intl";

export function AssignTaskButton({ employee, currentUser }: AssignTaskButtonProps) {
    const [open, setOpen] = useState(false);
    const t = useTranslations("Employees.assignTask");

    const initialAssignments = [
        {
            type: 'individual',
            id: employee._id,
            label: t('individual', { name: `${employee.firstName} ${employee.lastName}` })
        }
    ];

    // Minimal context to satisfy validation if needed, 
    // but relies on initialAssignment for the actual functionality 
    // without needing full lists.
    const mockEmployees = [employee];

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="w-full gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
            >
                <ListTodo className="h-4 w-4" />
                {t('button')}
            </Button>

            <CreateTaskDialog
                open={open}
                onOpenChange={setOpen}
                currentUserId={currentUser.id}
                currentUser={currentUser}
                initialAssignments={initialAssignments}
                // Pass limited context; the dialog handles empty optional lists gracefully now.
                // We pass 'employee' in managers list so if they try to re-select 'Individual', 
                // this employee is available to be found.
                managers={mockEmployees}
            />
        </>
    );
}
