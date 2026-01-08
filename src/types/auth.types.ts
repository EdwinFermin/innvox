export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: ISODateString;
  type: "ADMIN" | "USER";
  branchIds?: string[];
}

export type ISODateString = string;
