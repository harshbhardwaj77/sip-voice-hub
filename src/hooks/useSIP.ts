import { useState, useEffect, useCallback, useRef } from 'react';
import { UserAgent, Inviter, Invitation, SessionState, RegistererState, Registerer } from 'sip.js';

interface SIPConfig {
  server: string; // WebSocket URL (e.g., wss://voip.techwithharsh.in:8089/ws)
  username: string;
  password: string;
  domain: string; // SIP domain (e.g., voip.techwithharsh.in)
}

interface UseSIPReturn {
  isRegistered: boolean;
  isInCall: boolean;
  currentSession: any;
  makeCall: (target: string, mediaType: 'audio' | 'video') => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: () => void;
  incomingCall: Invitation | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function useSIP(config: SIPConfig | null): UseSIPReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<Invitation | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<any>(null);

  // Initialize UserAgent
  useEffect(() => {
    if (!config) return;

    const uri = UserAgent.makeURI(`sip:${config.username}@${config.domain}`);
    if (!uri) {
      console.error('Failed to create URI');
      return;
    }

    const transportOptions = {
      server: config.server,
    };

    const userAgentOptions = {
      authorizationUsername: config.username,
      authorizationPassword: config.password,
      transportOptions,
      uri,
      delegate: {
        onInvite: (invitation: Invitation) => {
          console.log('Incoming call from:', invitation.remoteIdentity.uri.user);
          setIncomingCall(invitation);
          
          // Setup session handlers
          setupSessionHandlers(invitation);
        },
      },
    };

    const userAgent = new UserAgent(userAgentOptions);
    userAgentRef.current = userAgent;

    // Start the UserAgent
    userAgent.start().then(() => {
      console.log('UserAgent started');
      
      // Register
      const registerer = new Registerer(userAgent);
      registererRef.current = registerer;
      
      registerer.stateChange.addListener((state) => {
        console.log('Registerer state:', state);
        setIsRegistered(state === RegistererState.Registered);
      });

      registerer.register();
    }).catch((error) => {
      console.error('Failed to start UserAgent:', error);
    });

    return () => {
      if (registererRef.current) {
        registererRef.current.unregister();
      }
      if (userAgentRef.current) {
        userAgentRef.current.stop();
      }
    };
  }, [config]);

  const setupSessionHandlers = useCallback((session: any) => {
    session.stateChange.addListener((state: SessionState) => {
      console.log('Session state:', state);
      
      switch (state) {
        case SessionState.Established:
          setIsInCall(true);
          setCurrentSession(session);
          
          // Setup remote media
          const remoteMediaElement = new Audio();
          const remoteStream = new MediaStream();
          
          session.sessionDescriptionHandler.peerConnection
            .getReceivers()
            .forEach((receiver: RTCRtpReceiver) => {
              if (receiver.track) {
                remoteStream.addTrack(receiver.track);
              }
            });
          
          remoteMediaElement.srcObject = remoteStream;
          remoteMediaElement.play();
          setRemoteStream(remoteStream);
          break;
          
        case SessionState.Terminated:
          setIsInCall(false);
          setCurrentSession(null);
          setIncomingCall(null);
          setLocalStream(null);
          setRemoteStream(null);
          break;
      }
    });
  }, []);

  const makeCall = useCallback(async (target: string, mediaType: 'audio' | 'video') => {
    if (!userAgentRef.current) {
      console.error('UserAgent not initialized');
      return;
    }

    const targetURI = UserAgent.makeURI(`sip:${target}@${config?.domain}`);
    if (!targetURI) {
      console.error('Failed to create target URI');
      return;
    }

    // Get user media
    const constraints = {
      audio: true,
      video: mediaType === 'video',
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const inviter = new Inviter(userAgentRef.current, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: mediaType === 'video',
          },
        },
      });

      setupSessionHandlers(inviter);

      // Send INVITE
      await inviter.invite();
      setCurrentSession(inviter);
      
    } catch (error) {
      console.error('Failed to make call:', error);
    }
  }, [config, setupSessionHandlers]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) {
      console.error('No incoming call to answer');
      return;
    }

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setLocalStream(stream);

      await incomingCall.accept();
      setCurrentSession(incomingCall);
      
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (currentSession) {
      currentSession.bye();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    setIsInCall(false);
    setCurrentSession(null);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
  }, [currentSession, localStream]);

  return {
    isRegistered,
    isInCall,
    currentSession,
    makeCall,
    answerCall,
    endCall,
    incomingCall,
    localStream,
    remoteStream,
  };
}
