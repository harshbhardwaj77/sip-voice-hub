export type UserStatus = 'online' | 'offline' | 'busy' | 'away';

export type CallType = 'audio' | 'video';

export interface User {
  id: string;
  name: string;
  username: string;
  status: UserStatus;
  avatar?: string;
}

export interface Call {
  id: string;
  caller: User;
  receiver: User;
  type: CallType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'ringing' | 'active' | 'ended' | 'missed';
}

export interface CallNotification {
  call: Call;
  visible: boolean;
}
