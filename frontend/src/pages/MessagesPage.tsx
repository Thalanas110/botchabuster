import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Send, MessageSquare, UserRound, Shield, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  userChatClient,
  type UserChatContact,
  type UserChatMessage,
} from "@/integrations/api/UserChatClient";

const POLL_INTERVAL_MS = 6_000;

function formatContactName(contact: UserChatContact): string {
  return contact.full_name?.trim() || contact.email?.trim() || contact.inspector_code?.trim() || "Unnamed";
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "No messages yet";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "No messages yet";
  return format(date, "MMM d, h:mm a");
}

export default function MessagesPage() {
  const { user, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<UserChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const loadMessages = useCallback(
    async (counterpartyId: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoadingMessages(true);
      }

      try {
        const nextMessages = await userChatClient.getMessages(counterpartyId);
        setMessages(nextMessages);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load chat messages";
        if (!options?.silent) {
          toast.error(message);
        }
      } finally {
        if (!options?.silent) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );

  const loadContacts = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoadingContacts(true);
      }

      try {
        const nextContacts = await userChatClient.getContacts();
        setContacts(nextContacts);

        setSelectedContactId((currentId) => {
          if (currentId && nextContacts.some((contact) => contact.id === currentId)) {
            return currentId;
          }
          return nextContacts[0]?.id ?? null;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load chat contacts";
        if (!options?.silent) {
          toast.error(message);
        }
      } finally {
        if (!options?.silent) {
          setIsLoadingContacts(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedContactId);
  }, [loadMessages, selectedContactId]);

  useEffect(() => {
    if (!selectedContactId) return;

    const intervalId = window.setInterval(() => {
      void loadContacts({ silent: true });
      void loadMessages(selectedContactId, { silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadContacts, loadMessages, selectedContactId]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    const content = draftMessage.trim();
    if (!selectedContactId || !content || isSendingMessage) return;

    setIsSendingMessage(true);
    setDraftMessage("");

    try {
      await userChatClient.sendMessage(selectedContactId, content);
      await Promise.all([
        loadMessages(selectedContactId, { silent: true }),
        loadContacts({ silent: true }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send chat message";
      toast.error(message);
      setDraftMessage(content);
    } finally {
      setIsSendingMessage(false);
    }
  }, [draftMessage, isSendingMessage, loadContacts, loadMessages, selectedContactId]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_12%_8%,hsl(var(--primary)/0.2),transparent_32%),radial-gradient(circle_at_95%_15%,hsl(var(--warning)/0.13),transparent_35%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <PageHeader
        title="Messages"
        subtitle={
          isAdmin
            ? "Coordinate directly with inspectors"
            : "Reach admins for inspection support"
        }
      />

      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Contacts
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => void loadContacts()}
                disabled={isLoadingContacts}
                aria-label="Refresh contacts"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingContacts ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-2">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-center text-xs text-muted-foreground">
                  {isAdmin
                    ? "No user accounts available for chat."
                    : "No admins are currently available for chat."}
                </p>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedContactId === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedContactId(contact.id)}
                      className={`mb-2 w-full rounded-2xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary/40 bg-[hsl(var(--primary)/0.16)]"
                          : "border-border/70 bg-background/45 hover:bg-background/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold tracking-tight">
                            {formatContactName(contact)}
                          </p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {contact.role === "admin" ? "Admin" : "User"}
                          </p>
                        </div>
                        {contact.role === "admin" ? (
                          <Shield className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                        {contact.last_message_preview ?? "Start a conversation"}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {formatTimestamp(contact.last_message_at)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border-border/70 bg-card/96">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="border-b border-border/70 bg-background/50 px-5 py-4">
              {selectedContact ? (
                <>
                  <p className="font-display text-base font-semibold tracking-tight">
                    {formatContactName(selectedContact)}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {selectedContact.role === "admin" ? "Admin Contact" : "Inspector Contact"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a contact to start chatting.
                </p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!selectedContact ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-display uppercase tracking-wider">No conversation selected</p>
                    <p className="text-xs">Pick a contact on the left to load chat history.</p>
                  </div>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p className="font-display uppercase tracking-wider">No messages yet</p>
                    <p className="text-xs">Send the first message to start this thread.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const mine = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                            mine
                              ? "border-primary/40 bg-[hsl(var(--primary)/0.18)] text-foreground"
                              : "border-border/70 bg-background/65 text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <p className="mt-1 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            {formatTimestamp(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={lastMessageRef} />
                </div>
              )}
            </div>

            <form
              className="flex items-center gap-2 border-t border-border/70 bg-background/45 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSendMessage();
              }}
            >
              <Input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder={
                  selectedContact
                    ? `Message ${formatContactName(selectedContact)}...`
                    : "Select a contact to message"
                }
                disabled={!selectedContact || isSendingMessage}
                maxLength={2000}
                className="h-11 rounded-xl bg-background/80"
              />
              <Button
                type="submit"
                disabled={!selectedContact || isSendingMessage || !draftMessage.trim()}
                className="h-11 gap-2 rounded-xl px-4"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
