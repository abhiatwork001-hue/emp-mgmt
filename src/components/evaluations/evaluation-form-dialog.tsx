"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getStoreEmployeesForEvaluation, submitEvaluationResponse, getTemplateById } from "@/lib/actions/evaluation.actions";
import { toast } from "sonner";
import { Loader2, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function EvaluationFormDialog({ assignment, onComplete }: { assignment: any, onComplete?: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [employees, setEmployees] = useState<any[]>([]);
    const [template, setTemplate] = useState<any>(null);

    // Form State
    const [selectedEmployee, setSelectedEmployee] = useState<string>("");
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isAnonymous, setIsAnonymous] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            Promise.all([
                getStoreEmployeesForEvaluation(assignment.storeId._id || assignment.storeId),
                getTemplateById(assignment.templateId._id || assignment.templateId)
            ]).then(([emps, tmpl]) => {
                setEmployees(emps);
                setTemplate(tmpl);
            }).finally(() => setLoading(false));
        }
    }, [open, assignment]);

    const handleAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        if (!selectedEmployee) {
            toast.error("Error", { description: "Please select an employee to evaluate" });
            return;
        }

        // Validate required answers
        const missing = template?.questions.filter((q: any) => q.required && !answers[q.id]);
        if (missing && missing.length > 0) {
            toast.error("Error", { description: `Please answer question: ${missing[0].text}` });
            return;
        }

        setSubmitting(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([qid, val]) => ({ questionId: qid, value: val }));

            await submitEvaluationResponse(assignment._id, selectedEmployee, formattedAnswers, isAnonymous);

            toast.success("Success", { description: "Evaluation submitted" });
            setOpen(false);
            // Reset form
            setSelectedEmployee("");
            setAnswers({});
            onComplete?.();
        } catch (error) {
            toast.error("Error", { description: "Failed to submit evaluation" });
        } finally {
            setSubmitting(false);
        }
    };

    if (!assignment) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full"><Play className="mr-2 h-4 w-4" /> Start Evaluation</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{assignment.templateId?.title || "Evaluation"}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* 1. Select Subject */}
                        <div className="space-y-2">
                            <Label>Employee to Evaluate</Label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp._id} value={emp._id}>
                                            <div className="flex items-center">
                                                <Avatar className="h-6 w-6 mr-2">
                                                    <AvatarImage src={emp.image} />
                                                    <AvatarFallback>{emp.firstName[0]}</AvatarFallback>
                                                </Avatar>
                                                {emp.firstName} {emp.lastName}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Questions */}
                        {template?.questions.map((q: any, i: number) => (
                            <div key={q.id} className="space-y-3 border-t pt-4">
                                <Label className="text-base">{i + 1}. {q.text} {q.required && "*"}</Label>

                                {q.type === 'scale' && (
                                    <div className="px-2">
                                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                            <span>Poor (1)</span>
                                            <span>Excellent (5)</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            step="1"
                                            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                            value={answers[q.id] || 3}
                                            onChange={(e) => handleAnswer(q.id, parseInt(e.target.value))}
                                        />
                                        <div className="text-center mt-2 font-bold text-primary">
                                            {answers[q.id] || 3}/5
                                        </div>
                                    </div>
                                )}

                                {q.type === 'text' && (
                                    <Textarea
                                        placeholder="Write your answer here..."
                                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                                    />
                                )}

                                {q.type === 'boolean' && (
                                    <div className="flex gap-4">
                                        <Button
                                            variant={answers[q.id] === true ? "default" : "outline"}
                                            onClick={() => handleAnswer(q.id, true)}
                                            size="sm"
                                        >
                                            Yes
                                        </Button>
                                        <Button
                                            variant={answers[q.id] === false ? "destructive" : "outline"}
                                            onClick={() => handleAnswer(q.id, false)}
                                            size="sm"
                                        >
                                            No
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* 3. Options */}
                        <div className="flex items-center space-x-2 border-t pt-4">
                            <Checkbox id="anon" checked={isAnonymous} onCheckedChange={(c) => setIsAnonymous(c as boolean)} />
                            <Label htmlFor="anon">Submit Anonymously (Evaluator ID hidden in reports)</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Evaluation
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
