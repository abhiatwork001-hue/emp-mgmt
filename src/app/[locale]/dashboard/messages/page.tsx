import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConversations } from "@/lib/actions/message.actions";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageSquareDashed } from "lucide-react";

export default async function MessagesPage() {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || "";
    const conversations = await getConversations(userId);

    return (
        <>
            <div className="md:hidden h-full">
                <ConversationList conversations={conversations} currentUserId={userId} />
            </div>
            <div className="hidden md:flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageSquareDashed className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-xl font-semibold text-foreground">Your Messages</h3>
                <p className="text-sm max-w-sm mt-2">
                    Send photos, updates, and chat with your colleagues directly here.
                </p>
            </div>
        </>
    )
}
