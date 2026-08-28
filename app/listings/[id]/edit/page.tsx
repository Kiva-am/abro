"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ethiopianCities } from "@/lib/ethiopian-locations";

type Photo = { id: number; storageKey: string; altText: string };
type Form = {
  title: string; description: string; citySlug: string; neighborhoodSlug: string; monthlyRent: number; deposit: number;
  roomType: string; bedrooms: number; bathrooms: number; furnished: boolean; utilitiesIncluded: boolean; availableFrom: string; houseRules: string;
};

const emptyForm: Form = { title: "", description: "", citySlug: "addis-ababa", neighborhoodSlug: "addis-ababa-bole", monthlyRent: 0, deposit: 0, roomType: "private_room", bedrooms: 1, bathrooms: 1, furnished: false, utilitiesIncluded: false, availableFrom: "", houseRules: "" };

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<Form>(emptyForm);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const city = ethiopianCities.find((item) => item.slug === form.citySlug) ?? ethiopianCities[0];
  const neighborhoods = useMemo(() => city.neighborhoods, [city]);
  const update = (key: keyof Form, value: Form[keyof Form]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => { void (async () => {
    try {
      const response = await fetch(`/api/listings/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) as { listing?: Record<string, unknown> & { photos?: Photo[] }; error?: string } : {};
      if (!response.ok || !data.listing) throw new Error(data.error || "Unable to load this listing.");
      const item = data.listing;
      let rules: string[] = []; try { rules = JSON.parse(String(item.houseRules || "[]")); } catch {}
      setForm({ title: String(item.title || ""), description: String(item.description || ""), citySlug: String(item.citySlug || "addis-ababa"), neighborhoodSlug: String(item.neighborhoodSlug || ""), monthlyRent: Number(item.monthlyRent) || 0, deposit: Number(item.deposit) || 0, roomType: String(item.roomType || "private_room"), bedrooms: Number(item.bedrooms) || 1, bathrooms: Number(item.bathrooms) || 1, furnished: Boolean(item.furnished), utilitiesIncluded: Boolean(item.utilitiesIncluded), availableFrom: String(item.availableFrom || ""), houseRules: rules.join("\n") });
      setPhotos(item.photos ?? []);
      if (searchParams.get("photo") === "retry") setMessage("Your listing was published, but the photos did not upload. Choose them again below.");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to load this listing."); }
    finally { setLoading(false); }
  })(); }, [id, searchParams]);

  async function removePhoto(photoId: number) {
    setMessage("");
    const response = await fetch(`/api/listings/${id}/photos`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ photoId }) });
    const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
    if (!response.ok) { setMessage(data.error || "Unable to remove this photo."); return; }
    setPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/listings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const text = await response.text(); const data = text ? JSON.parse(text) as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Unable to save changes.");
      if (newPhotos.length) {
        const upload = new FormData(); newPhotos.forEach((file) => upload.append("photos", file));
        const photoResponse = await fetch(`/api/listings/${id}/photos`, { method: "POST", body: upload });
        const photoText = await photoResponse.text(); const photoData = photoText ? JSON.parse(photoText) as { error?: string } : {};
        if (!photoResponse.ok) throw new Error(`Details saved, but photos failed: ${photoData.error || "try again"}`);
      }
      window.location.assign("/dashboard");
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to save changes."); setSaving(false); }
  }

  if (loading) return <main className="listing-form-page"><div className="editor-loading">Loading your listing…</div></main>;
  return <main className="listing-form-page">
    <header className="onboarding-header shell"><Link className="brand" href="/" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></Link><Link href="/dashboard">← My properties</Link></header>
    <div className="listing-form-layout shell"><aside><span className="eyebrow">EDIT PROPERTY</span><h1>Keep your listing accurate.</h1><p>Fresh details and clear photos help renters understand the home before they contact you.</p><div className="listing-tip"><strong>Photo checklist</strong><p>Use bright, recent photos of the room, shared spaces, kitchen, bathroom, and exterior.</p></div></aside>
      <form className="listing-form-card" onSubmit={save}><h2>Property details</h2>
        <div className="form-grid two"><label><span>Listing title</span><input required maxLength={120} value={form.title} onChange={(e) => update("title", e.target.value)} /></label><label><span>Room type</span><select value={form.roomType} onChange={(e) => update("roomType", e.target.value)}><option value="private_room">Private room</option><option value="shared_room">Shared room</option><option value="apartment">Apartment</option><option value="house">House</option></select></label></div>
        <label className="full-field"><span>Description</span><textarea required rows={5} maxLength={1200} value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
        <div className="form-grid two"><label><span>City</span><select value={form.citySlug} onChange={(e) => { const next = ethiopianCities.find((item) => item.slug === e.target.value) ?? ethiopianCities[0]; setForm((current) => ({ ...current, citySlug: next.slug, neighborhoodSlug: `${next.slug}-${next.neighborhoods[0].toLowerCase().replaceAll(" ", "-")}` })); }}>{ethiopianCities.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><label><span>Neighborhood</span><select value={form.neighborhoodSlug} onChange={(e) => update("neighborhoodSlug", e.target.value)}>{neighborhoods.map((name) => <option key={name} value={`${city.slug}-${name.toLowerCase().replaceAll(" ", "-")}`}>{name}</option>)}</select></label></div>
        <div className="form-grid two"><label><span>Monthly rent (ETB)</span><input type="number" min="1" required value={form.monthlyRent} onChange={(e) => update("monthlyRent", Number(e.target.value))} /></label><label><span>Deposit (ETB)</span><input type="number" min="0" value={form.deposit} onChange={(e) => update("deposit", Number(e.target.value))} /></label></div>
        <div className="form-grid three"><label><span>Bedrooms</span><input type="number" min="1" value={form.bedrooms} onChange={(e) => update("bedrooms", Number(e.target.value))} /></label><label><span>Bathrooms</span><input type="number" min="1" value={form.bathrooms} onChange={(e) => update("bathrooms", Number(e.target.value))} /></label><label><span>Available from</span><input type="date" required value={form.availableFrom} onChange={(e) => update("availableFrom", e.target.value)} /></label></div>
        <div className="inline-checks"><label><input type="checkbox" checked={form.furnished} onChange={(e) => update("furnished", e.target.checked)} /> Furnished</label><label><input type="checkbox" checked={form.utilitiesIncluded} onChange={(e) => update("utilitiesIncluded", e.target.checked)} /> Utilities included</label></div>
        <label className="full-field"><span>House rules (one per line)</span><textarea rows={3} value={form.houseRules} onChange={(e) => update("houseRules", e.target.value)} /></label>
        <section className="photo-editor"><div><strong>Property photos</strong><span>{photos.length + newPhotos.length}/6 photos</span></div>{photos.length > 0 && <div className="existing-photos">{photos.map((photo) => <figure key={photo.id}><img src={`/api/media/${photo.storageKey}`} alt={photo.altText || form.title} /><button type="button" onClick={() => void removePhoto(photo.id)} aria-label="Remove photo">Remove</button></figure>)}</div>}<label className="photo-picker"><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setNewPhotos(Array.from(e.target.files ?? []).slice(0, Math.max(0, 6 - photos.length)))} /><strong>Add photos</strong><span>JPG, PNG, or WebP · up to 8 MB each</span></label>{newPhotos.length > 0 && <p>{newPhotos.length} new photo{newPhotos.length === 1 ? "" : "s"} ready to upload.</p>}</section>
        {message && <p className="form-error">{message}</p>}<div className="form-actions"><Link href="/dashboard">Cancel</Link><button className="button button-dark" disabled={saving}>{saving ? "Saving…" : "Save changes"} <span>→</span></button></div>
      </form>
    </div>
  </main>;
}
