"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EventTalent({ eventId, canManage }: { eventId: Id<"events">; canManage: boolean }) {
  const performers = useQuery(api.eventTalent.list, { eventId });
  const add = useMutation(api.eventTalent.add);
  const remove = useMutation(api.eventTalent.remove);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("DJ");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!canManage && !performers?.length) return null;
  return <section className="order-4 mt-5 rounded-[1.5rem] border border-white/10 bg-[#111] p-5 sm:mt-6 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">The lineup</p>
        <h2 className="mt-2 text-2xl font-black">Meet the talent</h2>
        <p className="mt-2 text-sm text-white/60">The people bringing this experience to life.</p></div>
      {canManage && <button type="button" onClick={() => setEditing(!editing)} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/10">{editing ? "Close" : "+ Add talent"}</button>}
    </div>
    {canManage && editing && <form className="mt-5 grid gap-3 rounded-xl bg-white/5 p-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try { await add({ eventId, name, role, bio: bio || undefined, instagram: instagram || undefined }); setName(""); setBio(""); setInstagram(""); setEditing(false); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not save performer."); }
      finally { setBusy(false); }
    }}>
      <label className="text-sm">Stage name / artist name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      <label className="text-sm">Performer type<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white">
        {["DJ","Singer","Rapper","Band","Host / MC","Comedian","Dancer","Special guest","Other"].map(v => <option key={v}>{v}</option>)}
      </select></label>
      <label className="text-sm">Short bio (optional)<textarea maxLength={400} value={bio} onChange={e => setBio(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      <label className="text-sm">Instagram username (optional)<input maxLength={30} placeholder="@artist" value={instagram} onChange={e => setInstagram(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy || !name.trim()} className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black disabled:opacity-50">{busy ? "Saving..." : "Add performer"}</button>
    </form>}
    {performers?.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {performers.map(p => <div key={p._id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xl font-bold text-orange-300">{p.name.charAt(0).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="font-bold">{p.name}</p><p className="text-sm text-orange-300">{p.role}</p>
          {p.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{p.bio}</p>}
          {p.instagram && <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-violet-300 hover:underline">@{p.instagram}</a>}
          {canManage && <button type="button" className="mt-3 block text-xs text-red-300 hover:underline" onClick={async () => { if (window.confirm(`Remove ${p.name} from this lineup?`)) { try { await remove({ performerId: p._id }); } catch { setError("Could not remove performer."); } } }}>Remove</button>}
        </div>
      </div>)}
    </div> : <p className="mt-5 text-sm text-white/50">No performers added yet.</p>}
    {error && !editing && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>;
}
