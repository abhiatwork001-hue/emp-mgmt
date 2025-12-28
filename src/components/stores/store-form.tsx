"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
    translations: z.record(z.string(), z.object({
        name: z.string().optional(),
        address: z.string().optional(),
    })).optional(),
});

interface StoreFormProps {
    initialData?: {
        _id: string;
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        translations?: any;
    } | null;
}

export function StoreForm({ initialData }: StoreFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    const t = useTranslations("Common");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            address: initialData.address || "",
            phone: initialData.phone || "",
            email: initialData.email || "",
            translations: initialData.translations || {
                en: { name: "", address: "" },
                pt: { name: "", address: "" },
                de: { name: "", address: "" },
            },
        } : {
            name: "",
            address: "",
            phone: "",
            email: "",
            translations: {
                en: { name: "", address: "" },
                pt: { name: "", address: "" },
                de: { name: "", address: "" },
            },
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
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Downtown Branch" {...field} />
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
                                    <FormLabel>Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 123 Main St, Springfield" {...field} />
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
                                        <FormLabel>Phone (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 234 567 890" {...field} />
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
                                        <FormLabel>Email (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="store@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
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
                                                <Input placeholder={`Name in ${lang}...`} {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`translations.${lang}.address`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Localized Address</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder={`Address in ${lang}...`} {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>

                <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('save')}
                </Button>
            </form>
        </Form>
    );
}
