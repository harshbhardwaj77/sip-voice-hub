import { useState, useEffect, useRef } from "react";
import { Call } from "@/types/call";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioLevel } from "@/hooks/useAudioLevel";

interface CallInterfaceProps {
  call: Call;
  currentUserId: string;
  onEndCall: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

export function CallInterface({ call, currentUserId, onEndCall, localStream, remoteStream }: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(call.type === "video");
  
  const otherUser = call.caller.id === currentUserId ? call.receiver : call.caller;
  const callDuration = call.startTime ? Math.floor((Date.now() - call.startTime.getTime()) / 1000) : 0;
  const minutes = Math.floor(callDuration / 60);
  const seconds = callDuration % 60;

  // Media refs
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream as any;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream as any;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Detect audio levels for speaking indicator
  const isLocalSpeaking = useAudioLevel(localStream);
  const isRemoteSpeaking = useAudioLevel(remoteStream);

  const handleMuteToggle = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const handleVideoToggle = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-8">
        <Card className="bg-card/50 border-2 overflow-hidden">
          {/* Video Area */}
          <div className="aspect-video bg-secondary/50 relative flex items-center justify-center">
            {call.type === "video" && isVideoOn ? (
              <video ref={remoteVideoRef} className="absolute inset-0 w-full h-full object-cover" playsInline autoPlay />
            ) : (
              <div className="text-center">
                <div className="relative inline-block">
                  <UserAvatar user={otherUser} size="xl" showStatus={false} />
                  {/* Speaking indicator ripple */}
                  {isRemoteSpeaking && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                  )}
                </div>
                <h2 className="text-2xl font-bold mt-4">{otherUser.name}</h2>
                <p className="text-muted-foreground mt-2">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            )}
            
            {/* Small self preview for video calls */}
            {call.type === "video" && isVideoOn && (
              <div className="absolute bottom-4 right-4 w-32 h-24 bg-secondary rounded-lg border-2 border-border overflow-hidden">
                <video ref={localVideoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-8">
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <div className="relative">
                <Button
                  size="lg"
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-full h-14 w-14 p-0"
                  onClick={handleMuteToggle}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
                {/* Speaking indicator for local user */}
                {!isMuted && isLocalSpeaking && (
                  <div className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                )}
              </div>

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
                  onClick={handleVideoToggle}
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
