export interface TokenEvent {
  id: string;
  client_id: string;
  delta: number;
  tokens_after: number;
  event_type: "manual" | "scan" | "reset" | "registration";
  note: string | null;
  created_by: string | null;
  created_at: string;
}
