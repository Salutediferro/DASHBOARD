-- Direct messaging: 1:1 conversations between a patient and a
-- professional (DOCTOR/COACH). Authorization (must share an ACTIVE
-- CareRelationship) is enforced by the API layer.

CREATE TABLE "Conversation" (
  "id"        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

CREATE TABLE "ConversationMember" (
  "conversationId" UUID NOT NULL,
  "userId"         UUID NOT NULL,
  "lastReadAt"     TIMESTAMP(3),
  "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("conversationId", "userId"),
  CONSTRAINT "ConversationMember_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ConversationMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ConversationMember_userId_idx" ON "ConversationMember"("userId");

CREATE TABLE "Message" (
  "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID        NOT NULL,
  "senderId"       UUID        NOT NULL,
  "body"           TEXT        NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Message_conversationId_createdAt_idx"
  ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- RLS: consistent with the rest of the schema (default-deny; app uses
-- the service role / Prisma direct connection which bypasses RLS).
ALTER TABLE "Conversation"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"            ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "Conversation"       FROM anon, authenticated;
REVOKE ALL ON TABLE "ConversationMember" FROM anon, authenticated;
REVOKE ALL ON TABLE "Message"            FROM anon, authenticated;
