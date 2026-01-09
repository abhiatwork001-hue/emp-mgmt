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
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";
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
import { Plus, Edit, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    level: z.number().min(0, "Level must be 0 or higher"),
    isStoreSpecific: z.boolean(),
    isDepartmentSpecific: z.boolean(),
    roles: z.array(z.string()),
    permissions: z.array(z.string()),
    description: z.string().optional(),
    translations: z.record(z.string(), z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        title: z.string().optional(),
        label: z.string().optional(),
    })).optional(),
});

const PERMISSION_GROUPS = [
    {
        label: "Scheduling & Operations",
        permissions: [
            { id: "create_schedule", label: "Create & Edit Schedules", description: "Can draft and modify weekly schedules." },
            { id: "review_schedule", label: "Approve Schedules", description: "Can approve or reject sent schedules." },
            { id: "manage_store", label: "Manage Store Settings", description: "Full access to store operations." },
        ]
    },
    {
        label: "Team Management",
        permissions: [
            { id: "create_employee", label: "Hire Employees", description: "Can create new employee records." },
            { id: "edit_employee", label: "Modify Employee Info", description: "Can update profiles and contracts." },
            { id: "manage_storeDepartmentEmployee", label: "Assign to Departments", description: "Move employees between teams." },
        ]
    },
    {
        label: "Organization & Structure",
        permissions: [
            { id: "manage_department", label: "Manage Global Depts", description: "Edit company-wide departments." },
            { id: "manage_storeDepartment", label: "Manage Store Depts", description: "Configure departments within a store." },
        ]
    }
];

interface PositionFormDialogProps {
    position?: any; // If provided, we are in edit mode
    trigger?: React.ReactNode;
    availableRoles?: any[]; // Passed from parent
}

export function PositionFormDialog({ position, trigger, availableRoles = [] }: PositionFormDialogProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const t = useTranslations("Common");
    const [activeTab, setActiveTab] = useState("general");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: position?.name || "",
            level: position?.level || 0,
            isStoreSpecific: position?.isStoreSpecific || false,
            isDepartmentSpecific: position?.isDepartmentSpecific || false,
            description: position?.description || "",
            // position.roles might be populated objects -> map to _id, or strings
            roles: position?.roles?.map((r: any) => typeof r === 'string' ? r : r._id) || [],
            permissions: position?.permissions || [],
            translations: position?.translations || {
                en: { name: "", description: "" },
                pt: { name: "", description: "" },
                de: { name: "", description: "" },
            },
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
                        <Plus className="mr-2 h-4 w-4" /> {position ? t('edit') : t('add')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{position ? t('edit') : t('add')} Position</DialogTitle>
                    <DialogDescription>
                        {position ? "Define what this position is allowed to do." : "Create a new position with specific capabilities."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="general">{t('general') || 'General'}</TabsTrigger>
                                <TabsTrigger value="translations">{t('translations') || 'Translations'}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="general" className="space-y-6 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('name')}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Sushi Chef" {...field} />
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
                                                <FormLabel>Hierarchy Level</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                    />
                                                </FormControl>
                                                <DialogDescription className="text-xs">Higher levels represent more seniority (0-10).</DialogDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Internal Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Describe the responsibilities..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm uppercase tracking-wider">Functions & Capabilities</h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="permissions"
                                            render={({ field }) => (
                                                <>
                                                    {PERMISSION_GROUPS.map((group) => (
                                                        <div key={group.label} className="space-y-3">
                                                            <Badge variant="outline" className="rounded-sm font-bold text-[10px] tracking-widest uppercase bg-muted/50 border-primary/20">{group.label}</Badge>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {group.permissions.map((perm) => {
                                                                    const isChecked = field.value?.includes(perm.id);
                                                                    return (
                                                                        <div
                                                                            key={perm.id}
                                                                            onClick={() => {
                                                                                const newVal = isChecked
                                                                                    ? field.value.filter((v: string) => v !== perm.id)
                                                                                    : [...(field.value || []), perm.id];
                                                                                field.onChange(newVal);
                                                                            }}
                                                                            className={cn(
                                                                                "flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-3 cursor-pointer transition-all select-none",
                                                                                isChecked ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-card hover:bg-muted/50 border-border/60"
                                                                            )}
                                                                        >
                                                                            <Checkbox checked={isChecked} />
                                                                            <div className="space-y-1">
                                                                                <Label className="text-sm font-bold cursor-pointer pointer-events-none">{perm.label}</Label>
                                                                                <p className="text-[10px] text-muted-foreground leading-tight pointer-events-none">{perm.description}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4 text-primary" />
                                        <h4 className="font-semibold text-sm uppercase tracking-wider">Scope & Restriction</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="isStoreSpecific"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-4 bg-muted/10">
                                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-sm font-bold">Store Specific</FormLabel>
                                                        <p className="text-[10px] text-muted-foreground">Limited to selected stores.</p>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="isDepartmentSpecific"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border p-4 bg-muted/10">
                                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="text-sm font-bold">Dept. Specific</FormLabel>
                                                        <p className="text-[10px] text-muted-foreground">Limited to assigned department.</p>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                            name={`translations.${lang}.description`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Localized Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder={`Description in ${lang}...`} {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                ))}
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end pt-4 border-t gap-3">
                            <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit">{t('save')}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
