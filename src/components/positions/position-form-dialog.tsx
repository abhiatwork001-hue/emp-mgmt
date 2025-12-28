"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { createPosition, updatePosition } from "@/lib/actions/position.actions";
import { useRouter } from "next/navigation";
import { Plus, Edit } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    level: z.coerce.number().min(0, "Level must be 0 or higher"),
    isStoreSpecific: z.boolean().default(false),
});

interface PositionFormDialogProps {
    position?: any; // If provided, we are in edit mode
    trigger?: React.ReactNode;
}

export function PositionFormDialog({ position, trigger }: PositionFormDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: position?.name || "",
            level: position?.level || 0,
            isStoreSpecific: position?.isStoreSpecific || false,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (position) {
                await updatePosition(position._id, values);
            } else {
                await createPosition(values);
            }
            setOpen(false);
            form.reset();
            router.refresh();
        } catch (error) {
            console.error("Failed to save position:", error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Position
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{position ? "Edit Position" : "Create Position"}</DialogTitle>
                    <DialogDescription>
                        {position ? "Update position details." : "Add a new position to the organization."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Position Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Store Manager" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hierarchy Level (0-10)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isStoreSpecific"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Store Specific?
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Does this position belong to specific stores?
                                        </p>
                                    </div>
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">Save changes</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
