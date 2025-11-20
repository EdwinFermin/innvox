export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: ISODateString;
  type: "ADMIN" | "USER";
}

export type ISODateString = string;
