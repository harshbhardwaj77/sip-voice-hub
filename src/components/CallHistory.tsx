import { Call } from "@/types/call";
import { UserAvatar } from "./UserAvatar";
import { Card } from "@/components/ui/card";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";

interface CallHistoryProps {
  calls: Call[];
  currentUserId: string;
}

export function CallHistory({ calls, currentUserId }: CallHistoryProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Call History</h2>
      <div className="space-y-2">
        {calls.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No call history</p>
        ) : (
          calls.map((call) => {
            const isOutgoing = call.caller.id === currentUserId;
            const otherUser = isOutgoing ? call.receiver : call.caller;
            
            return (
              <div
                key={call.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <UserAvatar user={otherUser} size="sm" showStatus={false} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{otherUser.name}</p>
                    {call.type === "video" && (
                      <Video className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(call.startTime)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {call.status === "missed" ? (
                      <PhoneMissed className="h-4 w-4 text-destructive" />
                    ) : isOutgoing ? (
                      <PhoneOutgoing className="h-4 w-4" />
                    ) : (
                      <PhoneIncoming className="h-4 w-4" />
                    )}
                    <span className="text-sm">{formatDuration(call.duration)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
