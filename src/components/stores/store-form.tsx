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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createStore, updateStore } from "@/lib/actions/store.actions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Store name must be at least 2 characters.",
    }),
    address: z.string().min(5, {
        message: "Address must be at least 5 characters.",
    }),
    phone: z.string().optional(),
    email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
});

interface StoreFormProps {
    initialData?: {
        _id: string;
        name: string;
        address?: string;
        phone?: string;
        email?: string;
    } | null;
}

export function StoreForm({ initialData }: StoreFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            address: initialData.address || "",
            phone: initialData.phone || "",
            email: initialData.email || "",
        } : {
            name: "",
            address: "",
            phone: "",
            email: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            if (initialData) {
                await updateStore(initialData._id, values);
            } else {
                await createStore(values);
            }
            router.push("/dashboard/stores");
            router.refresh(); // Refresh to show new data
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
                            <FormLabel className="text-white">Store Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Downtown Branch" {...field} className="bg-[#1e293b] border-zinc-700 text-white" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Address</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. 123 Main St, Springfield" {...field} className="bg-[#1e293b] border-zinc-700 text-white" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Phone (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 234 567 890" {...field} className="bg-[#1e293b] border-zinc-700 text-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-white">Email (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="store@example.com" {...field} className="bg-[#1e293b] border-zinc-700 text-white" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-gray-200 w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Save Changes" : "Create Store"}
                </Button>
            </form>
        </Form>
    );
}
