import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { mockUsers } from "@/data/mockUsers";
import { Call, CallType, User } from "@/types/call";
import { UserList } from "@/components/UserList";
import { CallHistory } from "@/components/CallHistory";
import { CallNotification } from "@/components/CallNotification";
import { CallInterface } from "@/components/CallInterface";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { LogOut, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState(mockUsers);
  const [calls, setCalls] = useState<Call[]>([]);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId");
    if (!userId) {
      navigate("/");
      return;
    }
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("currentUserId");
    navigate("/");
  };

  const handleCall = (receiverId: string, type: CallType) => {
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

    // Simulate incoming call for demo
    setTimeout(() => {
      setIncomingCall(newCall);
      toast({
        title: "Calling...",
        description: `Calling ${receiver.name}`,
      });
    }, 500);
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    const updatedCall = {
      ...incomingCall,
      status: "active" as const,
      startTime: new Date(),
    };

    setActiveCall(updatedCall);
    setIncomingCall(null);
    
    toast({
      title: "Call connected",
      description: `Connected with ${updatedCall.caller.name}`,
    });
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;

    const missedCall = {
      ...incomingCall,
      status: "missed" as const,
      endTime: new Date(),
      duration: 0,
    };

    setCalls([missedCall, ...calls]);
    setIncomingCall(null);
    
    toast({
      title: "Call declined",
      description: "Call was declined",
      variant: "destructive",
    });
  };

  const handleEndCall = () => {
    if (!activeCall) return;

    const duration = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
    const endedCall = {
      ...activeCall,
      status: "ended" as const,
      endTime: new Date(),
      duration,
    };

    setCalls([endedCall, ...calls]);
    setActiveCall(null);
    
    toast({
      title: "Call ended",
      description: `Call duration: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`,
    });
  };

  if (!currentUser) {
    return null;
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
            <h1 className="text-xl font-bold">SIP Calling App</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar user={currentUser} size="sm" />
              <div className="text-right">
                <p className="font-medium text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentUser.status}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
        />
      )}
    </div>
  );
}
