/**
 * Submission Messages Section (Client Component)
 * 
 * Displays and handles messaging between organizers and speakers.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  body: string;
  subject?: string | null;
  senderType: string;
  isRead: boolean;
  createdAt: Date;
  sender?: {
    name?: string | null;
    email: string;
  } | null;
}

interface SubmissionMessagesSectionProps {
  eventId: string;
  submissionId: string;
  messages: Message[];
  currentUserId: string;
  isOwner: boolean;
}

export function SubmissionMessagesSection({
  eventId,
  submissionId,
  messages,
  currentUserId,
  isOwner,
}: SubmissionMessagesSectionProps) {
  // currentUserId available for future message ownership styling
  void currentUserId;
  const api = useApi();
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const { error } = await api.post(
      `/api/events/${eventId}/submissions/${submissionId}/messages`,
      { body: newMessage }
    );

    if (error) return;

    toast.success('Message sent');
    setNewMessage('');
    // Refresh to show new message
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Message Composer */}
      <Card>
        <CardContent className="pt-4">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              isOwner
                ? 'Reply to the organizers...'
                : 'Send a message to the speaker...'
            }
            className="min-h-[100px] mb-3"
          />
          <Button onClick={handleSendMessage} disabled={api.isLoading || !newMessage.trim()}>
            {api.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Message
          </Button>
        </CardContent>
      </Card>

      {/* Message Thread */}
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={
                message.senderType === 'ORGANIZER'
                  ? 'border-l-4 border-l-blue-500'
                  : 'border-l-4 border-l-green-500'
              }
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">
                      {message.senderType === 'ORGANIZER' ? (
                        <span className="text-blue-600">Organizer</span>
                      ) : (
                        <span className="text-green-600">
                          {message.sender?.name || message.sender?.email || 'Speaker'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {!message.isRead && message.senderType !== (isOwner ? 'SPEAKER' : 'ORGANIZER') && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      New
                    </span>
                  )}
                </div>
                {message.subject && (
                  <p className="font-medium mb-1">{message.subject}</p>
                )}
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {message.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          No messages yet. Start the conversation!
        </div>
      )}
    </div>
  );
}
