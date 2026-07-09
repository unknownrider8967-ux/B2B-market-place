import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  company_status_change: "bg-amber-500/12 text-amber-600 border-amber-400/30",
  login:                 "bg-primary/12 text-primary border-primary/30",
};

function LogSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {["Time", "Action", "User", "Entity", "Metadata"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {[1, 2, 3, 4, 5].map((j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full skeleton-shimmer" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [limit, setLimit] = useState(100);
  const { data: logs = [], isLoading } = useListAuditLogs({ limit });

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">System-wide activity trail for compliance and review.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Show</span>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="250">250</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">entries</span>
        </div>
      </div>

      {isLoading ? (
        <LogSkeleton />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground border-border"}`}
                      >
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[120px] truncate">
                      {log.userId}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entityType ? (
                        <span>
                          <span className="capitalize text-muted-foreground text-xs">{log.entityType}</span>
                          {log.entityId != null && (
                            <span className="text-foreground font-medium text-xs ml-1">#{log.entityId}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate font-mono">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
