"use client";

import { useParams } from "next/navigation";
import { ThreadView } from "@/components/messages/thread-view";

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  if (!conversationId) return null;
  return <ThreadView conversationId={conversationId} />;
}
