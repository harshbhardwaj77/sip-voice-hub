import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserStatus } from '@/types/call';

interface UserWithStatus {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  status: UserStatus;
}

export function usePresence(currentUserId: string | null) {
  const [users, setUsers] = useState<UserWithStatus[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    // Fetch all users with their status
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar');

      const { data: statuses } = await supabase
        .from('user_status')
        .select('user_id, status');

      if (profiles && statuses) {
        const usersWithStatus = profiles
          .filter(p => p.id !== currentUserId)
          .map(profile => {
            const status = statuses.find(s => s.user_id === profile.id);
            return {
              ...profile,
              status: (status?.status as UserStatus) || 'offline',
            };
          });
        
        setUsers(usersWithStatus);
      }
    };

    fetchUsers();

    // Subscribe to real-time status changes
    const channel = supabase
      .channel('user-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
        },
        (payload) => {
          console.log('Status change:', payload);
          fetchUsers(); // Re-fetch users on any status change
        }
      )
      .subscribe();

    // Update own status to online
    const updateStatus = async () => {
      await supabase
        .from('user_status')
        .upsert({
          user_id: currentUserId,
          status: 'online',
          last_seen: new Date().toISOString(),
        });
    };

    updateStatus();

    // Update status periodically
    const interval = setInterval(updateStatus, 30000); // Every 30 seconds

    // Set status to offline on unmount
    return () => {
      clearInterval(interval);
      supabase
        .from('user_status')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
        .eq('user_id', currentUserId)
        .then(() => {
          supabase.removeChannel(channel);
        });
    };
  }, [currentUserId]);

  return users;
}
