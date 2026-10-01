"use client";
import Image from "next/image";
import { createPortal } from "react-dom";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Camera, Crop, Eye, Minus, Plus, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { saveAvatar, type FormResult } from "@/actions/account";
import { defaultProfilePhoto, profileCrop, PROFILE_PHOTO_SIZE, PROFILE_PHOTO_MAX_BYTES, PROFILE_PHOTO_SOURCE_MAX_BYTES } from "@/lib/profile-photo";
import type { Employee } from "@/types/employee";
import Loader from "@/components/ui/loader-4";
import s from "./Portal.module.css";
import p from "./ProfilePhotoEditor.module.css";
import { ProfileImage } from "./ProfileImage";
type Source = { url: string; width: number; height: number; image: HTMLImageElement; originalBytes: number };
type Draft = { file: File; url: string; originalBytes: number };
const initial: FormResult = { ok: false, message: "" };
function bytesLabel(bytes: number) { return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("fa-IR")} کیلوبایت`; }
export function ProfilePhotoEditor({ employee, avatar, onDirty }: { employee: Employee; avatar: string | null; onDirty: (key: string, value: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<Source | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const request = useRef(0);
  const processingRef = useRef(false);
  const drag = useRef<{ id: number; x: number; y: number; panX: number; panY: number; frame: number; side: number } | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [state, submit, pending] = useActionState(async (previous: FormResult, form: FormData) => {
    try {
      const result = await saveAvatar(previous, form);
      if (result.ok) { clearDraft(); onDirty("avatar", false); }
      return result;
    } catch { return { ok: false, message: "ذخیرهٔ تصویر انجام نشد. دوباره تلاش کنید." }; }
  }, initial);
  const modalOpen = !!source || viewing;
  const busy = pending || loading || processing;
  const preview = draft?.url || avatar || defaultProfilePhoto(employee.gender);
  function clearDraft() {
    if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
    draftRef.current = null; setDraft(null);
  }
  function closeCrop() {
    if (processingRef.current) return;
    request.current++;
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    sourceRef.current = null; setSource(null);
    drag.current = null;
    onDirty("photo-crop", false);
  }
  useEffect(() => () => {
    request.current++;
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    if (draftRef.current) URL.revokeObjectURL(draftRef.current.url);
  }, []);
  useEffect(() => {
    if (!modalOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processingRef.current) { event.preventDefault(); closeCrop(); setViewing(false); }
      if (event.key !== "Tab") return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') || []).filter(item => item.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); opener.current?.focus({ preventScroll: true }); };
    // The open dialog owns its keyboard handlers; source coordinates do not affect them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);
  async function loadPhoto(file?: File, existing?: string) {
    if (!file && !existing) return;
    setError("");
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > PROFILE_PHOTO_SOURCE_MAX_BYTES)) { setError("یک عکس JPG، PNG یا WebP با حجم حداکثر ۱۵ مگابایت انتخاب کنید."); return; }
    opener.current = document.activeElement as HTMLElement;
    setLoading(true);
    const sequence = ++request.current;
    let url: string | null = null;
    try {
      let blob: Blob;
      if (file) blob = file;
      else {
        const response = await fetch(existing!);
        if (!response.ok) throw new Error();
        blob = await response.blob();
        if (blob.size > PROFILE_PHOTO_SOURCE_MAX_BYTES) throw new Error();
      }
      url = URL.createObjectURL(blob);
      const image = new window.Image(); image.src = url;
      await image.decode();
      if (sequence !== request.current) { URL.revokeObjectURL(url); return; }
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error();
      const next = { url, image, width: image.naturalWidth, height: image.naturalHeight, originalBytes: file ? file.size : draft?.originalBytes || blob.size };
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
      sourceRef.current = next; setSource(next); setZoom(1); setPan({ x: 0, y: 0 });
      onDirty("photo-crop", true);
    } catch { if (url) URL.revokeObjectURL(url); setError("این تصویر باز نشد. یک عکس دیگر انتخاب کنید."); }
    finally { if (sequence === request.current) setLoading(false); }
  }
  async function applyCrop() {
    if (!source || processing) return;
    processingRef.current = true; setProcessing(true); setError("");
    try {
      const crop = profileCrop(source.width, source.height, zoom, pan.x, pan.y);
      const canvas = document.createElement("canvas"); canvas.width = PROFILE_PHOTO_SIZE; canvas.height = PROFILE_PHOTO_SIZE;
      const context = canvas.getContext("2d"); if (!context) throw new Error();
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "high";
      context.drawImage(source.image, crop.x, crop.y, crop.side, crop.side, 0, 0, PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE);
      let blob: Blob | null = null;
      for (const quality of [0.86, 0.74, 0.60]) {
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
        if (blob && blob.size <= PROFILE_PHOTO_MAX_BYTES) break;
      }
      if (!blob || blob.size > PROFILE_PHOTO_MAX_BYTES) throw new Error();
      const file = new File([blob], blob.type === "image/webp" ? "profile.webp" : "profile.png", { type: blob.type });
      clearDraft();
      const next = { file, url: URL.createObjectURL(blob), originalBytes: source.originalBytes };
      draftRef.current = next; setDraft(next);
      URL.revokeObjectURL(source.url); sourceRef.current = null; setSource(null);
      onDirty("photo-crop", false); onDirty("avatar", true);
    } catch { setError("آماده‌سازی عکس انجام نشد. دوباره تلاش کنید."); }
    finally { processingRef.current = false; setProcessing(false); }
  }
  function save(remove = false) {
    if (busy) return;
    setError("");
    const form = new FormData();
    if (remove) {
      if (!confirm("عکس شخصی حذف و تصویر پیش‌فرض نمایش داده شود؟")) return;
      form.set("remove", "on");
    } else if (draft) form.set("photo", draft.file);
    else return;
    startTransition(() => submit(form));
  }
  const crop = source ? profileCrop(source.width, source.height, zoom, pan.x, pan.y) : null;
  return <section className={`${s.glass} ${s.panel}`} aria-labelledby="profile-photo-title">
    <div className={s.panelHeading}><div><h2 id="profile-photo-title">عکس پروفایل</h2><p className={s.muted}>عکس را انتخاب کنید، کادرش را تنظیم کنید و نتیجه را ذخیره کنید.</p></div><Camera size={20} /></div>
    <div className={p.editor}>
      <button type="button" className={p.portrait} disabled={busy} onClick={() => { opener.current = document.activeElement as HTMLElement; setViewing(true); }} aria-label="مشاهدهٔ بزرگ عکس پروفایل"><ProfileImage src={preview} gender={employee.gender} alt={`عکس پروفایل ${employee.full_name}`} width={144} height={144} /><span><Eye size={14} />مشاهده</span></button>
      <div className={p.tools}><strong>{employee.full_name}</strong><p>{draft ? "پیش‌نمایش عکس جدید · هنوز ذخیره نشده" : avatar ? "عکس فعلی حساب شما" : "تصویر پیش‌فرض · عکس شخصی هنوز ثبت نشده"}</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className={p.fileInput} aria-label="انتخاب عکس پروفایل" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void loadPhoto(file); }} />
        <div className={p.actions}>
          <button type="button" className={s.button} disabled={busy} onClick={() => input.current?.click()}>{loading ? <Loader size={16} decorative /> : <Upload size={16} />}{avatar || draft ? "انتخاب عکس جدید" : "افزودن عکس"}</button>
          {(avatar || draft) && <button type="button" className={s.secondary} disabled={busy} onClick={() => void loadPhoto(undefined, draft?.url || avatar!)}><Crop size={16} />تنظیم کادر</button>}
          {avatar && <button type="button" className={p.remove} disabled={busy} onClick={() => save(true)}><Trash2 size={15} />حذف عکس</button>}
        </div>
        <small>JPG، PNG یا WebP · عکس اصلی تا ۱۵ مگابایت · خروجی بهینه و مربعی</small>
        {draft && <div className={p.draft}><span>{bytesLabel(draft.originalBytes)} ← {bytesLabel(draft.file.size)}</span><div className={p.actions}><button type="button" className={s.button} disabled={busy} onClick={() => save()}>{pending ? <Loader size={16} decorative /> : <Save size={16} />}{pending ? "در حال ذخیره…" : "ذخیرهٔ عکس"}</button><button type="button" className={s.secondary} disabled={busy} onClick={() => { clearDraft(); onDirty("avatar", false); }}>انصراف</button></div></div>}
      </div>
    </div>
    {(error || (!draft && state.message)) && <p role={error || !state.ok ? "alert" : "status"} className={`${s.message} ${error || !state.ok ? s.error : s.success}`}>{error || state.message}</p>}
    {modalOpen && createPortal(<div className={p.backdrop} onClick={event => { if (event.target === event.currentTarget && !processing) { closeCrop(); setViewing(false); } }}><div ref={dialogRef} className={p.dialog} role="dialog" aria-modal="true" aria-labelledby="photo-dialog-title" aria-busy={processing}>
      <header><div><h2 id="photo-dialog-title">{source ? "تنظیم کادر عکس" : "عکس پروفایل"}</h2><p>{source ? "عکس را با لمس یا ماوس جابه‌جا کنید." : employee.full_name}</p></div><button ref={closeRef} type="button" disabled={processing} onClick={() => { closeCrop(); setViewing(false); }} aria-label="بستن نمایش عکس"><X size={20} /></button></header>
      {source && crop ? <>
        <div className={p.cropFrame} tabIndex={0} role="group" aria-label="کادر عکس؛ با کلیدهای جهت‌دار جابه‌جا کنید" onKeyDown={event => {
          const delta = {ArrowLeft:{x:.04,y:0},ArrowRight:{x:-.04,y:0},ArrowUp:{x:0,y:.04},ArrowDown:{x:0,y:-.04}}[event.key as "ArrowLeft"];
          if (delta && !processing) { event.preventDefault(); setPan(value => ({x:Math.max(-1,Math.min(1,value.x+delta.x)),y:Math.max(-1,Math.min(1,value.y+delta.y))})); }
        }} onPointerDown={event => { if (processing || drag.current) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = {id:event.pointerId,x:event.clientX,y:event.clientY,panX:pan.x,panY:pan.y,frame:event.currentTarget.clientWidth,side:crop.side}; }} onPointerMove={event => {
          const start=drag.current; if (!start || start.id !== event.pointerId) return;
          const dx=(event.clientX-start.x)*start.side/start.frame; const dy=(event.clientY-start.y)*start.side/start.frame;
          setPan({x:source.width>start.side?Math.max(-1,Math.min(1,start.panX-2*dx/(source.width-start.side))):0,y:source.height>start.side?Math.max(-1,Math.min(1,start.panY-2*dy/(source.height-start.side))):0});
        }} onPointerUp={() => { drag.current=null; }} onPointerCancel={() => { drag.current=null; }}>
          <Image src={source.url} alt="پیش‌نمایش کادر انتخاب‌شده" width={source.width} height={source.height} draggable={false} unoptimized style={{position:"absolute",maxWidth:"none",width:`${source.width/crop.side*100}%`,height:`${source.height/crop.side*100}%`,left:`${-crop.x/crop.side*100}%`,top:`${-crop.y/crop.side*100}%`}} />
        </div>
        <label className={p.zoom} htmlFor="photo-zoom"><Minus size={16} /><span className={p.srOnly}>بزرگ‌نمایی عکس</span><input id="photo-zoom" type="range" min={1} max={4} step={0.01} value={zoom} disabled={processing} onChange={event => setZoom(Number(event.target.value))} dir="ltr" /><Plus size={16} /></label>
        <p className={p.help}>دایرهٔ روشن، پیش‌نمایش عکس در پروفایل است.</p>
        <footer><button type="button" className={p.reset} disabled={processing} onClick={() => { setZoom(1); setPan({x:0,y:0}); }}><RotateCcw size={15} />بازنشانی کادر</button><button type="button" className={p.apply} disabled={processing} onClick={() => void applyCrop()}>{processing ? <Loader size={16} decorative /> : <Crop size={16} />}{processing ? "در حال آماده‌سازی…" : "تأیید برش"}</button></footer>
      </> : <div className={p.largePreview}><ProfileImage src={preview} gender={employee.gender} alt={`عکس ${employee.full_name}`} width={360} height={360} /></div>}
      {error && <p role="alert" className={p.modalError}>{error}</p>}
    </div></div>, document.body)}
  </section>;
}
