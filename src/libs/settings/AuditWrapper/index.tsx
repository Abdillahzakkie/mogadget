"use client";

import { useState } from "react";
import { useAudit } from "@/hooks/Settings/useAudit";
import {
  Actions,
  Button,
  Card,
  Err,
  Field,
  FieldLabel,
  Input,
  Muted,
  SectionLead,
  SectionTitle,
  Table,
  TableScroll,
} from "../styled";

function StatusPill({ code }: { code: number }) {
  const ok = code < 400;
  return (
    <span style={{ color: ok ? "var(--brand)" : "var(--danger, #c0362c)", fontWeight: 600 }}>
      {code}
    </span>
  );
}

export default function AuditWrapper() {
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useAudit({ action: action || undefined, page });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <SectionTitle>Audit log</SectionTitle>
      <SectionLead>Every admin mutation, most recent first.</SectionLead>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAction(actionInput.trim());
          }}
        >
          <Field>
            <FieldLabel>Filter by action (exact, e.g. product.update)</FieldLabel>
            <Input
              value={actionInput}
              placeholder="all actions"
              onChange={(e) => setActionInput(e.target.value)}
            />
          </Field>
          <Actions>
            <Button type="submit">Apply</Button>
            {action && (
              <Button
                type="button"
                $variant="ghost"
                onClick={() => {
                  setActionInput("");
                  setAction("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </Actions>
        </form>
      </Card>

      {error && <Err>Could not load the audit log.</Err>}
      {isLoading && <Muted>Loading…</Muted>}

      {data && (
        <Card>
          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r._id}>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.username}</td>
                    <td>{r.action}</td>
                    <td>{r.targetType ?? "—"}</td>
                    <td>
                      <StatusPill code={r.responseCode} />
                    </td>
                    <td>{Math.round(r.durationMs)}ms</td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <Muted>No matching entries.</Muted>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableScroll>
          <Actions>
            <Button
              type="button"
              $variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </Button>
            <Muted>
              Page {data.page} of {totalPages} · {data.total} total
            </Muted>
            <Button
              type="button"
              $variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </Actions>
        </Card>
      )}
    </>
  );
}
