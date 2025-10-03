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
  answerCall: (mediaType?: 'audio' | 'video') => Promise<void>;
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
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      },
      delegate: {
        onInvite: (invitation: Invitation) => {
          console.log('Incoming call from:', invitation.remoteIdentity.uri.user);
          // Prevent duplicate incoming calls if already handling one or in a call
          if (incomingCall || isInCall) {
            console.warn('Already in call or ringing; rejecting new invitation');
            try { invitation.reject(); } catch (e) { console.error('Failed to reject duplicate invite', e); }
            return;
          }
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
    console.log('Setting up session handlers');
    
    session.stateChange.addListener((state: SessionState) => {
      console.log('Session state:', state);
      
      switch (state) {
        case SessionState.Established:
          console.log('Call established');
          setIsInCall(true);
          setCurrentSession(session);
          
          // Setup remote media with proper audio playback
          const pc = session.sessionDescriptionHandler.peerConnection;
          const remoteMediaElement = new Audio();
          remoteMediaElement.autoplay = true;
          const remoteStream = new MediaStream();

          pc.addEventListener('track', (event: RTCTrackEvent) => {
            if (event.track) {
              console.log('Remote track event:', event.track.kind);
              remoteStream.addTrack(event.track);
            }
          });

          pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
            if (receiver.track) {
              console.log('Adding remote track:', receiver.track.kind);
              remoteStream.addTrack(receiver.track);
            }
          });
          
          remoteMediaElement.srcObject = remoteStream;
          remoteMediaElement.play().catch(e => console.error('Failed to play remote audio:', e));
          setRemoteStream(remoteStream);
          break;
          
        case SessionState.Terminated:
          console.log('Call terminated');
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

    console.log(`Making ${mediaType} call to ${target}`);

    // Get user media first
    const constraints = {
      audio: true,
      video: mediaType === 'video',
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Got local media stream:', stream.getTracks().map(t => t.kind));
      setLocalStream(stream);

      const inviter = new Inviter(userAgentRef.current, targetURI, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: mediaType === 'video',
          },
          peerConnectionOptions: {
            rtcConfiguration: {
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            },
          },
        },
      });

      setupSessionHandlers(inviter);
      setCurrentSession(inviter);

      // Send INVITE
      await inviter.invite({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: mediaType === 'video',
          },
        },
      });
      
      console.log('INVITE sent successfully');
      
    } catch (error) {
      console.error('Failed to make call:', error);
      setIsInCall(false);
      setCurrentSession(null);
      setLocalStream(null);
    }
  }, [config, setupSessionHandlers]);

  const answerCall = useCallback(async (mediaType?: 'audio' | 'video') => {
    if (!incomingCall) {
      console.error('No incoming call to answer');
      return;
    }

    console.log('Answering incoming call');

    try {
      // Infer if offer includes video
      const sdpText: string = (incomingCall as any)?.request?.message?.body || (incomingCall as any)?.request?.body || '';
      const offerHasVideo = /m=video/.test(sdpText);
      const useVideo = mediaType === 'video' || offerHasVideo;

      // Get user media (match the call type)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: useVideo,
      });
      console.log('Got local media stream for answer:', stream.getTracks().map(t => t.kind));
      setLocalStream(stream);

      await incomingCall.accept({
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: useVideo,
          },
        },
      });
      
      console.log('Call accepted successfully');
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
