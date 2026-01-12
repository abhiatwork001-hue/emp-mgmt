"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getEligibleEmployeesForCoverage, inviteCandidatesForCoverage } from "@/lib/actions/coverage.actions";
import { Loader2, UserPlus, Check, Search, ChevronRight, Crown, Users, AlertCircle, Globe, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function InviteCandidatesForm({ request, onSuccess }: { request: any, onSuccess?: () => void }) {
    const props = { request, onSuccess };
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
            setSelected([]);
            setSearched(false); // Reset search view
            if (props.onSuccess) props.onSuccess();
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
        (emp.displayName || `${emp.firstName} ${emp.lastName}`).toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 4-Tier Grouping
    const priority1 = filtered.filter(e => e.priority === 1); // Same Store & Dept
    const priority2 = filtered.filter(e => e.priority === 2); // Global Same Dept
    const priority3 = filtered.filter(e => e.priority === 3); // Global Heads
    const priority4 = filtered.filter(e => e.priority === 4); // Rest of Global

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
                        {emp.storeId?.name || "Global Store"} | {emp.contract?.weeklyHours || 40}h
                    </p>
                </div>
            </div>
            {selected.includes(emp._id) && <Check className="h-4 w-4 text-primary" />}
        </div>
    );

    return (
        <Card className="border-primary/20 bg-primary/5 max-h-[85vh] h-[600px] flex flex-col">
            <CardHeader className="flex-none">
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Target Selection
                </CardTitle>
                <CardDescription>Select eligible candidates to invite for this shift coverage.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col pt-0">
                {!searched && (
                    <div className="flex items-center justify-center h-full">
                        <Button onClick={handleSearch} disabled={loading} className="w-full bg-primary hover:bg-primary/90 font-black italic">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                            Find Available Employees
                        </Button>
                    </div>
                )}

                {searched && (
                    <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Message Input - Moved to Top */}
                        <div className="space-y-2 pb-4 border-b">
                            <Label className="text-xs font-black uppercase text-muted-foreground ml-1">Personal Invitation Message (Optional)</Label>
                            <Textarea
                                placeholder="Add a custom note to the recipients..."
                                value={customMessage}
                                onChange={(e) => setCustomMessage(e.target.value)}
                                className="resize-none h-16 bg-background"
                            />
                        </div>

                        {/* Search Bar */}
                        <div className="relative flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search employees by name..."
                                className="pl-9 h-11 bg-background"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-6">

                            {priority1.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 ml-1 tracking-widest sticky top-0 bg-primary/5 py-1 z-10 backdrop-blur-sm">
                                        <Building2 className="h-3 w-3" /> Same Store & Department
                                    </h3>
                                    <div className="grid gap-2">{priority1.map(renderEmp)}</div>
                                </div>
                            )}

                            {priority2.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1 ml-1 tracking-widest sticky top-0 bg-primary/5 py-1 z-10 backdrop-blur-sm">
                                        <Globe className="h-3 w-3" /> Same Department (Global)
                                    </h3>
                                    <div className="grid gap-2">{priority2.map(renderEmp)}</div>
                                </div>
                            )}

                            {priority3.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1 ml-1 tracking-widest sticky top-0 bg-primary/5 py-1 z-10 backdrop-blur-sm">
                                        <Crown className="h-3 w-3" /> Global Department Heads
                                    </h3>
                                    <div className="grid gap-2">{priority3.map(renderEmp)}</div>
                                </div>
                            )}

                            {priority4.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1 ml-1 tracking-widest sticky top-0 bg-primary/5 py-1 z-10 backdrop-blur-sm">
                                        <ChevronRight className="h-3 w-3" /> Other Global Staff
                                    </h3>
                                    <div className="grid gap-2">{priority4.map(renderEmp)}</div>
                                </div>
                            )}

                            {searched && filtered.length === 0 && (
                                <div className="text-center py-12 bg-background/50 rounded-xl border border-dashed">
                                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                                    <p className="text-sm font-bold text-muted-foreground italic">No candidates found</p>
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer Action */}
                        <div className="flex-none pt-4 mt-auto border-t bg-background/50 backdrop-blur-sm sticky bottom-0 z-20">
                            <div className="flex items-center justify-between text-[11px] font-black uppercase italic mb-2">
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
