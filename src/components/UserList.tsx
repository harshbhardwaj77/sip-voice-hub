import { User, CallType } from "@/types/call";
import { UserAvatar } from "./UserAvatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface UserListProps {
  users: User[];
  currentUserId: string;
  onCall: (userId: string, type: CallType) => void;
}

export function UserList({ users, currentUserId, onCall }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUserId &&
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-4">Contacts</h2>
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
      </div>
      <div className="space-y-2">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <UserAvatar user={user} size="md" />
            <div className="flex-1">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{user.status}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full h-9 w-9 p-0"
                onClick={() => onCall(user.id, "audio")}
                disabled={user.status === "offline"}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full h-9 w-9 p-0"
                onClick={() => onCall(user.id, "video")}
                disabled={user.status === "offline"}
              >
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
