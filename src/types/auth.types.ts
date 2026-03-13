export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  created_at: string;
  type: "ADMIN" | "USER";
  branch_ids: string[];
}
