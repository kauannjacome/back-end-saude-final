-- AddContextToChatConversation
ALTER TABLE "chat_conversation" ADD COLUMN "context" JSONB;
