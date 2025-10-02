import { useEffect, useRef } from "react";
import { Call } from "@/types/call";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, PhoneOff, Video } from "lucide-react";

interface CallNotificationProps {
  call: Call;
  onAccept: () => void;
  onDecline: () => void;
}

export function CallNotification({ call, onAccept, onDecline }: CallNotificationProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Play ringtone when component mounts
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(error => {
        console.log('Could not play ringtone:', error);
      });
    }

    // Stop ringtone when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onAccept();
  };

  const handleDecline = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    onDecline();
  };
  return (
    <>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 call-notification-enter">
        <Card className="w-96 shadow-2xl border-2 border-primary/20">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <UserAvatar user={call.caller} size="lg" showStatus={false} />
                <div className="absolute inset-0 rounded-full border-4 border-primary pulse-ring" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{call.caller.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {call.type === "video" ? (
                    <>
                      <Video className="h-3.5 w-3.5" />
                      Video call
                    </>
                  ) : (
                    <>
                      <Phone className="h-3.5 w-3.5" />
                      Audio call
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDecline}
                size="lg"
              >
                <PhoneOff className="mr-2 h-4 w-4" />
                Decline
              </Button>
              <Button
                className="flex-1 bg-success hover:bg-success/90"
                onClick={handleAccept}
                size="lg"
              >
                <Phone className="mr-2 h-4 w-4" />
                Accept
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
