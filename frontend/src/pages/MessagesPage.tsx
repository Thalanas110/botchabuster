import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Send,
  MessageSquare,
  UserRound,
  Shield,
  Loader2,
  RefreshCw,
  Search,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIsDesktop } from "@/hooks/use-desktop";
import {
  userChatClient,
  type UserChatContact,
  type UserChatMessage,
} from "@/integrations/api/UserChatClient";

const POLL_INTERVAL_MS = 6_000;

function formatContactName(contact: UserChatContact): string {
  return (
    contact.full_name?.trim() ||
    contact.email?.trim() ||
    contact.inspector_code?.trim() ||
    "Unnamed"
  );
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "No messages yet";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "No messages yet";
  return format(date, "MMM d, h:mm a");
}

export default function MessagesPage() {
  const { user, isAdmin } = useAuth();
  const isDesktop = useIsDesktop();
  const [contacts, setContacts] = useState<UserChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"contacts" | "thread">("contacts");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const haystack = [
        formatContactName(contact),
        contact.email ?? "",
        contact.inspector_code ?? "",
        contact.location ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [contactSearch, contacts]);

  const contactStats = useMemo(() => {
    const adminContacts = contacts.filter((contact) => contact.role === "admin").length;
    const userContacts = contacts.length - adminContacts;
    const latestActivity = contacts
      .map((contact) => contact.last_message_at)
      .filter((value): value is string => typeof value === "string")
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

    return {
      total: contacts.length,
      adminContacts,
      userContacts,
      latestActivity,
    };
  }, [contacts]);

  const showContactsPanel = isDesktop || mobilePanel === "contacts";
  const showThreadPanel = isDesktop || mobilePanel === "thread";

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
    if (isDesktop) return;
    if (!selectedContactId && mobilePanel === "thread") {
      setMobilePanel("contacts");
    }
  }, [isDesktop, mobilePanel, selectedContactId]);

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

  const handleSelectContact = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId);
      if (!isDesktop) {
        setMobilePanel("thread");
      }
    },
    [isDesktop]
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight">Messages</h1>
                <p className="text-xs text-muted-foreground">
                  {isAdmin
                    ? "Coordinate directly with inspectors"
                    : "Reach admins for inspection support"}
                </p>
              </div>
            </div>

            <div className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
              {format(new Date(), "MMMM yyyy")}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Total Contacts
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">{contactStats.total}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Admin Contacts
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">
                {contactStats.adminContacts}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                User Contacts
              </p>
              <p className="mt-1 font-display text-3xl font-semibold">{contactStats.userContacts}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Latest Activity
              </p>
              <p className="mt-1 font-display text-sm font-semibold">
                {formatTimestamp(contactStats.latestActivity)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,0.95fr)_minmax(0,1.05fr)]">
          {showContactsPanel && (
          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4 lg:flex lg:max-h-[calc(100dvh-24rem)] lg:min-h-[560px] lg:flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-semibold">Contact Directory</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {filteredContacts.length} shown
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => void loadContacts()}
                  disabled={isLoadingContacts}
                  aria-label="Refresh contacts"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingContacts ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-2">
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Search by name, email, code..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
              {isLoadingContacts ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/55 py-16 text-muted-foreground">
                  <MessageSquare className="mb-3 h-10 w-10" />
                  <p className="font-display text-sm uppercase tracking-wider">No contacts found</p>
                  <p className="mt-1 text-xs">
                    {isAdmin
                      ? "No user accounts are available for chat."
                      : "No admins are currently available for chat."}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isSelected = selectedContactId === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact.id)}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-primary/40 bg-[hsl(var(--primary)/0.16)]"
                          : "border-border/70 bg-background/55 hover:bg-background/75"
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
          </section>
          )}

          {showThreadPanel && (
          <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4 lg:flex lg:max-h-[calc(100dvh-24rem)] lg:min-h-[560px] lg:flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!isDesktop && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl"
                    onClick={() => setMobilePanel("contacts")}
                    aria-label="Back to contacts"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="font-display text-base font-semibold">Conversation Thread</h2>
              </div>
              <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                {messages.length} messages
              </span>
            </div>

            <Card className="mt-3 flex min-h-[52vh] flex-col overflow-hidden rounded-2xl border-border/70 bg-background/55 lg:min-h-0 lg:flex-1">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="border-b border-border/70 bg-background/60 px-4 py-3">
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

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {!selectedContact ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <p className="font-display uppercase tracking-wider">No conversation selected</p>
                        <p className="text-xs">Pick a contact to view and send messages.</p>
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
                          <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                                mine
                                  ? "border-primary/40 bg-[hsl(var(--primary)/0.18)] text-foreground"
                                  : "border-border/70 bg-background/75 text-foreground"
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
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
                  className="flex items-center gap-2 border-t border-border/70 bg-background/65 p-3"
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
                    className="h-11 rounded-xl bg-background/85"
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
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
