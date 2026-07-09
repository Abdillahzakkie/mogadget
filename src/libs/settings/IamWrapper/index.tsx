"use client";

import { useState } from "react";
import { useIamGroups, useIamPolicies, useIamUsers } from "@/hooks/Settings/useIam";
import { useMe } from "@/hooks/Settings/useMe";
import { iamApi } from "@/lib/iamApi";
import { ALL_PERMISSIONS } from "@/server/validators/iam";
import {
  Actions,
  Button,
  Card,
  CardHint,
  CardTitle,
  Err,
  Field,
  FieldLabel,
  Input,
  Muted,
  Row,
  SectionLead,
  SectionTitle,
  Table,
  TableScroll,
} from "../styled";

function UsersSection() {
  const { me } = useMe();
  const { users, mutate } = useIamUsers();
  const { groups } = useIamGroups();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await iamApi.createUser({ username, password, groupIds, attachedPolicyIds: [] });
      setUsername("");
      setPassword("");
      setGroupIds([]);
      await mutate();
    } catch {
      setErr("Could not create user (username may be taken).");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setErr(null);
    try {
      await iamApi.deleteUser(id);
      await mutate();
    } catch {
      setErr("Refused: you can't delete yourself or the last admin.");
    }
  }

  return (
    <Card>
      <CardTitle>Users</CardTitle>
      <CardHint>Accounts that can sign in to the admin.</CardHint>
      {err && <Err>{err}</Err>}
      <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Groups</th>
              <th>Policies</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>
                  {u.username}
                  {u._id === me?.sub && <Muted> (you)</Muted>}
                </td>
                <td>{u.groupIds.length}</td>
                <td>{u.attachedPolicyIds.length}</td>
                <td>
                  {u._id !== me?.sub && (
                    <Button type="button" $variant="ghost" onClick={() => remove(u._id)}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>

      <form onSubmit={create}>
        <CardHint style={{ marginTop: 16 }}>Add a user</CardHint>
        <Row>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>Temporary password (min 8)</FieldLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
        </Row>
        <Field>
          <FieldLabel>Groups</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {groups.map((g) => (
              <label key={g._id} style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={groupIds.includes(g._id)}
                  onChange={(e) =>
                    setGroupIds((ids) =>
                      e.target.checked ? [...ids, g._id] : ids.filter((x) => x !== g._id),
                    )
                  }
                />{" "}
                {g.name}
              </label>
            ))}
          </div>
        </Field>
        <Actions>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create user"}
          </Button>
        </Actions>
      </form>
    </Card>
  );
}

function PoliciesSection() {
  const { policies, mutate } = useIamPolicies();
  const [name, setName] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await iamApi.createPolicy({
        name,
        statements: actions.length ? [{ effect: "Allow", actions }] : [],
      });
      setName("");
      setActions([]);
      await mutate();
    } catch {
      setErr("Could not create policy (name may be taken).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Policies</CardTitle>
      <CardHint>Reusable sets of allowed actions. Built-ins are locked.</CardHint>
      {err && <Err>{err}</Err>}
      <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Actions</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p._id}>
                <td>
                  {p.name}
                  {p.managed && <Muted> (built-in)</Muted>}
                </td>
                <td>{p.statements.flatMap((s) => s.actions).join(", ") || "—"}</td>
                <td>
                  {!p.managed && (
                    <Button
                      type="button"
                      $variant="ghost"
                      onClick={async () => {
                        await iamApi.deletePolicy(p._id);
                        await mutate();
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>

      <form onSubmit={create}>
        <CardHint style={{ marginTop: 16 }}>Add a policy</CardHint>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Allowed actions</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm} style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={actions.includes(perm)}
                  onChange={(e) =>
                    setActions((a) =>
                      e.target.checked ? [...a, perm] : a.filter((x) => x !== perm),
                    )
                  }
                />{" "}
                {perm}
              </label>
            ))}
          </div>
        </Field>
        <Actions>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create policy"}
          </Button>
        </Actions>
      </form>
    </Card>
  );
}

function GroupsSection() {
  const { groups, mutate } = useIamGroups();
  const { policies } = useIamPolicies();
  const [name, setName] = useState("");
  const [policyIds, setPolicyIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await iamApi.createGroup({ name, policyIds, statements: [] });
      setName("");
      setPolicyIds([]);
      await mutate();
    } catch {
      setErr("Could not create group (name may be taken).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardTitle>Groups</CardTitle>
      <CardHint>Bundle policies and assign them to users. Built-ins are locked.</CardHint>
      {err && <Err>{err}</Err>}
      <TableScroll>
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Policies</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g._id}>
                <td>
                  {g.name}
                  {g.managed && <Muted> (built-in)</Muted>}
                </td>
                <td>{g.policyIds.length}</td>
                <td>
                  {!g.managed && (
                    <Button
                      type="button"
                      $variant="ghost"
                      onClick={async () => {
                        await iamApi.deleteGroup(g._id);
                        await mutate();
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>

      <form onSubmit={create}>
        <CardHint style={{ marginTop: 16 }}>Add a group</CardHint>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>Policies</FieldLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {policies.map((p) => (
              <label key={p._id} style={{ fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={policyIds.includes(p._id)}
                  onChange={(e) =>
                    setPolicyIds((ids) =>
                      e.target.checked ? [...ids, p._id] : ids.filter((x) => x !== p._id),
                    )
                  }
                />{" "}
                {p.name}
              </label>
            ))}
          </div>
        </Field>
        <Actions>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create group"}
          </Button>
        </Actions>
      </form>
    </Card>
  );
}

export default function IamWrapper() {
  return (
    <>
      <SectionTitle>Access (IAM)</SectionTitle>
      <SectionLead>Manage who can sign in and what they can do.</SectionLead>
      <UsersSection />
      <GroupsSection />
      <PoliciesSection />
    </>
  );
}
