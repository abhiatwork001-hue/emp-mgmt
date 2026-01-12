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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createStore, updateStore, removeStoreDepartment, getStoreDepartmentImpact, archiveStore } from "@/lib/actions/store.actions";
import { Loader2, Trash2, AlertTriangle, Archive } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// ... (existing imports)


const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    address: z.string().min(2, {
        message: "Address must be at least 2 characters.",
    }),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    translations: z.object({
        en: z.object({ name: z.string().optional(), address: z.string().optional() }).optional(),
        pt: z.object({ name: z.string().optional(), address: z.string().optional() }).optional(),
        de: z.object({ name: z.string().optional(), address: z.string().optional() }).optional(),
    }).optional()
});

interface StoreFormProps {
    initialData?: (z.infer<typeof formSchema> & {
        _id: string;
        departments: { _id: string; name: string }[];
    }) | null;
}

export function StoreForm({ initialData = null }: StoreFormProps) {

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("general");
    const t = useTranslations("Common");

    // Department Removal State
    const [deptToRemove, setDeptToRemove] = useState<{ id: string; name: string } | null>(null);
    const [impactData, setImpactData] = useState<{ employeeCount: number; pendingCoverageCount: number } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // Store Archiving State
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        // ... (existing form config)
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // ... (existing submit logic)
        setLoading(true);
        try {
            if (initialData) {
                await updateStore(initialData._id, values);
                toast.success("Store updated successfully");
            } else {
                await createStore(values);
                toast.success("Store created successfully");
            }
            router.push("/dashboard/stores");
            router.refresh();
        } catch (error) {
            console.error("Form submission error", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const handleArchiveStore = async () => {
        if (!initialData) return;
        setIsArchiving(true);
        try {
            await archiveStore(initialData._id);
            toast.success("Store archived successfully");
            router.push("/dashboard/stores");
            router.refresh();
        } catch (error) {
            console.error("Archive store error", error);
            toast.error("Failed to archive store");
            setIsArchiving(false);
        }
    };

    // ... (existing remove dept logic)

    const handleRemoveDepartmentClick = async (deptId: string, deptName: string) => {
        setDeptToRemove({ id: deptId, name: deptName });
        setImpactData(null); // Reset impact data

        // Fetch impact data
        try {
            const impact = await getStoreDepartmentImpact(deptId);
            setImpactData({
                employeeCount: impact.employeeCount,
                pendingCoverageCount: impact.pendingCoverageCount
            });
        } catch (error) {
            console.error("Error fetching impact:", error);
            // Even if impact fetch fails, we allow deletion but with generic message
            setImpactData({ employeeCount: 0, pendingCoverageCount: 0 }); // Fallback
        }
    };

    const confirmRemoveDepartment = async () => {
        if (!initialData || !deptToRemove) return;

        setIsRemoving(true);
        try {
            const result = await removeStoreDepartment(initialData._id, deptToRemove.id);
            if (result.success) {
                toast.success(result.message);
                router.refresh();
            } else {
                toast.error("Failed to remove department");
            }
        } catch (error) {
            console.error("Remove department error:", error);
            toast.error("An error occurred while removing the department");
        } finally {
            setIsRemoving(false);
            setDeptToRemove(null);
            setImpactData(null);
        }
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="translations">Translations</TabsTrigger>
                            <TabsTrigger value="departments" disabled={!initialData}>Departments</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4 pt-4">
                            <div className="max-w-lg space-y-4">
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

                                {initialData && (
                                    <div className="pt-6 border-t border-border/50">
                                        <h3 className="text-sm font-medium text-red-500 mb-4">Danger Zone</h3>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm text-red-500">Archive this store</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Archiving a store will hide it from the dashboard and prevent new data entry.
                                                    Historical data will be preserved.
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setShowArchiveDialog(true)}
                                            >
                                                <Archive className="mr-2 h-4 w-4" />
                                                Archive Store
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="translations" className="space-y-6 pt-4">
                            <div className="max-w-lg space-y-6">

                                {(['en', 'pt', 'de'] as const).map((lang) => (

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
                            </div>
                        </TabsContent>

                        <TabsContent value="departments" className="space-y-6 pt-4">
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium">Store Departments</h3>
                                    {/* Can add 'Add Department' button here if needed later */}
                                </div>

                                {initialData?.departments && initialData.departments.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {initialData.departments.map((dept) => (
                                            <Card key={dept._id} className="border-border/50 bg-black/20">
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <CardTitle className="text-base font-medium">
                                                        {dept.name}
                                                    </CardTitle>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                        onClick={() => handleRemoveDepartmentClick(dept._id, dept.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </CardHeader>
                                                <CardContent>
                                                    <CardDescription className="text-xs">
                                                        ID: {dept._id}
                                                    </CardDescription>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground">
                                        No departments found for this store.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button type="submit" disabled={loading} className="w-full max-w-lg">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save')}
                    </Button>
                </form>
            </Form>

            <AlertDialog open={!!deptToRemove} onOpenChange={(open) => !open && setDeptToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Department: {deptToRemove?.name}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>Are you sure you want to remove this department? This action cannot be undone.</p>

                            {impactData ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-500">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-medium">Impact Warning:</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li><strong>{impactData.employeeCount}</strong> employees will be unassigned.</li>
                                                <li><strong>{impactData.pendingCoverageCount}</strong> pending coverage requests will be cancelled.</li>
                                                <li>Historical data (vacations, absences, schedules) will be preserved.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmRemoveDepartment();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isRemoving || !impactData}
                        >
                            {isRemoving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                "Remove Department"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Store</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive this store? This will hide it from the dashboard and disable access for store managers.
                            <br /><br />
                            This action can be reversed by an administrator.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleArchiveStore();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isArchiving}
                        >
                            {isArchiving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Archiving...
                                </>
                            ) : (
                                "Archive Store"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
