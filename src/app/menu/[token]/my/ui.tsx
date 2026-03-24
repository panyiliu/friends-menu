"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  createdAt: string;
  note: string;
  status: "PENDING" | "PREPARING" | "DONE";
  items: { id: string; quantity: number; dish: { name: string } }[];
};

export default function GuestMyOrdersClient({ token }: { token: string }) {
  const statusText = (status: Order["status"]) => (status === "PENDING" ? "待备餐" : status === "PREPARING" ? "备餐中" : "已完成");

  const [orders, setOrders] = useState<Order[]>([]);
  const [guestId, setGuestId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setGuestId(localStorage.getItem(`guest:${token}`) || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    if (!guestId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/guest/orders/me?token=${token}&guestId=${guestId}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [token, guestId]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_30%,_rgba(255,235,205,0.5)_0%,_#fff8f0_70%,_#fff_100%)] px-4 py-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-amber-100 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h1 className="text-2xl font-black tracking-tight text-stone-800">我的订单</h1>
            <Link
              className="rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-300 hover:bg-white hover:shadow-sm"
              href={`/menu/${token}`}
            >
              返回点餐
            </Link>
          </div>
          <p className="text-xs text-stone-500">可查看你在当前邀请链接下提交的历史订单。</p>
        </section>

        {!guestId ? <p className="mt-4 rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600">暂无历史记录，请先提交至少一笔订单。</p> : null}
        {loading ? <p className="mt-4 rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-500">订单加载中...</p> : null}
        <div className="mt-4 space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-stone-100 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-stone-800">{new Date(o.createdAt).toLocaleString()}</p>
              <p
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  o.status === "DONE" ? "bg-emerald-100 text-emerald-700" : o.status === "PREPARING" ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-600"
                }`}
              >
                {statusText(o.status)}
              </p>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-stone-700">
              {o.items.map((i) => (
                <li key={i.id}>
                  {i.dish.name} x{i.quantity}
                </li>
              ))}
            </ul>
            {o.note ? <p className="mt-2 text-sm text-stone-500">备注：{o.note}</p> : null}
          </div>
        ))}
        {!loading && guestId && orders.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-600">当前还没有订单记录。</p>
        ) : null}
        </div>
      </div>
    </main>
  );
}
