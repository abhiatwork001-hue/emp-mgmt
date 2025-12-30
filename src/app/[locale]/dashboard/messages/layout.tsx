import { getServerSession } from "next-auth"; // Fix import
import { authOptions } from "@/lib/auth"; // Fix import
import { getConversations } from "@/lib/actions/message.actions";
import { ConversationList } from "@/components/messages/conversation-list";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions); // Fix usage
    const conversations = await getConversations((session?.user as any)?.id || "");

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
            <aside className="hidden md:block w-80 border-r bg-muted/10 h-full flex-shrink-0">
                <ConversationList conversations={conversations} currentUserId={session?.user?.id} />
            </aside>
            <main className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
                {children}
            </main>
        </div>
    );
}
