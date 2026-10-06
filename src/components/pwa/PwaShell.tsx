"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Download, Share, MoreVertical, Smartphone, PlusSquare } from "lucide-react";
import s from "./PwaShell.module.css";
import { warmAppAssets } from "@/lib/app-preload";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window { __portalInstallPrompt?: InstallPrompt }
}

function subscribe(callback: () => void) {
  window.addEventListener("beforeinstallprompt", callback);
  window.addEventListener("appinstalled", callback);
  window.addEventListener("portal-install-prompt-changed", callback);
  return () => {
    window.removeEventListener("beforeinstallprompt", callback);
    window.removeEventListener("appinstalled", callback);
    window.removeEventListener("portal-install-prompt-changed", callback);
  };
}
const getPrompt = () => window.__portalInstallPrompt;
const serverPrompt = () => undefined;
function subscribeMode(callback: () => void) {
  const queries = ["standalone", "fullscreen"].map(mode => window.matchMedia(`(display-mode: ${mode})`));
  queries.forEach(query => query.addEventListener("change", callback));
  window.addEventListener("pageshow", callback);
  return () => {
    queries.forEach(query => query.removeEventListener("change", callback));
    window.removeEventListener("pageshow", callback);
  };
}
const getMode = () => document.documentElement.dataset.pwaMode ?? "desktop";
const serverMode = () => "desktop";

