import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

export default function NotFound() {
  return (
    <EmptyState
      title="That page doesn't exist"
      action={
        <Button asChild variant="outline">
          <Link href="/tickets">Go to tickets</Link>
        </Button>
      }
    >
      It may have been removed, or you may not have access to it.
    </EmptyState>
  );
}
