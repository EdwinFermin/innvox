import { Spinner } from "@/components/ui/spinner";

export function SpinnerLabel({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 [--radius:1.2rem] my-4 mx-4">
      <Spinner />
      {label || "Processing"}
    </div>
  );
}
