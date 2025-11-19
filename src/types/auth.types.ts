export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: ISODateString;
}

export type ISODateString = string;
