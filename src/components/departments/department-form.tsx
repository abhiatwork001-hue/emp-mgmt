"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createGlobalDepartment, updateGlobalDepartment } from "@/lib/actions/department.actions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Department name must be at least 2 characters.",
    }),
    description: z.string().optional(),
});

interface DepartmentFormProps {
    initialData?: {
        _id: string;
        name: string;
        description?: string;
    } | null;
}

export function DepartmentForm({ initialData }: DepartmentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || "",
        } : {
            name: "",
            description: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            if (initialData) {
                await updateGlobalDepartment(initialData._id, values);
            } else {
                await createGlobalDepartment(values);
            }
            router.push("/dashboard/departments");
            router.refresh();
        } catch (error) {
            console.error("Form submission error", error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Department Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter department name" {...field} className="bg-[#1e293b] border-zinc-700 text-white" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter department description"
                                    {...field}
                                    className="bg-[#1e293b] border-zinc-700 text-white min-h-[100px]"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()} className="border-zinc-700 bg-transparent text-white hover:bg-zinc-800">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-gray-200">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Save Changes" : "Create Department"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
