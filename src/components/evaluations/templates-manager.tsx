"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Edit, Trash, FileText, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TemplateBuilder } from "./template-builder";
import { format } from "date-fns";
import { deleteEvaluationTemplate } from "@/lib/actions/evaluation.actions";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Template {
    _id: string;
    title: string;
    description?: string;
    questions: any[];
    createdAt: string;
}

export function TemplatesManager({ initialTemplates }: { initialTemplates: Template[] }) {
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    const handleDelete = async (id: string) => {
        try {
            await deleteEvaluationTemplate(id);
            setTemplates(templates.filter(t => t._id !== id));
            toast.success("Template deleted");
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const handleSuccess = () => {
        setIsDialogOpen(false);
        setEditingTemplate(null);
        // In a real app we might re-fetch or use router.refresh(). 
        // For now, let's assume server action revalidates and we force a reload or rely on parent re-render if practical.
        // Actually, since we pass initialTemplates, we rely on the Page to refresh.
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Evaluation Templates</h2>
                    <p className="text-muted-foreground">Manage templates for staff evaluations.</p>
                </div>
                <Button onClick={() => { setEditingTemplate(null); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Create Template
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <TemplateBuilder initialData={editingTemplate} onSuccess={handleSuccess} />
                </DialogContent>
            </Dialog>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map(template => (
                    <Card key={template._id} className="relative hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg truncate pr-8" title={template.title}>
                                    {template.title}
                                </CardTitle>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setEditingTemplate(template); setIsDialogOpen(true); }}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template._id)}>
                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                                {template.description || "No description provided."}
                            </p>
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground pt-4 border-t flex justify-between">
                            <div className="flex items-center">
                                <FileText className="mr-1 h-3 w-3" />
                                {template.questions?.length || 0} Questions
                            </div>
                            <div>
                                {format(new Date(template.createdAt), "MMM d, yyyy")}
                            </div>
                        </CardFooter>
                    </Card>
                ))}

                {templates.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p>No templates found. Create one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
