"use server";

import connectToDB from "@/lib/db";
import { Conversation, Message, Employee } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { sendPushNotification } from "@/lib/actions/push.actions";
import { logAction } from "./log.actions";

export async function getConversations(userId: string) {
    try {
        if (!userId) return []; // Validate userId
        await connectToDB();
        const conversations = await Conversation.find({
            participants: userId,
            deletedBy: { $ne: userId }
        })
            .populate('participants', 'firstName lastName image')
            .populate('lastMessage.sender', 'firstName lastName')
            .sort({ updatedAt: -1 })
            .lean();

        // Calculate unread counts and filter empty conversations
        const validConversations = await Promise.all(conversations.map(async (conv: any) => {
            // If no lastMessage, check if there are any actual messages (double check)
            const messageCount = await Message.countDocuments({ conversationId: conv._id });

            // If truly empty, return null to filter out
            if (messageCount === 0) return null;

            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                readBy: { $ne: userId }
            });
            return { ...conv, unreadCount };
        }));

        const finalConversations = validConversations.filter(Boolean);

        return JSON.parse(JSON.stringify(finalConversations));
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

export async function getMessages(conversationId: string, currentUserId?: string) {
    try {
        await connectToDB();
        const query: any = { conversationId };

        if (currentUserId) {
            query.deletedFor = { $ne: currentUserId };
        }

        const messages = await Message.find(query)
            .populate('sender', 'firstName lastName image')
            .populate({
                path: 'parentMessageId',
                populate: { path: 'sender', select: 'firstName lastName' }
            })
            .sort({ createdAt: 1 }) // Oldest first
            .lean();

        return JSON.parse(JSON.stringify(messages));
    } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
}


export async function sendMessage(conversationId: string, senderId: string, content: string, attachments: any[] = [], parentMessageId?: string) {
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
            parentMessageId,
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
            const mutedBy = (conversation.mutedBy || []).map((id: any) => id.toString());
            const recipients = conversation.participants.filter((p: any) =>
                p._id.toString() !== senderId && !mutedBy.includes(p._id.toString())
            );

            // Fire and forget (or await if critical) - awaiting to ensure delivery attempt
            await Promise.all(recipients.map((recipient: any) =>
                sendPushNotification(recipient._id.toString(), {
                    title: conversation.type === 'group'
                        ? `${conversation.name || 'Group'}: ${senderName}`
                        : senderName,
                    body: (content || "Sent an attachment").length > 50 ? (content || "Sent an attachment").substring(0, 50) + '...' : (content || "Sent an attachment"),
                    url: `/dashboard/messages/${conversationId}`
                })
            ));
        }

        revalidatePath(`/dashboard/messages`);

        // Log Action
        await logAction({
            action: 'SEND_MESSAGE',
            performedBy: senderId,
            targetId: conversationId,
            targetModel: 'Conversation',
            details: { messageId: newMessage._id }
        });

        // Return populated message for UI
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'firstName lastName image')
            .populate({
                path: 'parentMessageId',
                populate: { path: 'sender', select: 'firstName lastName' }
            });
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

        // Log Action
        await logAction({
            action: 'CREATE_DIRECT_CHAT',
            performedBy: currentUserId,
            targetId: newChat._id,
            targetModel: 'Conversation',
            details: { targetUserId }
        });

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

        // Log Action
        await logAction({
            action: 'CREATE_GROUP_CHAT',
            performedBy: creatorId,
            targetId: newChat._id,
            targetModel: 'Conversation',
            details: { name, participantCount: participants.length }
        });

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

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
    try {
        await connectToDB();
        const message = await Message.findById(messageId);
        if (!message) return { success: false };

        // Initialize reactions array if it doesn't exist
        if (!message.reactions) {
            message.reactions = [];
        }

        const existingReactionIndex = message.reactions.findIndex(
            (r: any) => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add reaction
            message.reactions.push({ user: userId, emoji });
        }

        await message.save();
        revalidatePath(`/dashboard/messages`);

        // Log Action
        await logAction({
            action: 'TOGGLE_REACTION',
            performedBy: userId,
            targetId: messageId,
            targetModel: 'Message',
            details: { emoji }
        });

        return { success: true };
    } catch (error) {
        console.error("Error toggling reaction:", error);
        return { success: false };
    }
}

export async function deleteMessageForEveryone(messageId: string, userId: string) {
    try {
        await connectToDB();
        const message = await Message.findById(messageId);
        if (!message) return { success: false, error: "Message not found" };

        if (message.sender.toString() !== userId) {
            return { success: false, error: "Unauthorized" };
        }

        message.isDeleted = true;
        message.content = "This message was deleted";
        message.attachments = [];
        message.reactions = [];
        await message.save();

        revalidatePath(`/dashboard/messages`);

        await logAction({
            action: 'DELETE_MESSAGE_FOR_EVERYONE',
            performedBy: userId,
            targetId: messageId,
            targetModel: 'Message'
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting message for everyone:", error);
        return { success: false };
    }
}

export async function deleteMessageForMe(messageId: string, userId: string) {
    try {
        await connectToDB();
        await Message.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId }
        });

        revalidatePath(`/dashboard/messages`);

        await logAction({
            action: 'DELETE_MESSAGE_FOR_ME',
            performedBy: userId,
            targetId: messageId,
            targetModel: 'Message'
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting message for me:", error);
        return { success: false };
    }
}

export async function deleteConversation(conversationId: string, userId: string) {
    try {
        await connectToDB();
        await Conversation.findByIdAndUpdate(conversationId, {
            $addToSet: { deletedBy: userId }
        });
        revalidatePath(`/dashboard/messages`);

        await logAction({
            action: 'DELETE_CONVERSATION',
            performedBy: userId,
            targetId: conversationId,
            targetModel: 'Conversation'
        });

        return { success: true, redirect: true };
    } catch (error) {
        console.error("Error deleting conversation:", error);
        return { success: false };
    }
}

export async function toggleMuteConversation(conversationId: string, userId: string) {
    try {
        await connectToDB();
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return { success: false };

        if (!conversation.mutedBy) conversation.mutedBy = [];

        const index = conversation.mutedBy.findIndex((id: any) => id.toString() === userId);
        let isMuted = false;
        if (index > -1) {
            conversation.mutedBy.splice(index, 1);
            isMuted = false;
        } else {
            conversation.mutedBy.push(userId);
            isMuted = true;
        }

        await conversation.save();
        revalidatePath(`/dashboard/messages`);

        await logAction({
            action: 'TOGGLE_MUTE',
            performedBy: userId,
            targetId: conversationId,
            targetModel: 'Conversation',
            details: { muted: isMuted }
        });

        return { success: true, isMuted };
    } catch (error) {
        console.error("Error toggling mute:", error);
        return { success: false };
    }
}
