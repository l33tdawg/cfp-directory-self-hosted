/**
 * Submission Status Actions
 * 
 * Client component for changing submission status.
 * Shows inline buttons for quick status changes.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RotateCcw,
  Loader2 
} from 'lucide-react';

interface SubmissionStatusActionsProps {
  submissionId: string;
  eventId: string;
  currentStatus: string;
}

export function SubmissionStatusActions({ 
  submissionId, 
  eventId, 
  currentStatus 
}: SubmissionStatusActionsProps) {
  const router = useRouter();
  const api = useApi();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  const handleStatusChange = async (status: string) => {
    setIsUpdating(status);
    
    const { error } = await api.patch(
      `/api/events/${eventId}/submissions/${submissionId}`,
      { status }
    );
    
    setIsUpdating(null);
    
    if (error) return;
    
    toast.success(`Submission marked as ${status.toLowerCase().replace('_', ' ')}`);
    router.refresh();
  };
  
  const isAccepted = currentStatus === 'ACCEPTED';
  const isRejected = currentStatus === 'REJECTED';
  const isPending = currentStatus === 'PENDING';
  const isUnderReview = currentStatus === 'UNDER_REVIEW';
  const isWaitlisted = currentStatus === 'WAITLISTED';
  
  return (
    <div className="grid grid-cols-1 gap-2">
      {/* Accept Button */}
      <Button
        className="w-full justify-start"
        variant={isAccepted ? 'secondary' : 'default'}
        onClick={() => handleStatusChange('ACCEPTED')}
        disabled={isUpdating !== null || isAccepted}
      >
        {isUpdating === 'ACCEPTED' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        {isAccepted ? 'Accepted' : 'Accept Submission'}
      </Button>
      
      {/* Reject Button */}
      <Button
        className="w-full justify-start"
        variant={isRejected ? 'secondary' : 'destructive'}
        onClick={() => handleStatusChange('REJECTED')}
        disabled={isUpdating !== null || isRejected}
      >
        {isUpdating === 'REJECTED' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4 mr-2" />
        )}
        {isRejected ? 'Rejected' : 'Reject Submission'}
      </Button>
      
      {/* Waitlist Button */}
      <Button
        className="w-full justify-start"
        variant={isWaitlisted ? 'secondary' : 'outline'}
        onClick={() => handleStatusChange('WAITLISTED')}
        disabled={isUpdating !== null || isWaitlisted}
      >
        {isUpdating === 'WAITLISTED' ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 mr-2" />
        )}
        {isWaitlisted ? 'Waitlisted' : 'Add to Waitlist'}
      </Button>
      
      {/* Set to Under Review */}
      {!isUnderReview && (
        <Button
          className="w-full justify-start"
          variant="outline"
          onClick={() => handleStatusChange('UNDER_REVIEW')}
          disabled={isUpdating !== null}
        >
          {isUpdating === 'UNDER_REVIEW' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 mr-2" />
          )}
          Set to Under Review
        </Button>
      )}
      
      {/* Reset to Pending (only show if not already pending) */}
      {(isAccepted || isRejected || isWaitlisted || isUnderReview) && (
        <Button
          className="w-full justify-start"
          variant="ghost"
          onClick={() => handleStatusChange('PENDING')}
          disabled={isUpdating !== null || isPending}
        >
          {isUpdating === 'PENDING' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          Reset to Pending
        </Button>
      )}
    </div>
  );
}
