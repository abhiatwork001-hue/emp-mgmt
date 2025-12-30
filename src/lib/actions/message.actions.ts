"use server";

import connectToDB from "@/lib/db";
import { Conversation, Message, Employee } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/actions/push.actions";

export async function getConversations(userId: string) {
    try {
        await connectToDB();
        const conversations = await Conversation.find({ participants: userId })
            .populate('participants', 'firstName lastName image')
            .populate('lastMessage.sender', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .lean();

        return JSON.parse(JSON.stringify(conversations));
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return [];
    }
}

export async function getConversation(conversationId: string) {
    try {
        await connectToDB();
        const conversation = await Conversation.findById(conversationId)
            .populate('participants', 'firstName lastName image')
            .lean();
        return JSON.parse(JSON.stringify(conversation));
    } catch (error) {
        return null;
    }
}

export async function getMessages(conversationId: string) {
    try {
        await connectToDB();
        const messages = await Message.find({ conversationId })
            .populate('sender', 'firstName lastName image')
            .sort({ createdAt: 1 }) // Oldest first
            .lean();

        return JSON.parse(JSON.stringify(messages));
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
}


export async function sendMessage(conversationId: string, senderId: string, content: string, attachments: any[] = []) {
    try {
        await connectToDB();


        let finalContent = content;
        if (!finalContent && attachments.length > 0) {
            finalContent = "Sent an attachment"; // Fallback text that is visible but acceptable
        }

        const newMessage = await Message.create({
            conversationId,
            sender: senderId,
            content: finalContent,
            attachments,
            readBy: [senderId]
        });

        const displayContent = content || (attachments.length > 0 ? (attachments[0].type === 'image' ? '📷 Image' : '📎 Attachment') : 'New Message');

        // Update conversation last message and get participants for notification
        const conversation = await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: {
                content: displayContent,
                sender: senderId,
                createdAt: new Date()
            }
        }, { new: true }).populate('participants', 'firstName lastName _id');

        // Fetch sender name
        const sender = await Employee.findById(senderId).select('firstName lastName');
        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : "New Message";

        // Send Notifications
        if (conversation && conversation.participants) {
            const recipients = conversation.participants.filter((p: any) => p._id.toString() !== senderId);

            // Fire and forget (or await if critical) - awaiting to ensure delivery attempt
            await Promise.all(recipients.map((recipient: any) =>
                sendPushNotification(recipient._id.toString(), {
                    title: conversation.type === 'group'
                        ? `${conversation.name || 'Group'}: ${senderName}`
                        : senderName,
                    body: content.length > 50 ? content.substring(0, 50) + '...' : content,
                    url: `/dashboard/messages/${conversationId}`
                })
            ));
        }

        revalidatePath(`/dashboard/messages`);

        // Return populated message for UI
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'firstName lastName image');
        return { success: true, message: JSON.parse(JSON.stringify(populatedMessage)) };
    } catch (error) {
        console.error("Error sending message:", error);
        return { success: false, error: "Failed to send message" };
    }
}

export async function createDirectChat(currentUserId: string, targetUserId: string) {
    try {
        await connectToDB();

        // Check if exists
        const existing = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [currentUserId, targetUserId] }
        });

        if (existing) {
            return { success: true, conversationId: existing._id.toString() };
        }

        const newChat = await Conversation.create({
            participants: [currentUserId, targetUserId],
            type: 'direct',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath(`/dashboard/messages`);
        return { success: true, conversationId: newChat._id.toString() };
    } catch (error) {
        console.error("Error creating chat:", error);
        return { success: false, error: "Failed to create chat" };
    }
}

export async function createGroupChat(creatorId: string, name: string, participantIds: string[]) {
    try {
        await connectToDB();

        const participants = [...new Set([creatorId, ...participantIds])];

        const newChat = await Conversation.create({
            participants,
            type: 'group',
            name,
            admins: [creatorId],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        revalidatePath(`/dashboard/messages`);
        return { success: true, conversationId: newChat._id.toString() };
    } catch (error) {
        console.error("Error creating group chat:", error);
        return { success: false, error: "Failed to create group" };
    }
}

export async function searchUsers(query: string, currentUserId: string) {
    try {
        await connectToDB();
        const employees = await Employee.find({
            _id: { $ne: currentUserId },
            $or: [
                { firstName: { $regex: query, $options: 'i' } },
                { lastName: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        })
            .select('_id firstName lastName image email roles')
            .limit(20)
            .lean();

        return JSON.parse(JSON.stringify(employees));
    } catch (error) {
        console.error("Error searching users:", error);
        return [];
    }
}

export async function markMessagesAsRead(conversationId: string, userId: string) {
    try {
        await connectToDB();
        await Message.updateMany(
            { conversationId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );
        revalidatePath(`/dashboard/messages`);
        return { success: true };
    } catch (error) {
        console.error("Error marking messages as read:", error);
        return { success: false };
    }
}
