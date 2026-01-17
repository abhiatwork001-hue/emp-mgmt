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

import { EditStoreDepartmentDialog } from "./edit-store-department-dialog";

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
    minEmployees: z.number(),
    maxEmployees: z.number(),
    targetWeeklyHours: z.number(),
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
    const t = useTranslations("Stores.form");
    const tCommon = useTranslations("Common");

    // Department Removal State
    const [deptToRemove, setDeptToRemove] = useState<{ id: string; name: string } | null>(null);
    const [impactData, setImpactData] = useState<{ employeeCount: number; pendingCoverageCount: number } | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // Store Archiving State
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            address: initialData.address || "",
            phone: initialData.phone || "",
            email: initialData.email || "",
            minEmployees: (initialData as any).minEmployees || 0,
            maxEmployees: (initialData as any).maxEmployees || 0,
            targetWeeklyHours: (initialData as any).targetWeeklyHours || 0,
            translations: initialData.translations as any
        } : {
            name: "",
            address: "",
            phone: "",
            email: "",
            minEmployees: 0,
            maxEmployees: 0,
            targetWeeklyHours: 0,
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // ... (existing submit logic)
        setLoading(true);
        try {
            if (initialData) {
                await updateStore(initialData._id, values);
                toast.success(t('toasts.updated'));
            } else {
                await createStore(values);
                toast.success(t('toasts.created'));
            }
            router.push("/dashboard/stores");
            router.refresh();
        } catch (error) {
            console.error("Form submission error", error);
            toast.error(t('toasts.error'));
        } finally {
            setLoading(false);
        }
    }

    const handleArchiveStore = async () => {
        if (!initialData) return;
        setIsArchiving(true);
        try {
            await archiveStore(initialData._id);
            toast.success(t('toasts.archived'));
            router.push("/dashboard/stores");
            router.refresh();
        } catch (error) {
            console.error("Archive store error", error);
            toast.error(t('toasts.archiveError'));
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
                toast.success(t('toasts.removeDeptSuccess'));
                router.refresh();
            } else {
                toast.error(t('toasts.removeDeptError'));
            }
        } catch (error) {
            console.error("Remove department error:", error);
            toast.error(t('toasts.genericError'));
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
                            <TabsTrigger value="general">{t('tabs.general')}</TabsTrigger>
                            <TabsTrigger value="translations">{t('tabs.translations')}</TabsTrigger>
                            <TabsTrigger value="departments" disabled={!initialData}>{t('tabs.departments')}</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4 pt-4">
                            <div className="max-w-lg space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('labels.name')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('placeholders.name')} {...field} />
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
                                            <FormLabel>{t('labels.address')}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={t('placeholders.address')} {...field} />
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
                                                <FormLabel>{t('labels.phone')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('placeholders.phone')} {...field} />
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
                                                <FormLabel>{t('labels.email')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder={t('placeholders.email')} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-muted-foreground">Store Targets & Limits</h4>
                                        {initialData?.departments && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-auto px-2 text-xs text-blue-500 hover:text-blue-600"
                                                onClick={() => {
                                                    const combined = initialData.departments.reduce((acc, dept: any) => ({
                                                        min: acc.min + (dept.minEmployees || 0),
                                                        max: acc.max + (dept.maxEmployees || 0),
                                                        hours: acc.hours + (dept.targetWeeklyHours || 0)
                                                    }), { min: 0, max: 0, hours: 0 });

                                                    form.setValue("minEmployees", combined.min, { shouldDirty: true });
                                                    form.setValue("maxEmployees", combined.max, { shouldDirty: true });
                                                    form.setValue("targetWeeklyHours", combined.hours, { shouldDirty: true });
                                                    toast.success("Applied combined totals from departments");
                                                }}
                                            >
                                                Auto-fill from Departments
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="minEmployees"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Min Employees</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="maxEmployees"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Max Employees</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="targetWeeklyHours"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Target Weekly Hours</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {initialData && (
                                    <div className="pt-6 border-t border-border/50">
                                        <h3 className="text-sm font-medium text-red-500 mb-4">{t('danger.title')}</h3>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-sm text-red-500">{t('danger.archiveTitle')}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('danger.archiveDesc')}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setShowArchiveDialog(true)}
                                            >
                                                <Archive className="mr-2 h-4 w-4" />
                                                {t('danger.archiveButton')}
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
                                                    <FormLabel className="text-xs">{t('labels.localizedName')}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('placeholders.nameIn', { lang })} {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`translations.${lang}.address`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">{t('labels.localizedAddress')}</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder={t('placeholders.addressIn', { lang })} {...field} />
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
                                    <h3 className="text-lg font-medium">{t('departments.title')}</h3>
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
                                                    <div className="flex items-center gap-1">
                                                        <EditStoreDepartmentDialog department={dept as any} />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                            onClick={() => handleRemoveDepartmentClick(dept._id, dept.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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
                                        {t('departments.empty')}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button type="submit" disabled={loading} className="w-full max-w-lg">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {tCommon('save')}
                    </Button>
                </form>
            </Form>

            <AlertDialog open={!!deptToRemove} onOpenChange={(open) => !open && setDeptToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('dialogs.removeDeptTitle', { name: deptToRemove?.name || '' })}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>{t('dialogs.removeDeptDesc')}</p>

                            {impactData ? (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-500">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-medium">{t('dialogs.impactWarning')}</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li><strong>{impactData.employeeCount}</strong> {t('dialogs.impactEmployees', { count: impactData.employeeCount })}</li>
                                                <li><strong>{impactData.pendingCoverageCount}</strong> {t('dialogs.impactCoverage', { count: impactData.pendingCoverageCount })}</li>
                                                <li>{t('dialogs.impactHistory')}</li>
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
                        <AlertDialogCancel disabled={isRemoving}>{tCommon('cancel')}</AlertDialogCancel>
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
                                    {t('dialogs.removing')}
                                </>
                            ) : (
                                t('dialogs.removeButton')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('dialogs.archiveTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('dialogs.archiveDesc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isArchiving}>{tCommon('cancel')}</AlertDialogCancel>
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
                                    {t('dialogs.archiving')}
                                </>
                            ) : (
                                t('dialogs.archiveButton')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
