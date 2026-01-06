"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getEligibleEmployeesForCoverage, inviteCandidatesForCoverage } from "@/lib/actions/coverage.actions";
import { Loader2, UserPlus, Check, Search, ChevronRight, Crown, Users, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function InviteCandidatesForm({ request }: { request: any }) {
    const [eligible, setEligible] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [inviting, setInviting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [customMessage, setCustomMessage] = useState("");

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await getEligibleEmployeesForCoverage(request._id);
            setEligible(res);
            setSearched(true);
        } catch (error) {
            toast.error("Failed to find employees");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async () => {
        if (selected.length === 0) return;
        setInviting(true);
        try {
            await inviteCandidatesForCoverage(request._id, selected, customMessage);
            toast.success(`Invited ${selected.length} employees`);
        } catch (error) {
            toast.error("Failed to send invitations");
        } finally {
            setInviting(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const filtered = eligible.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const heads = filtered.filter(e => e.priority === 1);
    const dept = filtered.filter(e => e.priority === 2);
    const global = filtered.filter(e => e.priority === 3);

    const renderEmp = (emp: any) => (
        <div key={emp._id} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selected.includes(emp._id) ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/50'}`} onClick={() => toggleSelect(emp._id)}>
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={selected.includes(emp._id)}
                    onCheckedChange={() => { }} // Handle click on parent
                />
                <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={emp.image} />
                    <AvatarFallback>{emp.firstName[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{emp.firstName} {emp.lastName}</span>
                        {emp.isGlobalHead && <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[9px] h-4 font-black">HEAD</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                        {emp.isSameDept ? "Same Dept" : "Global Staff"} | {emp.contract?.weeklyHours || 40}h
                    </p>
                </div>
            </div>
            {selected.includes(emp._id) && <Check className="h-4 w-4 text-primary" />}
        </div>
    );

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Target Selection
                </CardTitle>
                <CardDescription>Select eligible candidates to invite for this shift coverage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!searched && (
                    <Button onClick={handleSearch} disabled={loading} className="w-full bg-primary hover:bg-primary/90 font-black italic">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                        Find Available Employees
                    </Button>
                )}

                {searched && (
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employees by name..."
                                className="pl-9 h-11"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                            {heads.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1 ml-1 tracking-widest">
                                        <Crown className="h-3 w-3" /> Global Department Heads
                                    </h3>
                                    <div className="grid gap-2">{heads.map(renderEmp)}</div>
                                </div>
                            )}

                            {dept.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 ml-1 tracking-widest">
                                        <Users className="h-3 w-3" /> Same Department
                                    </h3>
                                    <div className="grid gap-2">{dept.map(renderEmp)}</div>
                                </div>
                            )}

                            {global.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1 ml-1 tracking-widest">
                                        <ChevronRight className="h-3 w-3" /> Other Available Global Staff
                                    </h3>
                                    <div className="grid gap-2">{global.map(renderEmp)}</div>
                                </div>
                            )}

                            {searched && filtered.length === 0 && (
                                <div className="text-center py-12 bg-background/50 rounded-xl border border-dashed">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold text-muted-foreground italic">No candidates found</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Personal Invitation Message (Optional)</Label>
                            <Textarea
                                placeholder="Add a custom note to the recipients..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="resize-none"
                            />
                        </div>

                        <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 border-t flex flex-col gap-3">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase italic">
                                <span className="text-muted-foreground">Selected Recipients</span>
                                <span className="text-primary">{selected.length} Targeted</span>
                            </div>
                            <Button onClick={handleInvite} disabled={inviting || selected.length === 0} className="w-full bg-primary hover:bg-primary/90 h-12 font-black italic text-lg shadow-lg shadow-primary/20">
                                {inviting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                                Send Invite Request
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
