/**
 * Submission Status Actions
 * 
 * Client component for changing submission status.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  Clock, 
  HelpCircle,
  Loader2 
} from 'lucide-react';

interface SubmissionStatusActionsProps {
  submissionId: string;
  eventId: string;
  currentStatus: string;
}

const statusActions = [
  { status: 'PENDING', label: 'Mark as Pending', icon: Clock },
  { status: 'UNDER_REVIEW', label: 'Mark as Under Review', icon: HelpCircle },
  { status: 'ACCEPTED', label: 'Accept', icon: CheckCircle, variant: 'success' as const },
  { status: 'WAITLISTED', label: 'Waitlist', icon: Clock },
  { status: 'REJECTED', label: 'Reject', icon: XCircle, variant: 'destructive' as const },
];

export function SubmissionStatusActions({ 
  submissionId, 
  eventId, 
  currentStatus 
}: SubmissionStatusActionsProps) {
  const router = useRouter();
  const api = useApi();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleStatusChange = async (status: string) => {
    setIsUpdating(true);
    
    const { error } = await api.patch(
      `/api/events/${eventId}/submissions/${submissionId}`,
      { status }
    );
    
    setIsUpdating(false);
    
    if (error) return;
    
    toast.success(`Submission marked as ${status.toLowerCase().replace('_', ' ')}`);
    router.refresh();
  };
  
  const availableActions = statusActions.filter(a => a.status !== currentStatus);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            'Change Status'
          )}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableActions.map((action, index) => (
          <div key={action.status}>
            {index > 0 && action.variant && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => handleStatusChange(action.status)}
              className={
                action.variant === 'success' 
                  ? 'text-green-600 focus:text-green-600' 
                  : action.variant === 'destructive'
                  ? 'text-red-600 focus:text-red-600'
                  : ''
              }
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
