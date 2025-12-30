"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2 } from "lucide-react";
import { searchUsers, createDirectChat, createGroupChat } from "@/lib/actions/message.actions";
// Assuming useDebounce exists or I implement simple timeout. I'll implement simple timeout.

interface NewChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
}

export function NewChatDialog({ open, onOpenChange, currentUserId }: NewChatDialogProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [groupName, setGroupName] = useState("");

    // Debounce Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (search.trim()) {
                setIsLoading(true);
                const users = await searchUsers(search, currentUserId);
                setResults(users);
                setIsLoading(false);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [search, currentUserId]);

    const toggleUser = (user: any) => {
        if (selectedUsers.some(u => u._id === user._id)) {
            setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleStartChat = async () => {
        if (selectedUsers.length === 0) return;
        setIsCreating(true);

        try {
            if (selectedUsers.length === 1) {
                // Direct Chat
                const res = await createDirectChat(currentUserId, selectedUsers[0]._id);
                if (res.success) {
                    onOpenChange(false);
                    router.push(`/dashboard/messages/${res.conversationId}`);
                }
            } else {
                // Group Chat
                const name = groupName.trim() || `Group with ${selectedUsers.map(u => u.firstName).join(", ")}`;
                const res = await createGroupChat(currentUserId, name, selectedUsers.map(u => u._id));
                if (res.success) {
                    onOpenChange(false);
                    router.push(`/dashboard/messages/${res.conversationId}`);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedUsers.map(u => (
                                <div key={u._id} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                    {u.firstName} {u.lastName}
                                    <button onClick={() => toggleUser(u)} className="hover:text-red-500">×</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Group Name Input (Only if multiple selected) */}
                    {selectedUsers.length > 1 && (
                        <Input
                            placeholder="Group Name (Optional)"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Input
                            placeholder="Search colleagues..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {isLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>

                    {/* Results List */}
                    <ScrollArea className="h-[200px] border rounded-md">
                        <div className="p-2 space-y-1">
                            {results.length === 0 && search.trim() && !isLoading && (
                                <p className="text-center text-muted-foreground text-sm py-4">No users found.</p>
                            )}
                            {results.map(user => {
                                const isSelected = selectedUsers.some(u => u._id === user._id);
                                return (
                                    <div
                                        key={user._id}
                                        onClick={() => toggleUser(user)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted"}`}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image} />
                                                <AvatarFallback>{user.firstName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            {isSelected && (
                                                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 ring-2 ring-background">
                                                    <Check className="h-2 w-2" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    <Button className="w-full" onClick={handleStartChat} disabled={selectedUsers.length === 0 || isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedUsers.length > 1 ? "Create Group Chat" : "Start Chat"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
