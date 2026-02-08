/**
 * Messages Inbox Client Component
 *
 * Gmail-style compact rows with inline thread expansion.
 * Role-aware: adapts unread logic, display, and reply options
 * based on the current user's role.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  MessageSquare,
  ChevronRight,
  Send,
  Loader2,
  Globe,
  ExternalLink,
  User,
  Inbox,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface InboxMessage {
  id: string;
  body: string;
  subject: string | null;
  senderType: 'ORGANIZER' | 'SPEAKER' | 'REVIEWER';
  senderId: string | null;
  isRead: boolean;
  readAt: string | null;
  parentId: string | null;
  federatedMessageId: string | null;
  createdAt: string;
  senderName: string | null;
  senderImage: string | null;
  submission: {
    id: string;
    title: string;
    status: string;
    isFederated: boolean;
    speakerName: string;
    speakerImage: string | null;
  };
  event: {
    id: string;
    name: string;
    slug: string;
  };
}

type ThreadNode = InboxMessage & { replies: ThreadNode[] };

// ============================================================================
// Thread Helpers
// ============================================================================

function buildThreads(messages: InboxMessage[]): ThreadNode[] {
  const map = new Map<string, ThreadNode>();
  messages.forEach(m => map.set(m.id, { ...m, replies: [] }));

  const roots: ThreadNode[] = [];
  messages.forEach(m => {
    const node = map.get(m.id)!;
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort replies oldest first for conversational flow
  const sortReplies = (node: ThreadNode) => {
    node.replies.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    node.replies.forEach(sortReplies);
  };
  roots.forEach(sortReplies);

  return roots;
}

function countReplies(node: ThreadNode): number {
  if (!node.replies || node.replies.length === 0) return 0;
  return node.replies.length + node.replies.reduce((sum, r) => sum + countReplies(r), 0);
}

function threadHasUnread(node: ThreadNode, userId: string): boolean {
  if (!node.isRead && node.senderId !== userId) return true;
  return (node.replies || []).some(r => threadHasUnread(r, userId));
}

function getLatestActivity(node: ThreadNode): number {
  let latest = new Date(node.createdAt).getTime();
  for (const r of node.replies || []) {
    latest = Math.max(latest, getLatestActivity(r));
  }
  return latest;
}

function getLatestActivityTimeAgo(node: ThreadNode): string {
  return formatDistanceToNow(new Date(getLatestActivity(node)), { addSuffix: true });
}

function getThreadSubject(node: ThreadNode): string {
  if (node.subject) return node.subject;
  const preview = (node.body || '').slice(0, 60);
  return preview + (preview.length >= 60 ? '...' : '');
}

function collectUnreadIds(node: ThreadNode, userId: string): string[] {
  const ids: string[] = [];
  if (!node.isRead && node.senderId !== userId) ids.push(node.id);
  for (const r of node.replies || []) {
    ids.push(...collectUnreadIds(r, userId));
  }
  return ids;
}

// ============================================================================
// Component
// ============================================================================

export function MessagesInboxClient() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'federated'>('all');
  const [userRole, setUserRole] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const isSpeaker = userRole === 'USER' || userRole === 'SPEAKER';

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messages/inbox');
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.data?.messages || []);
      setUserRole(data.data?.role || '');
      setUserId(data.data?.userId || '');
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      await fetch('/api/messages/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });
      // Update local state
      setMessages(prev =>
        prev.map(m => messageIds.includes(m.id) ? { ...m, isRead: true, readAt: new Date().toISOString() } : m)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleReply = async (submissionId: string, parentId: string) => {
    if (!replyBody.trim()) {
      toast.error('Please enter a message');
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          message: replyBody,
          parentId,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send reply');
      }
      toast.success('Reply sent');
      setReplyingTo(null);
      setReplyBody('');
      fetchMessages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  // Build threads
  const threads = buildThreads(messages);
  const sortedThreads = threads
    .slice()
    .sort((a, b) => getLatestActivity(b) - getLatestActivity(a));

  // Apply filter
  let filteredThreads = sortedThreads;
  if (filter === 'unread') {
    filteredThreads = sortedThreads.filter(t => threadHasUnread(t, userId));
  } else if (filter === 'federated') {
    filteredThreads = sortedThreads.filter(t => t.submission.isFederated);
  }

  const totalUnread = messages.filter(m => !m.isRead && m.senderId !== userId).length;

  const subtitle = isSpeaker
    ? 'Messages about your submissions'
    : 'All submission messages across events';

  const emptyMessage = isSpeaker
    ? 'Messages from organizers and reviewers about your submissions will appear here.'
    : 'Messages from speakers about submissions will appear here.';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-muted-foreground">Loading messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render a message in the expanded view
  const renderMessage = (msg: ThreadNode, isReply: boolean = false) => {
    const isOwnMessage = msg.senderId === userId;

    const getSenderColor = () => {
      switch (msg.senderType) {
        case 'ORGANIZER': return 'text-blue-600';
        case 'REVIEWER': return 'text-purple-600';
        case 'SPEAKER': return 'text-green-600';
        default: return 'text-slate-600';
      }
    };

    const getSenderLabel = () => {
      if (isOwnMessage) return 'You';
      if (msg.senderType === 'SPEAKER') {
        return msg.senderName || msg.submission.speakerName || 'Speaker';
      }
      return msg.senderName || msg.senderType.charAt(0) + msg.senderType.slice(1).toLowerCase();
    };

    return (
      <div
        key={msg.id}
        className={cn(
          'flex items-start gap-3',
          isReply && 'pl-8 border-l-2 border-slate-200 dark:border-slate-700'
        )}
      >
        <Avatar className="h-7 w-7 mt-0.5">
          <AvatarImage
            src={msg.senderType === 'SPEAKER'
              ? (msg.senderImage || msg.submission.speakerImage || undefined)
              : (msg.senderImage || undefined)}
            alt={getSenderLabel()}
          />
          <AvatarFallback className="text-xs">
            <User className="h-3.5 w-3.5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('font-semibold text-xs', isOwnMessage ? 'text-slate-500' : getSenderColor())}>
              {getSenderLabel()}
            </span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {msg.senderType}
            </Badge>
            {msg.submission.isFederated && msg.senderType === 'SPEAKER' && (
              <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">
                <Globe className="h-2.5 w-2.5 mr-0.5" />
                Federated
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
            </span>
          </div>
          {!isReply && msg.subject && (
            <p className="text-sm font-medium mb-1">{msg.subject}</p>
          )}
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {msg.body}
          </p>

          {/* Reply button for messages not sent by current user */}
          {!isOwnMessage && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-6 px-1.5 text-xs text-muted-foreground hover:text-blue-700 hover:bg-blue-100"
              onClick={() => {
                setReplyingTo(msg.id);
                setReplyBody('');
              }}
            >
              <Send className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}

          {/* Inline reply form */}
          {replyingTo === msg.id && (
            <div className="mt-2 space-y-2 border rounded-lg p-3 bg-white dark:bg-slate-900">
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write a reply..."
                className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm resize-y"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleReply(msg.submission.id, msg.id)}
                  disabled={isSending || !replyBody.trim()}
                >
                  {isSending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Nested replies */}
          {msg.replies && msg.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {msg.replies.map(reply => renderMessage(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Get compact row display name and avatar based on role
  const getRowIdentity = (thread: ThreadNode) => {
    if (isSpeaker) {
      // Speaker sees event name as the primary identifier
      return {
        name: thread.event.name,
        image: null as string | null,
      };
    }
    // Organizer/Reviewer/Admin sees speaker name
    return {
      name: thread.submission.speakerName,
      image: thread.submission.speakerImage,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="secondary" className="text-sm">
            {totalUnread} unread
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'unread', 'federated'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs border transition-colors',
              filter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {f === 'all' && 'All'}
            {f === 'unread' && `Unread${totalUnread > 0 ? ` (${totalUnread})` : ''}`}
            {f === 'federated' && 'Federated'}
          </button>
        ))}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          </CardContent>
        </Card>
      ) : filteredThreads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-1">No messages match this filter</h3>
            <p className="text-sm text-muted-foreground">
              Try a different filter or clear it to see all messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {filteredThreads.map((thread, index) => {
            const isUnread = threadHasUnread(thread, userId);
            const replyCount = countReplies(thread);
            const subject = getThreadSubject(thread);
            const latestTime = getLatestActivityTimeAgo(thread);
            const rowIdentity = getRowIdentity(thread);

            return (
              <div key={thread.id}>
                <details
                  className="group"
                  onToggle={e => {
                    const open = (e.target as HTMLDetailsElement).open;
                    if (open) {
                      const unreadIds = collectUnreadIds(thread, userId);
                      if (unreadIds.length > 0) {
                        markAsRead(unreadIds);
                      }
                    }
                  }}
                >
                  {/* Compact inbox row */}
                  <summary
                    className={cn(
                      'list-none cursor-pointer py-2.5 px-4 flex items-center gap-3 hover:bg-muted/50 transition-colors',
                      isUnread && 'bg-blue-50/50 dark:bg-blue-950/20'
                    )}
                  >
                    {/* Unread dot */}
                    <div className="w-2 flex-shrink-0 flex justify-center">
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8 border flex-shrink-0">
                      <AvatarImage
                        src={rowIdentity.image || undefined}
                        alt={rowIdentity.name}
                      />
                      <AvatarFallback className="text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Name column */}
                    <span className={cn(
                      'w-32 flex-shrink-0 text-sm truncate',
                      isUnread ? 'font-semibold' : 'text-muted-foreground'
                    )}>
                      {rowIdentity.name}
                    </span>

                    {/* Subject + preview */}
                    <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                      <span className={cn(
                        'text-sm truncate',
                        isUnread ? 'font-semibold' : ''
                      )}>
                        {subject}
                      </span>
                      <span className="hidden sm:inline text-sm text-muted-foreground truncate">
                        {thread.body ? `\u2014 ${thread.body.slice(0, 80)}` : ''}
                      </span>
                    </div>

                    {/* Context badges */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      {thread.submission.isFederated && (
                        <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600">
                          <Globe className="h-2.5 w-2.5 mr-0.5" />
                          Fed
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {thread.submission.title}
                      </span>
                    </div>

                    {/* Reply count */}
                    {replyCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{replyCount}</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="text-xs text-muted-foreground flex-shrink-0 w-20 text-right">
                      {latestTime}
                    </span>

                    {/* Chevron */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-90" />
                  </summary>

                  {/* Expanded conversation */}
                  <div className="bg-muted/30 border-t px-4 py-4">
                    {/* Context header */}
                    <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{thread.submission.title}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {thread.submission.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{thread.event.name}</span>
                        <Link
                          href={`/events/${thread.event.slug}/submissions/${thread.submission.id}`}
                          className="text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          View Submission
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Root message + replies */}
                    <div className="space-y-3">
                      {renderMessage(thread)}
                    </div>

                    {/* Reply form at bottom */}
                    {replyingTo !== thread.id && (
                      <div className="pt-3 border-t mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => {
                            setReplyingTo(thread.id);
                            setReplyBody('');
                          }}
                        >
                          <Send className="h-3 w-3 mr-1.5" />
                          Reply to Thread
                        </Button>
                      </div>
                    )}

                    {/* Thread-level reply form */}
                    {replyingTo === thread.id && (
                      <div className="mt-3 space-y-2 border rounded-lg p-3 bg-white dark:bg-slate-900">
                        <textarea
                          value={replyBody}
                          onChange={e => setReplyBody(e.target.value)}
                          placeholder="Write a reply to this thread..."
                          className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm resize-y"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setReplyingTo(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleReply(thread.submission.id, thread.id)}
                            disabled={isSending || !replyBody.trim()}
                          >
                            {isSending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </details>
                {index < filteredThreads.length - 1 && <Separator />}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
