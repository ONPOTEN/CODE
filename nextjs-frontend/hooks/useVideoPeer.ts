'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface UseVideoPeerProps {
  email: string;
  remoteSocketId: string | null;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
}

export const useVideoPeer = ({
  email,
  remoteSocketId,
  onLocalStream,
  onRemoteStream,
}: UseVideoPeerProps) => {
  const { socket, onIncomingCall, offIncomingCall, onCallAccepted, offCallAccepted, onPeerNegoNeeded, offPeerNegoNeeded, onPeerNegoFinal, offPeerNegoFinal } = useSocket();
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callActive, setCallActive] = useState(false);

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    const iceConfiguration = {
    iceServers: [
      {
        urls: 'turn:relay1.expressturn.com:3480', // Your TURN server URL and port
        username: '000000002076053328',
        credential: '/PK5/t0NQgwE0oIZEBQQOQlnTcQ=',
      },
      // Add more TURN servers if needed for redundancy
    ],
  };

  const peerConnection = new RTCPeerConnection(iceConfiguration);
   
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      setRemoteStream(event.streams[0]);
      if (onRemoteStream) {
        onRemoteStream(event.streams[0]);
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', peerConnection.connectionState);
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [onRemoteStream]);

  // Get user media
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (onLocalStream) {
        onLocalStream(stream);
      }
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      throw error;
    }
  }, [onLocalStream]);

  // Add local stream to peer connection
  const addStreamToPeer = useCallback(
    (stream: MediaStream, peerConnection: RTCPeerConnection) => {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    },
    []
  );

  // Initiate call (caller side)
  const initiateCall = useCallback(async () => {
    if (!remoteSocketId || !socket) {
      console.warn('Missing remoteSocketId or socket');
      return;
    }

    try {
      const stream = await getLocalStream();
      const peerConnection = createPeerConnection();
      addStreamToPeer(stream, peerConnection);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('user:call', {
        to: remoteSocketId,
        offer: offer,
      });

      setCallActive(true);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  }, [remoteSocketId, socket, getLocalStream, createPeerConnection, addStreamToPeer]);

  // Handle incoming call (receiver side)
  const handleIncomingCall = useCallback(
    async (data: any) => {
      try {
        console.log('Incoming call received from:', data.from);
        const stream = await getLocalStream();
        const peerConnection = createPeerConnection();
        addStreamToPeer(stream, peerConnection);

        console.log('Setting remote offer. Signaling state:', peerConnection.signalingState);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        console.log('Remote offer set. Signaling state:', peerConnection.signalingState);

        const answer = await peerConnection.createAnswer();
        console.log('Answer created. Setting local description...');
        await peerConnection.setLocalDescription(answer);
        console.log('Local description set. Signaling state:', peerConnection.signalingState);

        socket?.emit('call:accepted', {
          to: data.from,
          ans: answer,
        });

        setCallActive(true);
      } catch (error) {
        console.error('Failed to handle incoming call:', error);
      }
    },
    [getLocalStream, createPeerConnection, addStreamToPeer, socket]
  );

  // Handle call acceptance (caller side)
  const handleCallAccepted = useCallback(async (data: any) => {
    try {
      if (peerConnectionRef.current) {
        console.log('Current peer connection state:', {
          signalingState: peerConnectionRef.current.signalingState,
          connectionState: peerConnectionRef.current.connectionState,
        });

        // Only set remote description if in the correct state
        if (peerConnectionRef.current.signalingState === 'have-local-offer') {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.ans)
          );
          console.log('Remote description (answer) set successfully');
        } else {
          console.warn('Cannot set remote answer. Current signaling state:', peerConnectionRef.current.signalingState);
        }
      }
    } catch (error) {
      console.error('Failed to handle call acceptance:', error);
    }
  }, []);

  // Handle peer negotiation needed
  const handlePeerNegoNeeded = useCallback(async () => {
    try {
      if (peerConnectionRef.current && remoteSocketId) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socket?.emit('peer:nego:needed', {
          to: remoteSocketId,
          offer: offer,
        });
      }
    } catch (error) {
      console.error('Failed to handle peer negotiation needed:', error);
    }
  }, [remoteSocketId, socket]);

  // Handle peer negotiation offer
  const handlePeerNegoNeedingAnswer = useCallback(
    async (data: any) => {
      try {
        if (peerConnectionRef.current) {
          const currentState = peerConnectionRef.current.signalingState;
          console.log('Handling peer negotiation offer. Signaling state:', currentState);

          // Only set remote description if in stable or have-remote-offer state
          if (currentState === 'stable' || currentState === 'have-local-offer') {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(data.offer)
            );
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            socket?.emit('peer:nego:done', {
              to: data.from,
              ans: answer,
            });
            console.log('Peer negotiation answer sent');
          } else {
            console.warn('Cannot handle peer negotiation. Current state:', currentState);
          }
        }
      } catch (error) {
        console.error('Failed to handle peer negotiation answer:', error);
      }
    },
    [socket]
  );

  // Handle peer negotiation final
  const handlePeerNegoFinal = useCallback(async (data: any) => {
    try {
      if (peerConnectionRef.current) {
        const currentState = peerConnectionRef.current.signalingState;
        console.log('Handling peer negotiation final. Signaling state:', currentState);

        // Only set remote description if in have-local-offer state
        if (currentState === 'have-local-offer') {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.ans)
          );
          console.log('Peer negotiation final answer set successfully');
        } else {
          console.warn('Cannot set peer negotiation final answer. Current state:', currentState);
        }
      }
    } catch (error) {
      console.error('Failed to handle peer negotiation final:', error);
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallActive(false);

    if (remoteSocketId && socket) {
      socket.emit('call:end', { to: remoteSocketId });
    }
  }, [remoteSocketId, socket]);

  // Set up socket event listeners
  useEffect(() => {
    onIncomingCall(handleIncomingCall);
    onCallAccepted(handleCallAccepted);
    onPeerNegoNeeded(handlePeerNegoNeeded);
    onPeerNegoFinal(handlePeerNegoFinal);

    return () => {
      offIncomingCall(handleIncomingCall);
      offCallAccepted(handleCallAccepted);
      offPeerNegoNeeded(handlePeerNegoNeeded);
      offPeerNegoFinal(handlePeerNegoFinal);
    };
  }, [
    onIncomingCall,
    offIncomingCall,
    handleIncomingCall,
    onCallAccepted,
    offCallAccepted,
    handleCallAccepted,
    onPeerNegoNeeded,
    offPeerNegoNeeded,
    handlePeerNegoNeeded,
    onPeerNegoFinal,
    offPeerNegoFinal,
    handlePeerNegoFinal,
  ]);

  // Handle peer negotiation needed event
  useEffect(() => {
    const peer = peerConnectionRef.current;
    if (peer) {
      peer.onnegotiationneeded = handlePeerNegoNeeded;
    }
  }, [handlePeerNegoNeeded]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return {
    localStream,
    remoteStream,
    callActive,
    initiateCall,
    endCall,
    handlePeerNegoNeedingAnswer,
  };
};
