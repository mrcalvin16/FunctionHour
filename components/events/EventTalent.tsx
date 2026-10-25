"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EventTalent({ eventId, canManage }: { eventId: Id<"events">; canManage: boolean }) {
  const performers = useQuery(api.eventTalent.list, { eventId });
  const add = useMutation(api.eventTalent.add);
  const remove = useMutation(api.eventTalent.remove);
  const update = useMutation(api.eventTalent.update);
  const move = useMutation(api.eventTalent.move);
  const uploadUrl = useMutation(api.events.generateUploadUrl);
  const [editId, setEditId] = useState<Id<"eventTalent"> | null>(null);
  const [photo, setPhoto] = useState<Id<"_storage"> | undefined>();
  const [headliner, setHeadliner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("DJ");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  if (!canManage && !performers?.length) return null;
  return <section className="order-4 mt-5 rounded-[1.5rem] border border-white/10 bg-[#111] p-5 sm:mt-6 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">The lineup</p>
        <h2 className="mt-2 text-2xl font-black">Meet the talent</h2>
        <p className="mt-2 text-sm text-white/60">The people bringing this experience to life.</p></div>
      {canManage && <button type="button" onClick={() => { setEditing(!editing); setEditId(null); setName(""); setBio(""); setInstagram(""); setPhoto(undefined); setHeadliner(false); }} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold hover:bg-white/10">{editing ? "Close" : "+ Add talent"}</button>}
    </div>
    {canManage && editing && <form className="mt-5 grid gap-3 rounded-xl bg-white/5 p-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("");
      try { const details = { name, role, bio: bio || undefined, instagram: instagram || undefined, imageStorageId: photo, isHeadliner: headliner }; if (editId) await update({ performerId: editId, ...details }); else await add({ eventId, ...details }); setName(""); setBio(""); setInstagram(""); setPhoto(undefined); setHeadliner(false); setEditId(null); setEditing(false); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not save performer."); }
      finally { setBusy(false); }
    }}>
      <label className="text-sm">Stage name / artist name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      <label className="text-sm">Performer type<select value={role} onChange={e => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white">
        {["DJ","Singer","Rapper","Band","Host / MC","Comedian","Dancer","Special guest","Other"].map(v => <option key={v}>{v}</option>)}
      </select></label>
      <label className="text-sm">Short bio (optional)<textarea maxLength={400} value={bio} onChange={e => setBio(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      <label className="text-sm">Instagram username (optional)<input maxLength={30} placeholder="@artist" value={instagram} onChange={e => setInstagram(e.target.value)} className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-900 p-3 text-white" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={headliner} onChange={e => setHeadliner(e.target.checked)} /> Feature as headliner</label>
      <label className="text-sm">Performer photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="mt-1 block w-full text-sm" onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return;
        if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5_000_000) { setError("Use a JPG, PNG or WebP under 5 MB."); return; }
        setUploading(true); setError("");
        try { const url = await uploadUrl({}); const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file }); if (!response.ok) throw new Error("Upload failed"); const result = await response.json(); setPhoto(result.storageId as Id<"_storage">); }
        catch { setError("Photo upload failed. Try again."); } finally { setUploading(false); }
      }} /></label>
      {photo && <p className="text-xs text-green-300">Photo ready to save</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={busy || uploading || !name.trim()} className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-black disabled:opacity-50">{busy ? "Saving..." : editId ? "Save changes" : "Add performer"}</button>
    </form>}
    {performers?.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {performers.map(p => <div key={p._id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <TalentPhoto storageId={p.imageStorageId} name={p.name} />
        <div className="min-w-0 flex-1"><p className="font-bold">{p.name} {p.isHeadliner && <span className="ml-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] text-black">HEADLINER</span>}</p><p className="text-sm text-orange-300">{p.role}</p>
          {p.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">{p.bio}</p>}
          {p.instagram && <a href={`https://www.instagram.com/${p.instagram}/`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-violet-300 hover:underline">@{p.instagram}</a>}
          {canManage && <div className="mt-3 flex flex-wrap gap-3"><button type="button" className="text-xs text-white hover:underline" onClick={() => { setEditId(p._id); setName(p.name); setRole(p.role); setBio(p.bio || ""); setInstagram(p.instagram || ""); setPhoto(p.imageStorageId); setHeadliner(Boolean(p.isHeadliner)); setEditing(true); }}>Edit</button><button type="button" className="text-xs text-white hover:underline" onClick={() => void move({ performerId: p._id, direction: "up" }).catch(() => setError("Could not reorder lineup."))}>↑ Up</button><button type="button" className="text-xs text-white hover:underline" onClick={() => void move({ performerId: p._id, direction: "down" }).catch(() => setError("Could not reorder lineup."))}>↓ Down</button><button type="button" className="text-xs text-red-300 hover:underline" onClick={async () => { if (window.confirm(`Remove ${p.name} from this lineup?`)) { try { await remove({ performerId: p._id }); } catch { setError("Could not remove performer."); } } }}>Remove</button></div>}
        </div>
      </div>)}
    </div> : <p className="mt-5 text-sm text-white/50">No performers added yet.</p>}
    {error && !editing && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>;
}

function TalentPhoto({ storageId, name }: { storageId?: Id<"_storage">; name: string }) {
  const url = useQuery(api.events.getImageUrl, storageId ? { storageId } : "skip");
  return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500/15 text-xl font-bold text-orange-300">
    {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
  </div>;
}
