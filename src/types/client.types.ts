export interface Client {
  id: string;
  name: string;
  po_box: string;
  email: string | null;
  phone: string | null;
  tokens: number;
  created_at: string;
}
