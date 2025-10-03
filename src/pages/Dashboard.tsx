import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Call, CallType } from "@/types/call";
import { UserList } from "@/components/UserList";
import { CallHistory } from "@/components/CallHistory";
import { CallNotification } from "@/components/CallNotification";
import { CallInterface } from "@/components/CallInterface";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { LogOut, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePresence } from "@/hooks/usePresence";
import { useSIP } from "@/hooks/useSIP";

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sipConfig, setSipConfig] = useState<any>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  // Use real-time presence hook
  const users = usePresence(currentUser?.id || null);

  // Use SIP hook (will be configured once we have SIP credentials)
  const sip = useSIP(sipConfig);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch user profile
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching profile:", error);
            return;
          }
          setCurrentUser(data);

          // Set SIP configuration with user's SIP password
          if (data?.sip_password) {
            setSipConfig({
              server: "wss://voip.techwithharsh.in/ws",
              username: data.username,
              password: data.sip_password,
              domain: "voip.techwithharsh.in",
            });
          }
        });
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch call history
  useEffect(() => {
    if (!currentUser) return;

    const fetchCallHistory = async () => {
      const { data, error } = await supabase
        .from("call_history")
        .select(`
          *,
          caller:caller_id(id, name, username, avatar),
          receiver:receiver_id(id, name, username, avatar)
        `)
        .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching call history:", error);
        return;
      }

      // Transform data to match Call interface
      const transformedCalls = data?.map((call: any) => ({
        id: call.id,
        caller: call.caller,
        receiver: call.receiver,
        type: call.call_type,
        startTime: new Date(call.start_time),
        endTime: call.end_time ? new Date(call.end_time) : undefined,
        duration: call.duration,
        status: call.status,
      })) || [];

      setCalls(transformedCalls);
    };

    fetchCallHistory();
  }, [currentUser]);

  // Listen for incoming SIP calls
  useEffect(() => {
    if (sip.incomingCall && !incomingCall) {
      // Create Call object from SIP invitation
      const caller = users.find(u => u.username === sip.incomingCall?.remoteIdentity.uri.user);

      // Infer media type from SDP
      const sdp: string = (sip.incomingCall as any)?.request?.message?.body || (sip.incomingCall as any)?.request?.body || '';
      const mediaType: CallType = /m=video/.test(sdp) ? 'video' : 'audio';
      
      if (caller && currentUser) {
        const newCall: Call = {
          id: Date.now().toString(),
          caller: caller,
          receiver: currentUser,
          type: mediaType,
          startTime: new Date(),
          status: "ringing",
        };
        
        setIncomingCall(newCall);
        
        toast({
          title: "Incoming Call",
          description: `${caller.name} is calling you`,
        });
      }
    }
  }, [sip.incomingCall, users, currentUser, incomingCall]);

  // Clear active call when SIP session ends (only when transitioning from true -> false)
  const prevIsInCallRef = useRef(sip.isInCall);
  useEffect(() => {
    const wasInCall = prevIsInCallRef.current;
    if (wasInCall && !sip.isInCall && activeCall) {
      console.log('SIP session ended, clearing active call');
      handleEndCall();
    }
    prevIsInCallRef.current = sip.isInCall;
  }, [sip.isInCall, activeCall]);

  const handleProfileUpdate = async () => {
    // Refetch user profile after update
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.session.user.id)
        .single();

      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          status: 'online',
          avatar: profile.avatar,
        });

        // Update SIP config if password is set
        if (profile.sip_password) {
          setSipConfig({
            server: "wss://voip.techwithharsh.in/ws",
            username: profile.username,
            password: profile.sip_password,
            domain: "voip.techwithharsh.in",
          });
        }
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCall = async (receiverId: string, type: CallType) => {
    if (!currentUser) return;

    const receiver = users.find((u) => u.id === receiverId);
    if (!receiver) return;

    const newCall: Call = {
      id: Date.now().toString(),
      caller: currentUser,
      receiver,
      type,
      startTime: new Date(),
      status: "ringing",
    };

    // Set active call FIRST so caller sees the interface
    setActiveCall(newCall);

    // Use SIP.js to make the call
    if (sipConfig) {
      await sip.makeCall(receiver.username, type);
    }

    // Store call in database
    await supabase.from("call_history").insert({
      caller_id: currentUser.id,
      receiver_id: receiverId,
      call_type: type,
      status: "ringing",
      start_time: new Date().toISOString(),
    });

    toast({
      title: "Calling...",
      description: `Calling ${receiver.name}`,
    });
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    // Answer using SIP.js with the correct media type
    await sip.answerCall(incomingCall.type);

    const updatedCall = {
      ...incomingCall,
      status: "active" as const,
      startTime: new Date(),
    };

    setActiveCall(updatedCall);
    setIncomingCall(null);

    // Update call in database
    await supabase
      .from("call_history")
      .update({
        status: "active",
        start_time: new Date().toISOString(),
      })
      .eq("caller_id", incomingCall.caller.id)
      .eq("receiver_id", incomingCall.receiver.id)
      .eq("status", "ringing");

    toast({
      title: "Call connected",
      description: `Connected with ${updatedCall.caller.name}`,
    });
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    // End call using SIP.js
    sip.endCall();

    const missedCall = {
      ...incomingCall,
      status: "missed" as const,
      endTime: new Date(),
      duration: 0,
    };

    setCalls([missedCall, ...calls]);
    setIncomingCall(null);

    // Update call in database
    await supabase
      .from("call_history")
      .update({
        status: "missed",
        end_time: new Date().toISOString(),
        duration: 0,
      })
      .eq("caller_id", incomingCall.caller.id)
      .eq("receiver_id", incomingCall.receiver.id)
      .eq("status", "ringing");

    toast({
      title: "Call declined",
      description: "Call was declined",
      variant: "destructive",
    });
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    // End call using SIP.js
    sip.endCall();

    const duration = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
    const endedCall = {
      ...activeCall,
      status: "ended" as const,
      endTime: new Date(),
      duration,
    };

    setCalls([endedCall, ...calls]);
    setActiveCall(null);

    // Update call in database
    await supabase
      .from("call_history")
      .update({
        status: "ended",
        end_time: new Date().toISOString(),
        duration,
      })
      .eq("id", activeCall.id);

    toast({
      title: "Call ended",
      description: `Call duration: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`,
    });
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SIP Calling App</h1>
              {sipConfig && (
                <p className="text-xs text-muted-foreground">
                  {sip.isRegistered ? "✓ Registered" : "⏳ Connecting..."}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={currentUser} size="sm" />
              <div className="text-right">
                <p className="font-medium text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
              </div>
            </div>
            <ProfileSettings user={currentUser} onUpdate={handleProfileUpdate} />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!sipConfig && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ SIP not configured. Please set your SIP password in your profile settings to enable calling.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserList
            users={users}
            currentUserId={currentUser.id}
            onCall={handleCall}
          />
          <CallHistory calls={calls} currentUserId={currentUser.id} />
        </div>
      </main>

      {/* Call Notification */}
      {incomingCall && (
        <CallNotification
          call={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Active Call Interface */}
      {activeCall && (
        <CallInterface
          call={activeCall}
          currentUserId={currentUser.id}
          onEndCall={handleEndCall}
          localStream={sip.localStream}
          remoteStream={sip.remoteStream}
        />
      )}
    </div>
  );
}
