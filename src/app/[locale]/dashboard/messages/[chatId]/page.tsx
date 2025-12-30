import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConversation, getMessages } from "@/lib/actions/message.actions";
import { ChatWindow } from "@/components/messages/chat-window";
import { redirect } from "next/navigation";

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
    const session = await getServerSession(authOptions);
    const { chatId } = await params;

    const [conversation, messages] = await Promise.all([
        getConversation(chatId),
        getMessages(chatId)
    ]);

    if (!conversation) {
        redirect('/dashboard/messages');
    }

    const userId = (session?.user as any)?.id || "";
    // Security: Check participation
    const isParticipant = conversation.participants.some((p: any) => p._id.toString() === userId);
    if (!isParticipant) {
        redirect('/dashboard/messages');
    }

    return (
        <ChatWindow
            conversation={conversation}
            initialMessages={messages}
            currentUserId={userId}
        />
    );
}
