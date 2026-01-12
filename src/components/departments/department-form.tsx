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
import { Loader2, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Department name must be at least 2 characters.",
    }),
    description: z.string().optional(),
    translations: z.record(z.string(), z.object({
        name: z.string().optional(),
        description: z.string().optional(),
    })).optional(),
});

interface DepartmentFormProps {
    initialData?: {
        _id: string;
        name: string;
        description?: string;
        translations?: any;
    } | null;
}

export function DepartmentForm({ initialData }: DepartmentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    const t = useTranslations("Common");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || "",
            translations: initialData.translations || {
                en: { name: "", description: "" },
                pt: { name: "", description: "" },
                de: { name: "", description: "" },
            },
        } : {
            name: "",
            description: "",
            translations: {
                en: { name: "", description: "" },
                pt: { name: "", description: "" },
                de: { name: "", description: "" },
            },
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            if (initialData) {
                await updateGlobalDepartment(initialData._id, values);
                toast.success("Department updated successfully");
            } else {
                await createGlobalDepartment(values);
                toast.success("Department created successfully");
            }
            router.push("/dashboard/departments");
            router.refresh();
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Failed to save department. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="translations">Translations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground">{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter department name" {...field} className="bg-muted/50 border-border text-foreground" />
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
                                    <FormLabel className="text-foreground">Description</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Textarea
                                                placeholder="Enter department description"
                                                {...field}
                                                className="bg-muted/50 border-border text-foreground min-h-[100px]"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </TabsContent>

                    <TabsContent value="translations" className="space-y-6 pt-4">
                        {['en', 'pt', 'de'].map((lang) => (
                            <div key={lang} className="space-y-4 border rounded-lg p-4 bg-muted/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">{lang === 'en' ? '🇬🇧' : lang === 'pt' ? '🇵🇹' : '🇩🇪'}</span>
                                    <h4 className="font-semibold uppercase text-xs tracking-wider">{lang} - Translation</h4>
                                </div>
                                <FormField
                                    control={form.control}
                                    name={`translations.${lang}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Localized Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder={`Name in ${lang}...`} {...field} className="bg-muted/50 border-border" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`translations.${lang}.description`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Localized Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder={`Description in ${lang}...`} {...field} className="bg-muted/50 border-border" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>

                <div className="flex gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()} className="border-border bg-transparent text-foreground hover:bg-muted">
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Save Changes" : "Create Department"}
                    </Button>
                </div>
            </form>

            {initialData && (
                <div className="mt-8 pt-8 border-t border-border">
                    <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Archiving a department will hide it from all lists and prevent new assignments. Existing data is preserved.
                    </p>
                    <Button
                        variant="destructive"
                        type="button"
                        onClick={async () => {
                            if (confirm("Are you sure you want to archive this department? This action cannot be easily undone.")) {
                                setLoading(true);
                                try {
                                    const { archiveGlobalDepartment } = await import("@/lib/actions/department.actions");
                                    await archiveGlobalDepartment(initialData._id);
                                    toast.success("Department archived successfully");
                                    router.push("/dashboard/departments");
                                    router.refresh();
                                } catch (error) {
                                    console.error("Archive error", error);
                                    toast.error("Failed to archive department");
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                        Archive Department
                    </Button>
                </div>
            )}
        </Form>
    );
}
