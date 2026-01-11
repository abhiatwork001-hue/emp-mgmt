"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Megaphone } from "lucide-react";
import { reportProblem } from "@/lib/actions/problem.actions"; // We'll create this next

import { useTranslations } from "next-intl";

const createFormSchema = (t: any) => z.object({
    recipientRole: z.string().min(1, t('validation.recipientRequired')),
    priority: z.enum(["low", "medium", "high"]),
    type: z.string().min(1, t('validation.typeRequired')),
    title: z.string().min(5, t('validation.titleLength')),
    description: z.string().min(10, t('validation.descriptionLength')),
});

interface ReportProblemDialogProps {
    reporterId: string;
    storeId?: string;
    departmentId?: string;
}

export function ReportProblemDialog({ reporterId, storeId, departmentId }: ReportProblemDialogProps) {
    const t = useTranslations("ReportProblem");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formSchema = createFormSchema(t);

    const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            recipientRole: "",
            priority: "medium",
            type: "",
            title: "",
            description: "",
        },
    });

    const onSubmit = async (values: z.infer<ReturnType<typeof createFormSchema>>) => {
        setIsSubmitting(true);
        try {
            const res = await reportProblem({
                reporterId,
                recipientRole: values.recipientRole,
                priority: values.priority,
                type: values.type,
                title: values.title,
                description: values.description,
                relatedStoreId: storeId,
                relatedDepartmentId: departmentId,
            });

            if (res.success) {
                toast.success(t('toast.success'), {
                    description: t('toast.successDesc')
                });
                setOpen(false);
                form.reset();
            } else {
                toast.error(t('toast.error'));
            }
        } catch (error) {
            toast.error(t('toast.genericError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title={t('title')}>
                    <AlertTriangle className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        {t('title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('description')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="recipientRole"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('fields.recipient.label')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('fields.recipient.placeholder')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="store_manager">{t('fields.recipient.options.store_manager')}</SelectItem>
                                            <SelectItem value="store_department_head">{t('fields.recipient.options.store_department_head')}</SelectItem>
                                            <SelectItem value="head_of_department">{t('fields.recipient.options.head_of_department')}</SelectItem>
                                            <SelectItem value="chef">{t('fields.recipient.options.chef')}</SelectItem>
                                            <SelectItem value="hr">{t('fields.recipient.options.hr')}</SelectItem>
                                            <SelectItem value="owner">{t('fields.recipient.options.owner')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('fields.priority.label')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('fields.priority.placeholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">{t('fields.priority.options.low')}</SelectItem>
                                                <SelectItem value="medium">{t('fields.priority.options.medium')}</SelectItem>
                                                <SelectItem value="high" className="text-destructive font-semibold">{t('fields.priority.options.high')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('fields.type.label')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('fields.type.placeholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="equipment">{t('fields.type.options.equipment')}</SelectItem>
                                                <SelectItem value="personnel">{t('fields.type.options.personnel')}</SelectItem>
                                                <SelectItem value="maintenance">{t('fields.type.options.maintenance')}</SelectItem>
                                                <SelectItem value="safety">{t('fields.type.options.safety')}</SelectItem>
                                                <SelectItem value="stock">{t('fields.type.options.stock')}</SelectItem>
                                                <SelectItem value="other">{t('fields.type.options.other')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('fields.title.label')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('fields.title.placeholder')} {...field} />
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
                                    <FormLabel>{t('fields.problemDescription.label')}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t('fields.problemDescription.placeholder')}
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                {t('buttons.cancel')}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('buttons.submitting')}
                                    </>
                                ) : (
                                    <>
                                        {t('buttons.submit')}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