export default function PwaShell({ children }: { children: React.ReactNode }) {
  const prompt = useSyncExternalStore(subscribe, getPrompt, serverPrompt);
  const mode = useSyncExternalStore(subscribeMode, getMode, serverMode);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const [launching, setLaunching] = useState(true);
  const [preparation, setPreparation] = useState<number | null>(null);
  const [assetsReady] = useState(() => {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
  });

  useEffect(() => {
    if (mode !== "standalone") return;
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    let pageTimer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const pageReady = document.readyState === "complete" ? Promise.resolve() :
      new Promise<void>(resolve => window.addEventListener("load", () => resolve(), { once: true }));
    const logo = document.getElementById("pwa-launch-logo") as HTMLImageElement | null;
    // A broken network/font must never leave the app behind the splash screen.
    void Promise.race([
      Promise.all([
        Promise.race([
          Promise.all([pageReady, document.fonts.ready, logo?.decode().catch(() => {})]),
          new Promise(resolve => { pageTimer = setTimeout(resolve, 1800); }),
        ]),
        assetsReady.promise,
      ]),
      new Promise(resolve => { timer = setTimeout(resolve, 15000); }),
    ]).then(() => {
      clearTimeout(timer);
      clearTimeout(pageTimer);
      if (!disposed) timer = setTimeout(() => setLaunching(false), Math.max(0, 650 - (performance.now() - started)));
    });
    return () => { disposed = true; clearTimeout(timer); clearTimeout(pageTimer); };
  }, [mode, assetsReady]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext || process.env.NODE_ENV !== "production") { assetsReady.resolve(); return; }
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let lastWarm = 0;
    const channels = new Set<() => void>();
    const workers = new Map<ServiceWorker, () => void>();
    const warm = () => {
      if (disposed || !registration || !navigator.onLine || document.hidden || Date.now() - lastWarm < 30000) return;
      lastWarm = Date.now();
      channels.forEach(close => close());
      channels.clear();
      channels.add(warmAppAssets(registration, percent => { if (!disposed) setPreparation(percent); }, assetsReady.resolve));
    };
    const update = () => {
      if (!document.hidden) { void registration?.update().catch(() => {}); warm(); }
    };
    const online = () => { lastWarm = 0; warm(); };
    const controller = () => { lastWarm = 0; warm(); };
    const watchUpdate = () => {
      const worker = registration?.installing;
      if (!worker || workers.has(worker)) return;
      const changed = () => {
        if (worker.state === "installed") { lastWarm = 0; warm(); }
      };
      workers.set(worker, changed);
      worker.addEventListener("statechange", changed);
    };
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async value => {
        if (disposed) return;
        registration = value;
        registration.addEventListener("updatefound", watchUpdate);
        watchUpdate();
        await navigator.serviceWorker.ready;
        warm();
      })
      .catch(() => { assetsReady.resolve(); if (!disposed) setMessage("آماده‌سازی اپ انجام نشد. اتصال اینترنت را بررسی کنید و صفحه را دوباره باز کنید."); });
    document.addEventListener("visibilitychange", update);
    window.addEventListener("online", online);
    navigator.serviceWorker.addEventListener("controllerchange", controller);
    return () => {
      disposed = true;
      channels.forEach(close => close());
      workers.forEach((changed, worker) => worker.removeEventListener("statechange", changed));
      registration?.removeEventListener("updatefound", watchUpdate);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("online", online);
      navigator.serviceWorker.removeEventListener("controllerchange", controller);
    };
  }, [assetsReady]);

  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted"
        ? "پس از پایان نصب، پورتال زیلبر را از آیکن صفحهٔ اصلی باز کنید."
        : "برای ورود با موبایل، نصب اپ لازم است. می‌توانید از منوی مرورگر هم آن را نصب کنید.");
    } catch {
      setMessage("از منوی مرورگر گزینهٔ نصب اپ یا افزودن به صفحهٔ اصلی را انتخاب کنید.");
    } finally {
      window.__portalInstallPrompt = undefined;
      window.dispatchEvent(new Event("portal-install-prompt-changed"));
      setInstalling(false);
    }
  }

  return <>
    {launching && <div className={s.splash} role="status" aria-live="polite" aria-label="در حال باز کردن پورتال زیلبر">
      <Image id="pwa-launch-logo" className={s.splashLogo} src="/pwa/icon-512.png" width={104} height={104} alt="زیلبر" priority unoptimized />
      <strong>پورتال زیلبر</strong>
      <span className={s.spinner} aria-hidden="true" />
      <span className={s.splashCaption}>در حال آماده‌سازی…{preparation !== null && ` ${preparation.toLocaleString("fa-IR")}٪`}</span>
    </div>}
    <main className={s.gate} aria-labelledby="pwa-install-title">
      <section className={s.card}>
        <Image className={s.logo} src="/pwa/icon-192.png" width={76} height={76} alt="زیلبر" priority unoptimized />
        <span className={s.eyebrow}>پورتال سازمانی زیلبر</span>
        <h1 id="pwa-install-title">پورتال همیشه همراه شما</h1>
        <p className={s.description}>برای استفاده با موبایل، اپ زیلبر را به صفحهٔ اصلی اضافه کنید و از آیکن آن وارد شوید.</p>
        {prompt && <button className={s.install} onClick={install} disabled={installing}>
          <Download size={20} aria-hidden="true" />{installing ? "در حال نصب…" : "نصب اپ زیلبر"}
        </button>}
        <ol className={`${s.steps} ${s.ios}`}>
          <li><Share size={20} aria-hidden="true" /><span>این صفحه را در <b>Safari</b> باز کنید و دکمهٔ اشتراک‌گذاری را بزنید.</span></li>
          <li><PlusSquare size={20} aria-hidden="true" /><span><b dir="ltr">Add to Home Screen</b> را انتخاب کنید؛ اگر «Open as Web App» دیده می‌شود، آن را روشن بگذارید و <b dir="ltr">Add</b> را بزنید.</span></li>
          <li><Smartphone size={20} aria-hidden="true" /><span>از آیکن <b>زیلبر</b> در صفحهٔ اصلی وارد شوید.</span></li>
        </ol>
        <ol className={`${s.steps} ${s.android}`}>
          <li><MoreVertical size={20} aria-hidden="true" /><span>این صفحه را در <b>Chrome</b> باز کنید و منوی مرورگر را بزنید.</span></li>
          <li><Download size={20} aria-hidden="true" /><span><b>نصب برنامه</b> یا <b dir="ltr">Add to Home screen</b> را انتخاب و نصب را تأیید کنید.</span></li>
          <li><Smartphone size={20} aria-hidden="true" /><span>از آیکن <b>زیلبر</b> در صفحهٔ اصلی وارد شوید.</span></li>
        </ol>
        <p className={s.message} role="status" aria-live="polite">{message}</p>
        <p className={s.note}>قبلاً نصب کرده‌اید؟ این صفحه را ببندید و اپ زیلبر را باز کنید.</p>
      </section>
    </main>
    <div className={s.application}>{children}</div>
  </>;
}
