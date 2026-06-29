type Status = "PENDING" | "ACCEPTED" | "REJECTED" | "OPEN" | "CLOSED";

const styles: Record<Status, string> = {
  PENDING: "bg-warning/15 text-warning ring-1 ring-warning/30",
  ACCEPTED: "bg-success/15 text-success ring-1 ring-success/30",
  REJECTED: "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
  OPEN: "bg-success/15 text-success ring-1 ring-success/30",
  CLOSED: "bg-muted text-muted-foreground ring-1 ring-border",
};

const dots: Record<Status, string> = {
  PENDING: "bg-warning",
  ACCEPTED: "bg-success",
  REJECTED: "bg-destructive",
  OPEN: "bg-success",
  CLOSED: "bg-muted-foreground",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status-pill ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}
