import { Timestamp } from "firebase/firestore";

export interface Branch {
  id: string;
  code: string;
  name: string;
  createdAt: Timestamp;
}
