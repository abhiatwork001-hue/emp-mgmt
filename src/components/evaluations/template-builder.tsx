"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, Save, Loader2 } from "lucide-react";
import { createEvaluationTemplate, updateEvaluationTemplate } from "@/lib/actions/evaluation.actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface Question {
    id: string;
    text: string;
    type: 'rating' | 'text' | 'boolean';
    required: boolean;
    weight?: number;
    category?: string;
}

interface TemplateBuilderProps {
    initialData?: any;
    onSuccess?: () => void;
}

export function TemplateBuilder({ initialData, onSuccess }: TemplateBuilderProps) {
    const { data: session } = useSession();
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [questions, setQuestions] = useState<Question[]>(
        initialData?.questions || [{ id: crypto.randomUUID(), text: "", type: "rating", required: true }]
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDescription(initialData.description || "");
            setQuestions(initialData.questions || []);
        }
    }, [initialData]);

    const addQuestion = () => {
        setQuestions([...questions, { id: crypto.randomUUID(), text: "", type: "rating", required: true }]);
    };

    const updateQuestion = (id: string, field: keyof Question, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const removeQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Error", { description: "Title is required" });
            return;
        }
        if (questions.some(q => !q.text.trim())) {
            toast.error("Error", { description: "All questions must have text" });
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title,
                description,
                questions,
                createdBy: (session?.user as any).id
            };

            if (initialData?._id) {
                await updateEvaluationTemplate(initialData._id, payload);
                toast.success("Success", { description: "Template updated successfully" });
            } else {
                await createEvaluationTemplate(payload);
                toast.success("Success", { description: "Template created successfully" });
            }

            if (!initialData) {
                // Reset only on create
                setTitle("");
                setDescription("");
                setQuestions([{ id: crypto.randomUUID(), text: "", type: "rating", required: true }]);
            }
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toast.error("Error", { description: "Failed to save template" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{initialData ? "Edit Template" : "Create New Evaluation Template"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Template Title</label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Q1 Staff Performance Review" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
                </div>

                <div className="space-y-4 mt-6">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold">Questions</label>
                        <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-4 w-4 mr-2" /> Add Question</Button>
                    </div>

                    {questions.map((q, index) => (
                        <Card key={q.id} className="p-4 bg-muted/30">
                            <div className="flex gap-4 items-start">
                                <span className="pt-2 text-sm font-mono text-muted-foreground">{index + 1}.</span>
                                <div className="flex-1 space-y-3">
                                    <Input
                                        value={q.text}
                                        onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                        placeholder="Question text..."
                                    />
                                    <div className="flex gap-4">
                                        <Select value={q.type} onValueChange={(val) => updateQuestion(q.id, 'type', val)}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="rating">Rating Scale (1-5)</SelectItem>
                                                <SelectItem value="text">Text Input</SelectItem>
                                                <SelectItem value="boolean">Yes/No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            className="w-[150px]"
                                            placeholder="Category (optional)"
                                            value={q.category || ""}
                                            onChange={(e) => updateQuestion(q.id, 'category', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-destructive">
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {initialData ? "Update Template" : "Save Template"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
