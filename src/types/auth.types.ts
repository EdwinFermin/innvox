export interface User {
  id: string;
  friendly_id?: string;
  name: string;
  email: string;
  avatar: string;
  created_at: string;
  type: "ADMIN" | "USER" | "ACCOUNTANT";
  branch_ids: string[];
}
