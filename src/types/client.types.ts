import { Timestamp } from "firebase/firestore";

export interface Client {
  id: string;
  name: string;
  poBox: string;
  createdAt: Timestamp;
}
