'use client';

import { useState } from 'react';
import { groups, ApiException } from '@/lib/api';

interface InvitationData {
  type: 'group_invitation';
  groupId: number;
  groupName: string;
  invitedBy: string;
  inviteLink: string;
  timestamp: string;
}

interface GroupInvitationMessageProps {
  messageContent: string;
  userId?: number;
  onActionComplete?: () => void;
}

interface JoinStatus {
  status: 'accept' | 'reject' | null;
  joinStatus?: 'approved' | 'pending';
}

export function GroupInvitationMessage({
  messageContent,
  userId,
  onActionComplete,
}: GroupInvitationMessageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>({ status: null });

  // Extract invitation data from message
  const invitationMatch = messageContent.match(/\[INVITATION\](.*?)\[\/INVITATION\](.*)/s);

  if (!invitationMatch) {
    // Not an invitation message, render as plain text
    return <p className="text-sm break-words">{messageContent}</p>;
  }

  try {
    const invitationData: InvitationData = JSON.parse(invitationMatch[1]);
    const plainMessage = invitationMatch[2];
    console.log('Parsed invitation data:', invitationData);

    const handleAccept = async () => {
      if (!userId) {
        alert('Please log in to accept the invitation');
        return;
      }

      setIsProcessing(true);
      try {
        // Join the group using the API
        console.log('Attempting to join group:', invitationData.groupId);
        const response = await groups.joinGroup(invitationData.groupId);
        console.log('Successfully joined group:', response);

        // Check if join was successful or pending
        const joinedStatus = response.is_member ? 'approved' : 'pending';
        console.log('Join status:', joinedStatus);

        setJoinStatus({ status: 'accept', joinStatus: joinedStatus });
        onActionComplete?.();
      } catch (err) {
        let errorMessage = 'Failed to join the group';
        console.error('Error joining group:', err);
        console.error('Error type:', typeof err);
        console.error('Error constructor:', err?.constructor?.name);

        if (err instanceof ApiException) {
          errorMessage = `API Error: ${err.message} (Status: ${err.status})`;
          console.error('API Error details:', err.errors);
        } else if (err instanceof Error) {
          errorMessage = `Error: ${err.message}`;
        } else {
          errorMessage = `Unknown error: ${JSON.stringify(err)}`;
        }

        console.error('Final error message:', errorMessage);
        alert(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    const handleReject = async () => {
      setIsProcessing(true);
      try {
        // For rejection, we just mark it as rejected locally
        // You can add backend support for tracking rejections if needed
        console.log('User rejected invitation for group:', invitationData.groupId);
        setJoinStatus({ status: 'reject' });
        onActionComplete?.();
      } finally {
        setIsProcessing(false);
      }
    };

    if (joinStatus.status === 'accept') {
      const isApproved = joinStatus.joinStatus === 'approved';
      return (
        <div className={`rounded-lg p-3 ${
          isApproved
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <p className={`text-sm font-medium ${
            isApproved
              ? 'text-green-800'
              : 'text-blue-800'
          }`}>
            {isApproved
              ? `✓ You successfully joined the "${invitationData.groupName}" group`
              : `⏳ Your request to join "${invitationData.groupName}" is pending approval`
            }
          </p>
          <p className={`text-xs mt-2 ${
            isApproved
              ? 'text-green-700'
              : 'text-blue-700'
          }`}>
            {isApproved
              ? 'You can now access all group content and participate in discussions.'
              : 'The group owner will review your request shortly.'
            }
          </p>
        </div>
      );
    }

    if (joinStatus.status === 'reject') {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-800">
            You rejected the invitation to join "{invitationData.groupName}"
          </p>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-gray-700 break-words mb-3">{plainMessage}</p>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white text-sm font-medium rounded transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-sm font-medium rounded transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    );
  } catch (error) {
    // If parsing fails, render as plain text
    return <p className="text-sm break-words">{messageContent}</p>;
  }
}
