import { useState } from "react";
import { Call } from "@/types/call";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallInterfaceProps {
  call: Call;
  currentUserId: string;
  onEndCall: () => void;
}

export function CallInterface({ call, currentUserId, onEndCall }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(call.type === "video");
  
  const otherUser = call.caller.id === currentUserId ? call.receiver : call.caller;
  const callDuration = call.startTime ? Math.floor((Date.now() - call.startTime.getTime()) / 1000) : 0;
  const minutes = Math.floor(callDuration / 60);
  const seconds = callDuration % 60;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-8">
        <Card className="bg-card/50 border-2 overflow-hidden">
          {/* Video Area */}
          <div className="aspect-video bg-secondary/50 relative flex items-center justify-center">
            {call.type === "video" && isVideoOn ? (
              <div className="text-center">
                <div className="h-32 w-32 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-16 w-16 text-primary" />
                </div>
                <p className="text-muted-foreground">Video call in progress</p>
              </div>
            ) : (
              <div className="text-center">
                <UserAvatar user={otherUser} size="xl" showStatus={false} />
                <h2 className="text-2xl font-bold mt-4">{otherUser.name}</h2>
                <p className="text-muted-foreground mt-2">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            )}
            
            {/* Small self preview for video calls */}
            {call.type === "video" && isVideoOn && (
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-secondary rounded-lg border-2 border-border flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Your video</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-8">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "secondary"}
                className="rounded-full h-14 w-14 p-0"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>

              {/* End Call Button */}
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-16 w-16 p-0"
                onClick={onEndCall}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>

              {/* Video Toggle Button */}
              {call.type === "video" && (
                <Button
                  size="lg"
                  variant={isVideoOn ? "secondary" : "destructive"}
                  className="rounded-full h-14 w-14 p-0"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? (
                    <Video className="h-6 w-6" />
                  ) : (
                    <VideoOff className="h-6 w-6" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
