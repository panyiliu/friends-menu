"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n";

type Dish = { id: string; name: string; englishName?: string; tags?: string; description: string; price: number; isAvailable: boolean; images: { url: string }[] };
type Category = { id: string; name: string; englishName?: string; dishes: Dish[] };
type Cart = Record<string, number>;
type WelcomeTemplate = {
  enabled: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
  fontSize: "sm" | "md" | "lg";
  fontWeight: "normal" | "medium" | "semibold" | "bold";
  textAlign: "left" | "center" | "right";
  buttonColor: string;
  backdropOpacity: number;
};
type UiConfig = {
  guestTitle: string;
  guestSubtitle: string;
  guestBannerUrl: string;
  welcomeAlwaysShow: boolean;
};

export default function GuestMenuClient({ token }: { token: string }) {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPrice, setShowPrice] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [inviteGuestName, setInviteGuestName] = useState("");
  const [note, setNote] = useState("");
  const [eta, setEta] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [welcomeTemplate, setWelcomeTemplate] = useState<WelcomeTemplate | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [uiConfig, setUiConfig] = useState<UiConfig>({
    guestTitle: t("guest.brand.titleDefault"),
    guestSubtitle: t("guest.brand.subtitleDefault"),
    guestBannerUrl: "",
    welcomeAlwaysShow: false,
  });
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 12000);

    fetch(`/api/guest/menu/${token}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) {
          setCategories(d.categories || []);
          setShowPrice(Boolean(d.showPrice));
          setInviteGuestName(String(d.inviteGuestName || ""));
          setWelcomeTemplate(d.welcomeTemplate || null);
          setUiConfig({
            guestTitle: d.uiConfig?.guestTitle || t("guest.brand.titleDefault"),
            guestSubtitle: d.uiConfig?.guestSubtitle || t("guest.brand.subtitleDefault"),
            guestBannerUrl: d.uiConfig?.guestBannerUrl || "",
            welcomeAlwaysShow: Boolean(d.uiConfig?.welcomeAlwaysShow),
          });
          try {
            const seen = localStorage.getItem(`welcome_seen:${token}`) === "1";
            setShowWelcome(Boolean(d.welcomeTemplate?.enabled) && (Boolean(d.uiConfig?.welcomeAlwaysShow) || !seen));
          } catch {
            setShowWelcome(Boolean(d.welcomeTemplate?.enabled));
          }
          setError("");
        } else {
          setError(d.message || t("guest.menu.linkInvalid"));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          setError(t("guest.menu.menuLoadTimeout"));
          return;
        }
        setError(t("guest.menu.menuLoadFailed"));
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!cancelled) setLoadingMenu(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [token, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHydrated(true);
      try {
        const raw = localStorage.getItem(`cart:${token}`);
        setCart(raw ? (JSON.parse(raw) as Cart) : {});
      } catch {
        setCart({});
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token]);

  // Prevent scroll-through to the background when the cart drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!showCart) return;
    const body = document.body;
    const prevBodyOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevBodyOverflow;
    };
  }, [showCart]);

  const dishes = useMemo(() => categories.flatMap((c) => c.dishes), [categories]);
  const currentCategoryId = activeCategoryId || categories[0]?.id || "";
  const totalCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const totalPrice = useMemo(() => {
    let sum = 0;
    for (const [dishId, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const dish = dishes.find((d) => d.id === dishId);
      if (!dish) continue;
      sum += Number(dish.price || 0) * qty;
    }
    return sum;
  }, [cart, dishes]);

  function showToast(text: string, duration = 1600) {
    setToast(text);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), duration);
  }

  const welcomeTitleClass =
    welcomeTemplate?.fontSize === "lg"
      ? "text-3xl"
      : welcomeTemplate?.fontSize === "sm"
        ? "text-xl"
        : "text-2xl";
  const welcomeFontWeightClass =
    welcomeTemplate?.fontWeight === "bold"
      ? "font-bold"
      : welcomeTemplate?.fontWeight === "medium"
        ? "font-medium"
        : welcomeTemplate?.fontWeight === "normal"
          ? "font-normal"
          : "font-semibold";
  const welcomeAlignClass =
    welcomeTemplate?.textAlign === "left"
      ? "text-left"
      : welcomeTemplate?.textAlign === "right"
        ? "text-right"
        : "text-center";
  const resolvedGuestName = (inviteGuestName || t("guest.menu.defaultGuestName")).trim() || t("guest.menu.defaultGuestName");
  const withFriendName = (text: string) => String(text || "").replace(/\{\{\s*friendName\s*\}\}/gi, resolvedGuestName);
  const displayCategoryName = (c: Category) => {
    if (lang !== "en") return c.name;
    const en = String(c.englishName || "").trim();
    return en || c.name;
  };

  const add = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    const dish = dishes.find((d) => d.id === id);
    if (dish) showToast(`✨ ${t("guest.menu.add")} ${dish.name}`, 900);
  };
  const incr = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const decr = (id: string) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) - 1);
      return { ...c, [id]: next };
    });
  const remove = (id: string) => setCart((c) => ({ ...c, [id]: 0 }));
  const clearAll = () => setCart({});

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`cart:${token}`, JSON.stringify(cart));
  }, [cart, token, hydrated]);

  function jumpToCategory(categoryId: string) {
    setActiveCategoryId(categoryId);
    const target = sectionRefs.current[categoryId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const ids = categories.map((c) => c.id);
    const sections = ids.map((id) => sectionRefs.current[id]).filter(Boolean) as HTMLDivElement[];
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top || 0) - (b.boundingClientRect.top || 0))[0];
        if (!visible) return;
        const id = String((visible.target as HTMLElement).dataset.categoryId || "");
        if (id) setActiveCategoryId(id);
      },
      { threshold: 0.3, rootMargin: "-70px 0px -55% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [categories]);

  async function submit() {
    if (totalCount === 0) {
      setMessage(t("guest.menu.needAtLeastOne"));
      showToast(t("guest.menu.cartEmptyToast"), 1200);
      return;
    }
    setLoading(true);
    setMessage("");
    const guestId = localStorage.getItem(`guest:${token}`) || "";
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([dishId, quantity]) => ({ dishId, quantity }));
    const res = await fetch("/api/guest/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, guestId, guestName: resolvedGuestName, note, eta, items }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(`guest:${token}`, data.guestId);
      setCart({});
      localStorage.removeItem(`cart:${token}`);
      setNote("");
      setEta("");
      setShowCart(false);
      setMessage(t("guest.menu.submitSuccess"));
      showToast(t("guest.menu.submitSuccessToast"), 2200);
    } else {
      setMessage(data.message || t("guest.menu.submitFail"));
      showToast(data.message || t("guest.menu.submitFail"), 1600);
    }
    setLoading(false);
  }

  const cartItems = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ dish: dishes.find((d) => d.id === id), qty }))
    .filter((x) => x.dish);

  function enterMenu() {
    try {
      localStorage.setItem(`welcome_seen:${token}`, "1");
    } catch {}
    setShowWelcome(false);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg p-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">{t("guest.menu.linkUnavailableTitle")}</h1>
          <LanguageSwitcher />
        </div>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
        <p className="mt-2 text-sm text-gray-600">{t("guest.menu.linkUnavailableTip1")}</p>
      </main>
    );
  }

  if (loadingMenu) {
    return (
      <main className="premiumMenuRoot antialiased">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-stone-500">{t("guest.menu.menuLoading")}</div>
      </main>
    );
  }

  return (
    <main className="premiumMenuRoot antialiased">
      <style jsx global>{`
        .premiumMenuRoot {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #fef9f0;
          background-image: radial-gradient(circle at 15% 30%, rgba(255, 235, 205, 0.5) 0%, #fff8f0 70%, #ffffff 100%);
          min-height: 100vh;
        }
        .premiumMenuRoot .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(2px);
          border: 1px solid rgba(255, 245, 225, 0.9);
        }
        .premiumMenuRoot .glass-nav {
          background: rgba(255, 253, 245, 0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .premiumMenuRoot .category-btn {
          transition: all 0.25s ease;
          letter-spacing: -0.01em;
          position: relative;
        }
        .premiumMenuRoot .category-btn::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 24px;
          height: 3px;
          background: linear-gradient(135deg, #f97316, #ea580c);
          border-radius: 4px;
          transition: transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        }
        .premiumMenuRoot .category-btn.active {
          color: #ea580c;
          font-weight: 600;
        }
        .premiumMenuRoot .category-btn.active::after {
          transform: translateX(-50%) scaleX(1);
        }
        .premiumMenuRoot .dish-card {
          background: #ffffff;
          border-radius: 28px;
          transition: all 0.4s cubic-bezier(0.15, 0.75, 0.4, 1);
          box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.05), 0 1px 1px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(253, 230, 200, 0.7);
        }
        .premiumMenuRoot .dish-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 36px -14px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.02);
          border-color: #ffe0b5;
        }
        .premiumMenuRoot .dish-img {
          background: linear-gradient(145deg, #fff3e6, #ffead4);
          transition: all 0.3s;
        }
        .premiumMenuRoot .cart-drawer-panel {
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premiumMenuRoot .drawer-overlay {
          transition: opacity 0.3s ease, visibility 0s linear 0.3s;
        }
        .premiumMenuRoot .drawer-overlay.active {
          visibility: visible;
          opacity: 1;
          transition: opacity 0.3s ease, visibility 0s;
        }
        .premiumMenuRoot .cart-badge-pulse {
          animation: gentlePulse 0.5s cubic-bezier(0.2, 0.9, 0.6, 1.1);
        }
        @keyframes gentlePulse {
          0% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.25);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .premiumMenuRoot .premium-input {
          background: #ffffff;
          border: 1px solid #f2e0cf;
          border-radius: 24px;
          transition: all 0.2s;
        }
        .premiumMenuRoot .premium-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          outline: none;
        }
        .premiumMenuRoot .scroll-mt-offset {
          scroll-margin-top: 88px;
        }
        .premiumMenuRoot .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .premiumMenuRoot .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 640px) {
          .premiumMenuRoot .category-btn::after {
            width: 20px;
            bottom: -4px;
          }
          .premiumMenuRoot .dish-card {
            border-radius: 24px;
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8 lg:px-8">
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-amber-100/80 shadow-sm">
          {uiConfig.guestBannerUrl ? (
            <div className="absolute inset-0">
              <Image src={uiConfig.guestBannerUrl} alt={t("guest.menu.bannerAlt")} fill sizes="100vw" loading="eager" className="object-cover" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100/70 via-amber-100/60 to-white" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/60 to-white/35" />
          <div className="relative flex min-h-24 flex-wrap items-start justify-between gap-3 p-4 sm:min-h-28 sm:p-5">
            <div className="min-w-0 flex-1 pr-2">
              <div className="mb-1 flex items-center gap-2">
                <div className="h-8 w-2 rounded-full bg-gradient-to-b from-orange-400 to-amber-500" />
                <h1 className="bg-gradient-to-r from-stone-800 via-amber-800 to-orange-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl md:text-4xl">
                  {uiConfig.guestTitle || t("guest.brand.titleDefault")}
                </h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">{uiConfig.guestSubtitle || t("guest.brand.subtitleDefault")}</p>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <Link
                href={`/menu/${token}/my`}
                className="group rounded-full border border-stone-200/80 bg-white/70 px-3 py-1.5 text-sm font-medium text-stone-600 backdrop-blur-sm transition-all duration-300 hover:border-amber-300 hover:bg-white hover:shadow-md sm:px-4 sm:py-2"
              >
                <span>{t("guest.menu.myOrders")}</span>
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className="sticky top-4 z-20 mb-8">
          <div className="glass-nav rounded-2xl border border-white/40 px-1 py-2 shadow-sm">
            <div className="no-scrollbar flex snap-x gap-1 overflow-x-auto scroll-smooth px-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`category-btn whitespace-nowrap px-5 py-2 text-sm font-medium transition-all ${currentCategoryId === c.id ? "active" : "text-stone-600"}`}
                  onClick={() => jumpToCategory(c.id)}
                >
                  {displayCategoryName(c)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-10 pb-12">
          {categories.map((cat) => (
            <div
              key={cat.id}
              data-category-id={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="scroll-mt-offset"
            >
              <div className="mb-4 flex items-center gap-2 px-1">
                <div className="h-6 w-1.5 rounded-full bg-orange-400" />
                <h2 className="text-xl font-semibold tracking-tight text-stone-800">{displayCategoryName(cat)}</h2>
                <span className="rounded-full bg-stone-100/70 px-2 py-0.5 text-xs font-medium text-stone-400">{cat.dishes.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-3">
                {cat.dishes.map((dish) => {
                  const qty = cart[dish.id] || 0;
                  const hasImage = Boolean(dish.images?.[0]?.url);
                  return (
                    <div key={dish.id} className="dish-card p-3">
                      <button
                        className="dish-img relative mb-3 aspect-square w-full overflow-hidden rounded-2xl"
                        onClick={() => (hasImage ? setPreview({ url: dish.images[0].url, name: dish.name }) : null)}
                        aria-label={t("guest.menu.previewImage")}
                      >
                        {hasImage ? <Image src={dish.images[0].url} alt={dish.name} fill sizes="50vw" className="object-cover" /> : null}
                      </button>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-stone-800">{dish.name}</h3>
                          {dish.englishName ? <p className="truncate text-xs font-medium text-stone-500">{dish.englishName}</p> : null}
                          <p className={`mt-0.5 text-sm font-semibold text-orange-500 ${showPrice ? "" : "invisible"}`}>¥{dish.price}</p>
                        </div>
                        <button
                          className="rounded-xl bg-stone-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-orange-600 disabled:opacity-40"
                          disabled={!dish.isAvailable}
                          onClick={() => add(dish.id)}
                        >
                          {dish.isAvailable ? (qty > 0 ? t("guest.menu.selected", { qty }) : t("guest.menu.add")) : t("guest.menu.soldOut")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}
      </div>

      <div className="fixed bottom-7 right-6 z-30">
        <button
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-xl text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          onClick={() => setShowCart(true)}
          aria-label={t("guest.menu.openCart")}
        >
          <span
            className={`absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white shadow-md ring-2 ring-white/60 ${
              hydrated && totalCount > 0 ? "cart-badge-pulse" : ""
            }`}
          >
            {hydrated ? totalCount : 0}
          </span>
          <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]" aria-hidden>
              <path d="M3 6h19l-1.8 12.2a2 2 0 0 1-2 1.8H7.8a2 2 0 0 1-2-1.7L4 7.2" />
              <path d="M8.5 9.5V7a3.5 3.5 0 1 1 7 0v2.5" />
            </svg>
          </span>
        </button>
      </div>

      <div
        className={`drawer-overlay fixed inset-0 z-40 invisible bg-black/30 backdrop-blur-sm opacity-0 ${showCart ? "active" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowCart(false);
        }}
      >
        <div className={`cart-drawer-panel fixed right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-3xl border-l border-amber-100/80 bg-white/98 shadow-2xl ${showCart ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-amber-100/60 bg-gradient-to-r from-orange-50/80 to-amber-50/80 p-6">
            <h3 className="flex items-center gap-2 text-xl font-bold text-stone-800">{t("guest.menu.cartTitle")}</h3>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-500 shadow-sm transition hover:bg-stone-100" onClick={() => setShowCart(false)}>
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center text-stone-400">
                <p className="text-sm">{t("guest.menu.cartEmptyHint")}</p>
              </div>
            ) : null}
            {cartItems.map((item) => (
              <div key={String(item.dish?.id)} className="rounded-3xl border border-amber-100/60 bg-white p-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-orange-50">
                    {item.dish?.images?.[0]?.url ? <Image src={item.dish.images[0].url} alt={item.dish.name} fill sizes="48px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-stone-800">{item.dish?.name}</p>
                    {item.dish?.englishName ? <p className="truncate text-xs text-stone-500">{item.dish.englishName}</p> : null}
                    <p className={`text-xs text-stone-500 ${showPrice ? "" : "invisible"}`}>¥{item.dish?.price}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-stone-100 bg-stone-50/90 p-1">
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-600 shadow-sm transition hover:bg-amber-50" onClick={() => decr(String(item.dish?.id))}>
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-stone-700">{item.qty}</span>
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-600 shadow-sm transition hover:bg-amber-50" onClick={() => incr(String(item.dish?.id))}>
                      +
                    </button>
                  </div>
                  <button className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 transition hover:text-rose-500" onClick={() => remove(String(item.dish?.id))}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-t-3xl border-t border-stone-100/80 bg-stone-50/40 p-6">
            {showPrice ? (
              <div className="mb-4 flex items-center justify-between">
                <span className="font-medium text-stone-600">{t("guest.menu.totalAmount")}</span>
                <span className="text-2xl font-bold tracking-tight text-orange-600">¥{Math.round(totalPrice)}</span>
              </div>
            ) : null}
            <div className="space-y-3">
              {inviteGuestName ? (
                <div className="premium-input w-full px-4 py-3 text-sm font-medium text-stone-700">{t("guest.menu.orderGuest", { name: resolvedGuestName })}</div>
              ) : null}
              <input type="text" placeholder={t("guest.menu.etaPlaceholder")} className="premium-input w-full px-4 py-3 text-sm" value={eta} onChange={(e) => setEta(e.target.value)} />
              <textarea rows={2} placeholder={t("guest.menu.notePlaceholder")} className="premium-input w-full resize-none px-4 py-3 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
              <button
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-stone-800 to-stone-900 py-3.5 font-semibold text-white shadow-md transition-all duration-300 hover:shadow-xl disabled:opacity-60"
                disabled={loading}
                onClick={submit}
              >
                {loading ? t("guest.menu.submitting") : t("guest.menu.submitElegant")}
              </button>
              {cartItems.length > 0 ? (
                <button className="w-full rounded-2xl border border-zinc-200 bg-white py-3 text-sm text-zinc-700 hover:bg-zinc-50" onClick={clearAll}>
                  {t("guest.menu.clearCart")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-800/90 px-5 py-2.5 text-sm font-medium text-white shadow-xl backdrop-blur-sm transition-all duration-300 ${toast ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {toast || " "}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="max-w-xl rounded-xl bg-white p-2">
            <Image src={preview.url} alt={preview.name} width={900} height={600} className="h-auto w-full rounded object-cover" />
          </div>
        </div>
      ) : null}

      {showWelcome && welcomeTemplate ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, Math.min(80, welcomeTemplate.backdropOpacity || 35)) / 100})` }}
        >
          <div className={`w-full max-w-md rounded-3xl border border-white/30 bg-white/70 p-6 shadow-2xl backdrop-blur-xl ${welcomeAlignClass}`}>
            <h2 className={`${welcomeTitleClass} ${welcomeFontWeightClass} tracking-tight text-stone-900`}>{withFriendName(welcomeTemplate.title || t("guest.welcome.titleDefault"))}</h2>
            <p className="mt-3 text-sm text-stone-600">{withFriendName(welcomeTemplate.subtitle || t("guest.welcome.subtitleDefault"))}</p>
            <button
              className="mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
              style={{ backgroundColor: welcomeTemplate.buttonColor || "#111827" }}
              onClick={enterMenu}
            >
              {withFriendName(welcomeTemplate.buttonText || t("guest.welcome.buttonDefault"))}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
