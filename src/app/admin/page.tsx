"use client";

import { DebugLogPanel } from "@/components/DebugLogPanel";
import { isDebugUiEnabled, setDebugUiEnabled } from "@/lib/client-debug-log";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; name: string; sortOrder: number; isEnabled: boolean };
type DishImage = { id: string; url: string };
type Dish = {
  id: string;
  name: string;
  englishName: string;
  tags: string;
  price: number;
  description: string;
  method: string;
  ingredients: string;
  seasonings: string;
  isPublished: boolean;
  isAvailable: boolean;
  categoryId: string;
  images: DishImage[];
};
type WelcomeTemplate = {
  welcomeEnabled: boolean;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeButtonText: string;
  welcomeFontSize: "sm" | "md" | "lg";
  welcomeFontWeight: "normal" | "medium" | "semibold" | "bold";
  welcomeTextAlign: "left" | "center" | "right";
  welcomeButtonColor: string;
  welcomeBackdropOpacity: number;
};
type Invite = {
  id: string;
  token: string;
  label?: string;
  inviteGuestName?: string;
  isActive?: boolean;
  isExpired?: boolean;
  expiresAt?: string | null;
  showPrice?: boolean;
} & Partial<WelcomeTemplate>;
type Settings = {
  adminTitle?: string;
  guestTitle?: string;
  guestSubtitle?: string;
  guestBannerUrl?: string;
  welcomeAlwaysShow?: boolean;
  refreshIntervalSec: number;
  emailEnabled: boolean;
  emailSender?: string | null;
  emailPassword?: string | null;
  emailReceiver?: string | null;
  smtpServer?: string | null;
  smtpPort?: number | null;
};
type Order = {
  id: string;
  createdAt: string;
  status: "PENDING" | "PREPARING" | "DONE";
  note: string;
  guest: { name: string };
  items: { id: string; quantity: number; dish: { name: string; method: string; ingredients: string; seasonings: string } }[];
};
type AdminUser = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

const tabs = ["menu", "orders", "settings"] as const;
const tabLabel: Record<(typeof tabs)[number], string> = {
  menu: "菜单",
  orders: "订单",
  settings: "设置",
};

const defaultWelcomeTemplate: WelcomeTemplate = {
  welcomeEnabled: true,
  welcomeTitle: "欢迎光临",
  welcomeSubtitle: "请开始点餐",
  welcomeButtonText: "开始点餐",
  welcomeFontSize: "md",
  welcomeFontWeight: "semibold",
  welcomeTextAlign: "center",
  welcomeButtonColor: "#111827",
  welcomeBackdropOpacity: 35,
};

export default function AdminPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("menu");
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Invite[]>([]);
  const [message, setMessage] = useState("");
  const [orderFilterName, setOrderFilterName] = useState("");
  const [orderFilterFrom, setOrderFilterFrom] = useState("");
  const [orderFilterTo, setOrderFilterTo] = useState("");
  const [orderFilterStatus, setOrderFilterStatus] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [newInviteLabel, setNewInviteLabel] = useState("");
  const [newInviteGuestName, setNewInviteGuestName] = useState("");
  const [newInviteShowPrice, setNewInviteShowPrice] = useState(false);
  const [newInviteTemplate, setNewInviteTemplate] = useState<WelcomeTemplate>(defaultWelcomeTemplate);
  const [settings, setSettings] = useState<Settings>({
    adminTitle: "点餐系统",
    guestTitle: "朋友·聚",
    guestSubtitle: "欢聚时刻 · 臻选风味",
    guestBannerUrl: "",
    welcomeAlwaysShow: false,
    refreshIntervalSec: 8,
    emailEnabled: false,
    emailSender: "",
    emailPassword: "",
    emailReceiver: "",
    smtpServer: "smtp.qq.com",
    smtpPort: 587,
  });
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const prevOrderIdsRef = useRef<string[]>([]);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [menuCategoryId, setMenuCategoryId] = useState("");
  const [dishKeyword, setDishKeyword] = useState("");
  const [dishTagFilter, setDishTagFilter] = useState("");
  const [expiryPresetDays, setExpiryPresetDays] = useState("0");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isCreatingDish, setIsCreatingDish] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFile, setDrawerFile] = useState<File | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState("");
  const [expandedInviteId, setExpandedInviteId] = useState("");
  const [editingInviteTemplateId, setEditingInviteTemplateId] = useState("");
  const [inviteTemplateDrafts, setInviteTemplateDrafts] = useState<Record<string, WelcomeTemplate>>({});
  const [isEmailConfigOpen, setIsEmailConfigOpen] = useState(false);
  const [recentSavedDishId, setRecentSavedDishId] = useState("");
  const [isOrderMultiSelect, setIsOrderMultiSelect] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const drawerFileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreZipInputRef = useRef<HTMLInputElement | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSavingDish, setIsSavingDish] = useState(false);
  const [isDeletingDish, setIsDeletingDish] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [showPrimaryInviteCard, setShowPrimaryInviteCard] = useState(false);
  const [showLowFrequencySettings, setShowLowFrequencySettings] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<"links" | "categories" | "system" | "password">("links");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [resetAdminUsername, setResetAdminUsername] = useState("");
  const [resetAdminNewPassword, setResetAdminNewPassword] = useState("");
  const [authedChecked, setAuthedChecked] = useState(false);
  const [debugUi, setDebugUi] = useState(false);
  useEffect(() => {
    // 与 localStorage 对齐；仅在挂载时同步一次
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 需从 localStorage 恢复开关
    setDebugUi(isDebugUiEnabled());
  }, []);

  const statusText = (status: Order["status"]) => (status === "PENDING" ? "待备餐" : status === "PREPARING" ? "备餐中" : "已完成");
  const inviteLink = useMemo(() => (invite?.token ? `${globalThis.location?.origin || ""}/menu/${invite.token}` : ""), [invite]);
  const normalizeSingleTag = (input: unknown) => String(input || "").split(",")[0]?.trim() || "";
  const availableTagSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of dishes) {
      const tag = normalizeSingleTag(d.tags);
      if (d.isAvailable && tag) set.add(tag);
    }
    return set;
  }, [dishes]);

  const safeJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false };
    }
  };

  async function ensureAuthedOrRedirect() {
    const res = await fetch("/api/admin/session");
    if (res.status === 401) {
      location.href = "/admin/login";
      return false;
    }
    return true;
  }

  const refresh = useCallback(async (withOrderFilter = false) => {
    const orderUrl = withOrderFilter
      ? `/api/admin/orders?name=${encodeURIComponent(orderFilterName)}&from=${encodeURIComponent(orderFilterFrom)}&to=${encodeURIComponent(orderFilterTo)}&status=${encodeURIComponent(orderFilterStatus)}`
      : "/api/admin/orders";
    const [c, d, r, i, s, u] = await Promise.all([
      fetch("/api/admin/categories").then(safeJson),
      fetch("/api/admin/dishes").then(safeJson),
      fetch(orderUrl).then(safeJson),
      fetch("/api/admin/invite").then(safeJson),
      fetch("/api/admin/settings").then(safeJson),
      fetch("/api/admin/users").then(safeJson),
    ]);
    setCategories(c.data || []);
    setDishes(d.data || []);
    const nextOrders = r.data || [];
    setSelectedOrderIds((prev) => prev.filter((id) => nextOrders.some((o: Order) => o.id === id)));
    setNewOrderIds((prev) => {
      const prevSet = new Set(prevOrderIdsRef.current);
      const added = nextOrders.filter((x: Order) => !prevSet.has(x.id) && x.status === "PENDING").map((x: Order) => x.id);
      return [...new Set([...prev, ...added])];
    });
    prevOrderIdsRef.current = nextOrders.map((x: Order) => x.id);
    setOrders(nextOrders);
    setInvite(i.active || null);
    setInviteLinks(i.links || []);
    setInviteExpiresAt(i.active?.expiresAt ? String(i.active.expiresAt).slice(0, 16) : "");
    if (s.ok && !isEditingSettings) {
      setSettings({
        adminTitle: s.setting.adminTitle || "点餐系统",
        guestTitle: s.setting.guestTitle || "朋友·聚",
        guestSubtitle: s.setting.guestSubtitle || "欢聚时刻 · 臻选风味",
        guestBannerUrl: s.setting.guestBannerUrl || "",
        welcomeAlwaysShow: Boolean(s.setting.welcomeAlwaysShow),
        refreshIntervalSec: s.setting.refreshIntervalSec || 8,
        emailEnabled: Boolean(s.setting.emailEnabled),
        emailSender: s.setting.emailSender || "",
        emailPassword: s.setting.emailPassword || "",
        emailReceiver: s.setting.emailReceiver || "",
        smtpServer: s.setting.smtpServer || "smtp.qq.com",
        smtpPort: s.setting.smtpPort || 587,
      });
    }
    if (u.ok) setAdminUsers(u.users || []);
  }, [isEditingSettings, orderFilterFrom, orderFilterName, orderFilterStatus, orderFilterTo]);

  useEffect(() => {
    const init = setTimeout(async () => {
      const ok = await ensureAuthedOrRedirect();
      if (!ok) return;
      setAuthedChecked(true);
      await refresh(false);
    }, 0);
    const timer = setInterval(async () => {
      const ok = await ensureAuthedOrRedirect();
      if (!ok) return;
      await refresh(false);
    }, Math.max(5, settings.refreshIntervalSec || 8) * 1000);
    return () => {
      clearTimeout(init);
      clearInterval(timer);
    };
  }, [refresh, tab, settings.refreshIntervalSec]);

  useEffect(() => {
    if (!recentSavedDishId) return;
    const timer = setTimeout(() => setRecentSavedDishId(""), 2600);
    return () => clearTimeout(timer);
  }, [recentSavedDishId]);

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const up = await safeJson(res);
    if (!up.ok) {
      setMessage(up.message || "图片上传失败");
      return "";
    }
    return String(up.url || "");
  }

  async function saveDish(dish: Dish, file?: File | null) {
    if (isSavingDish) return;
    setIsSavingDish(true);
    const body: Record<string, unknown> = { ...dish };
    body.tags = String(body.tags || "").split(",")[0]?.trim() || "";
    if (file && file.size > 0) {
      const imageUrl = await uploadImage(file);
      if (!imageUrl) {
        setIsSavingDish(false);
        return;
      }
      body.imageAction = "replace";
      body.imageUrl = imageUrl;
    }
    const res = await fetch("/api/admin/dishes", {
      method: isCreatingDish ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    if (!data.ok) {
      setMessage(data.message || "保存失败");
      setIsSavingDish(false);
      return;
    }
    await refresh();
    const savedId = String(data?.data?.id || dish.id || "");
    setRecentSavedDishId(savedId);
    setSelectedDish(null);
    setDrawerOpen(false);
    setDrawerFile(null);
    setTab("menu");
    setIsCreatingDish(false);
    setMessage("菜品已保存");
    setIsSavingDish(false);
  }

  async function deleteDish(id: string) {
    if (isDeletingDish) return;
    setIsDeletingDish(true);
    const res = await fetch(`/api/admin/dishes?id=${id}`, { method: "DELETE" });
    const d = await safeJson(res);
    if (!d.ok) {
      setMessage(d.message || "删除失败");
      setIsDeletingDish(false);
      return;
    }
    if (selectedDish?.id === id) {
      setSelectedDish(null);
      setDrawerOpen(false);
    }
    await refresh();
    setMessage("菜品已删除");
    setIsDeletingDish(false);
  }

  async function deleteDishImage(imageId: string) {
    await fetch(`/api/admin/dishes?imageId=${imageId}`, { method: "DELETE" });
    await refresh();
    if (selectedDish) {
      const refreshed = await fetch("/api/admin/dishes").then(safeJson);
      const latest = (refreshed.data || []).find((x: Dish) => x.id === selectedDish.id) || null;
      setSelectedDish(latest);
    }
  }

  function openDishEditor(dish: Dish) {
    setSelectedDish({ ...dish });
    setDrawerFile(null);
    setIsCreatingDish(false);
    setDrawerOpen(true);
  }

  function startCreateDish(categoryId: string) {
    setIsCreatingDish(true);
    setDrawerFile(null);
    setSelectedDish({
      id: "",
      name: "",
      englishName: "",
      tags: "",
      price: 0,
      description: "",
      method: "",
      ingredients: "",
      seasonings: "",
      isPublished: true,
      isAvailable: true,
      categoryId,
      images: [],
    });
    setDrawerOpen(true);
  }

  async function reorderCategories(dragId: string, dropId: string) {
    if (!dragId || !dropId || dragId === dropId) return;
    const list = [...categories];
    const from = list.findIndex((x) => x.id === dragId);
    const to = list.findIndex((x) => x.id === dropId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setCategories(list);
    await fetch("/api/admin/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "reorder", ids: list.map((x) => x.id) }),
    });
    await refresh(false);
  }

  async function updateOrderStatus(id: string, status: Order["status"]) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setNewOrderIds((prev) => prev.filter((x) => x !== id));
    await refresh(true);
  }

  async function deleteOrdersBatch() {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`确认删除已选中的 ${selectedOrderIds.length} 条订单吗？该操作不可恢复。`)) return;
    const res = await fetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedOrderIds }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage(`已删除 ${d.deletedCount || selectedOrderIds.length} 条订单`);
      setSelectedOrderIds([]);
      await refresh(true);
    } else {
      setMessage(d.message || "批量删除失败");
    }
  }

  async function createCategoryInSettings() {
    if (!newCategoryName.trim()) return;
    const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder || 0), 0);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim(), sortOrder: maxSort + 1 }),
    });
    const d = await res.json();
    if (d.ok) {
      setNewCategoryName("");
      setMessage("分类已新增");
      await refresh(false);
    } else {
      setMessage(d.message || "新增分类失败");
    }
  }

  async function deleteCategoryInSettings(id: string) {
    if (!confirm("确认删除该分类吗？如有菜品请先移动或删除菜品。")) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) {
      setMessage("分类已删除");
      await refresh(false);
    } else {
      setMessage(d.message || "删除分类失败");
    }
  }
  async function saveSettings() {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const txt = await res.text();
    let d: { ok?: boolean; message?: string } = {};
    try {
      d = JSON.parse(txt);
    } catch {
      d = { ok: false };
    }
    setMessage(d.ok ? "系统设置已保存" : d.message || "系统设置保存失败");
    setIsEditingSettings(false);
    await refresh(tab === "orders");
  }

  async function sendTestMail() {
    const res = await fetch("/api/admin/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const txt = await res.text();
    let d: { ok?: boolean; message?: string } = {};
    try {
      d = JSON.parse(txt);
    } catch {
      d = { ok: false, message: "测试邮件接口返回异常" };
    }
    setMessage(d.message || (d.ok ? "测试邮件发送成功" : "测试邮件发送失败"));
  }

  async function exportMenuBackupZip() {
    const res = await fetch("/api/admin/backup-menu");
    if (!res.ok) {
      const d = await safeJson(res);
      setMessage(d.message || "导出备份失败");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `menu-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage("菜单备份 ZIP 已导出");
  }

  async function importMenuBackupZip(file: File) {
    if (!file) return;
    if (!confirm("确认恢复这个 ZIP 备份吗？将按“分类+菜名”覆盖同名菜品并替换其图片。")) return;
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/backup-menu", { method: "POST", body: fd });
    const d = await safeJson(res);
    if (d.ok) {
      const warnText = Array.isArray(d.warnings) && d.warnings.length > 0 ? `；警告 ${d.warnings.length} 条（示例：${String(d.warnings[0])}）` : "";
      setMessage(`恢复完成：已处理 ${d.imported || 0} 道菜，导入 ${d.imageCount || 0} 张图片${warnText}`);
      await refresh(false);
    } else {
      setMessage(d.message || "恢复失败");
    }
  }

  async function previewMenuBackupZip(file: File) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", "dry-run");
    const res = await fetch("/api/admin/backup-menu", { method: "POST", body: fd });
    const d = await safeJson(res);
    if (d.ok) {
      const warnText = Array.isArray(d.warnings) && d.warnings.length > 0 ? `，示例：${String(d.warnings[0])}` : "";
      setMessage(`预检完成：将处理 ${d.imported || 0} 道菜，图片 ${d.imageCount || 0} 张，警告 ${Array.isArray(d.warnings) ? d.warnings.length : 0} 条${warnText}`);
    } else {
      setMessage(d.message || "预检失败");
    }
  }

  async function cleanupUnusedTags() {
    if (!confirm("一键清理无效标签：将从“不可点菜品”里移除那些当前没有任何可点菜品使用的标签。确认执行吗？")) return;
    const res = await fetch("/api/admin/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "cleanup-unused-tags" }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage(`无效标签清理完成：已更新 ${d.clearedCount || 0} 道菜。`);
      await refresh(false);
    } else {
      setMessage(d.message || "标签清理失败");
    }
  }

  async function purgeAllDishes() {
    const first = prompt("危险操作：将硬删除所有菜品、菜品图片、订单菜品明细（OrderItem）。请输入确认词：DELETE ALL DISHES");
    if (!first) return;
    if (first.trim() !== "DELETE ALL DISHES") {
      setMessage("确认词错误，已取消。");
      return;
    }
    if (!confirm("请再次确认：该操作不可撤销，确定继续吗？")) return;
    const res = await fetch("/api/admin/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "purge-all", confirmText: first.trim() }),
    });
    const d = await safeJson(res);
    if (d.ok) {
      setMessage(`已硬删除：菜品 ${d.dishDeleted || 0}，菜品图片 ${d.imageDeleted || 0}，订单明细 ${d.orderItemDeleted || 0}`);
      await refresh(false);
    } else {
      setMessage(d.message || "硬删除失败");
    }
  }

  async function resetInvite() {
    const res = await fetch("/api/admin/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "reset" }) });
    const d = await res.json();
    if (d.ok) {
      setInvite(d.active);
      setInviteExpiresAt(d.active?.expiresAt ? String(d.active.expiresAt).slice(0, 16) : "");
      setMessage("点餐链接已重置");
    }
  }

  async function createInvite() {
    if (isCreatingInvite) return;
    setIsCreatingInvite(true);
    const expiresAt = inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : null;
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "create", label: newInviteLabel, inviteGuestName: newInviteGuestName, expiresAt, isActive: true, showPrice: newInviteShowPrice, ...newInviteTemplate }),
    });
    const d = await safeJson(res);
    if (d.ok) {
      setMessage("新链接已创建");
      setNewInviteLabel("");
      setNewInviteGuestName("");
      setNewInviteShowPrice(false);
      setNewInviteTemplate({ ...defaultWelcomeTemplate });
      await refresh(false);
    } else {
      setMessage(d.message || "创建失败");
    }
    setIsCreatingInvite(false);
  }

  async function setActiveInvite(id: string) {
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "setActive", id }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage("已切换主链接");
      await refresh(false);
    } else {
      setMessage(d.message || "切换失败");
    }
  }

  async function toggleInvite(id: string, nextIsActive: boolean, isExpired?: boolean) {
    if (nextIsActive && isExpired) {
      setMessage("该链接已过期，无法启用。请新建链接或为主链接保存新的有效期。");
      return;
    }

    const action = nextIsActive ? "启用" : "停用";
    const ok = confirm(`${action}该点餐链接后，相关点餐人将能/不能访问点餐页。确认${action}吗？`);
    if (!ok) return;

    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "update", id, isActive: nextIsActive }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage(nextIsActive ? "链接已启用" : "链接已停用");
      await refresh(false);
    } else {
      setMessage(d.message || "更新失败");
    }
  }

  async function removeInvite(id: string) {
    if (!confirm("确认删除这条链接吗？")) return;
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "delete", id }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage("链接已删除");
      await refresh(false);
    } else {
      setMessage(d.message || "删除失败");
    }
  }

  async function saveInviteExpiry() {
    const expiresAt = inviteExpiresAt ? new Date(inviteExpiresAt).toISOString() : null;
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "update", isActive: true, expiresAt }),
    });
    const d = await res.json();
    if (d.ok) {
      setInvite(d.active);
      setMessage("有效期已保存");
    } else {
      setMessage(d.message || "保存失败");
    }
  }

  function applyExpiryPreset(days: number) {
    if (days <= 0) {
      setInviteExpiresAt("");
      return;
    }
    const now = new Date();
    now.setDate(now.getDate() + days);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setInviteExpiresAt(local);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  async function changePassword(formData: FormData) {
    const oldPassword = String(formData.get("oldPassword") || "");
    const newPassword = String(formData.get("newPassword") || "");
    const d = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    }).then((r) => r.json());
    setMessage(d.ok ? "密码修改成功" : d.message || "修改失败");
  }

  async function createAdminUser() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword }),
    });
    const d = await safeJson(res);
    if (d.ok) {
      setMessage("管理员已创建");
      setNewAdminUsername("");
      setNewAdminPassword("");
      await refresh(false);
    } else {
      setMessage(d.message || "创建管理员失败");
    }
  }

  async function resetTargetAdminPassword() {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: resetAdminUsername, newPassword: resetAdminNewPassword }),
    });
    const d = await safeJson(res);
    if (d.ok) {
      setMessage("管理员密码已重置");
      setResetAdminNewPassword("");
    } else {
      setMessage(d.message || "重置失败");
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return setMessage("暂无可复制链接");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setMessage("链接已复制");
    } catch {
      setMessage("复制失败，请手动复制");
    }
  }

  async function copyText(text: string) {
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      return true;
    } catch {
      return false;
    }
  }

  function toTemplate(inv: Invite | null): WelcomeTemplate {
    if (!inv) return { ...defaultWelcomeTemplate };
    return {
      welcomeEnabled: inv.welcomeEnabled ?? true,
      welcomeTitle: inv.welcomeTitle || "欢迎光临",
      welcomeSubtitle: inv.welcomeSubtitle || "请开始点餐",
      welcomeButtonText: inv.welcomeButtonText || "开始点餐",
      welcomeFontSize: (inv.welcomeFontSize as WelcomeTemplate["welcomeFontSize"]) || "md",
      welcomeFontWeight: (inv.welcomeFontWeight as WelcomeTemplate["welcomeFontWeight"]) || "semibold",
      welcomeTextAlign: (inv.welcomeTextAlign as WelcomeTemplate["welcomeTextAlign"]) || "center",
      welcomeButtonColor: inv.welcomeButtonColor || "#111827",
      welcomeBackdropOpacity: Math.max(0, Math.min(80, Number(inv.welcomeBackdropOpacity ?? 35))),
    };
  }

  async function saveInviteTemplate(id: string) {
    const draft = inviteTemplateDrafts[id];
    if (!draft) return;
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "update", id, ...draft }),
    });
    const d = await res.json();
    if (d.ok) {
      setMessage("欢迎模板已保存");
      setEditingInviteTemplateId("");
      await refresh(false);
    } else {
      setMessage(d.message || "模板保存失败");
    }
  }

  if (!authedChecked) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-6xl p-6 text-sm text-zinc-500">正在校验登录状态...</div>
      </main>
    );
  }

  return (
    <main className="adminUiRoot min-h-screen bg-[radial-gradient(circle_at_10%_20%,_#fff9ef_0%,_#fff5e8_35%,_#ffffff_100%)]">
      <style jsx global>{`
        .adminUiRoot {
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        }
        .adminUiRoot ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .adminUiRoot ::-webkit-scrollbar-track {
          background: #f0ede8;
          border-radius: 10px;
        }
        .adminUiRoot ::-webkit-scrollbar-thumb {
          background: #d9b48b;
          border-radius: 10px;
        }
        .adminUiRoot ::-webkit-scrollbar-thumb:hover {
          background: #c07e40;
        }
      `}</style>
      <div className="mx-auto max-w-6xl p-4 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-amber-100/80 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 shadow-md">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-orange-100/60 blur-2xl" />
        <h1 className="bg-gradient-to-r from-stone-800 via-amber-700 to-orange-600 bg-clip-text text-3xl font-black tracking-tight text-transparent">{settings.adminTitle || "点餐系统"}</h1>
        <p className="mt-1 text-xs text-stone-500">后厨管理控制台 · 臻选风味</p>
        <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-stone-100 bg-white/70 p-1 backdrop-blur-sm">
          {tabs.map((t) => (
            <button key={t} className={`w-20 rounded-xl px-3 py-2 text-sm font-medium transition md:w-24 ${tab === t ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-700 hover:bg-zinc-50"}`} onClick={() => setTab(t)}>
              {tabLabel[t]}
            </button>
          ))}
          <button className="rounded-xl px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50" onClick={logout}>
            退出
          </button>
        </div>
      </div>
      {message ? <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      {tab === "menu" ? (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-stone-100/80 bg-white/50 p-4 shadow-sm backdrop-blur-sm">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-stone-500">分类筛选</label>
              <select
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-orange-300"
                value={menuCategoryId}
                onChange={(e) => setMenuCategoryId(e.target.value)}
              >
                <option value="">全部分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-stone-500">菜名搜索</label>
              <input
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-orange-300"
                placeholder="输入菜品名称..."
                value={dishKeyword}
                onChange={(e) => setDishKeyword(e.target.value)}
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-stone-500">标签筛选</label>
              <input
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-orange-300"
                placeholder="输入标签..."
                value={dishTagFilter}
                onChange={(e) => setDishTagFilter(e.target.value)}
              />
            </div>
            <div>
              <button
                type="button"
                className="rounded-xl bg-stone-100 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
                onClick={() => {
                  setMenuCategoryId("");
                  setDishKeyword("");
                  setDishTagFilter("");
                }}
              >
                重置筛选
              </button>
            </div>
          </div>
          <div className="space-y-6">
            {categories
              .filter((c) => (menuCategoryId ? c.id === menuCategoryId : true))
              .map((c) => {
                const list = dishes
                  .filter((d) => d.categoryId === c.id)
                  .filter((d) => (dishKeyword ? d.name.includes(dishKeyword) : true))
                  .filter((d) => (dishTagFilter ? (d.tags || "").includes(dishTagFilter) : true));
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-stone-100/80 bg-white p-5 shadow-sm transition-all"
                    draggable
                    onDragStart={() => setDraggingCategoryId(c.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => void reorderCategories(draggingCategoryId, c.id)}
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-1.5 rounded-full bg-orange-400" />
                        <h2 className="text-xl font-bold text-stone-800">{c.name}</h2>
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{list.length} 道</span>
                      </div>
                      <button
                        className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-100"
                        onClick={() => startCreateDish(c.id)}
                      >
                        + 新增菜品
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((d) => {
                        const tag = (() => {
                          const t = normalizeSingleTag(d.tags);
                          return t && availableTagSet.has(t) ? t : "";
                        })();
                        const isActive = Boolean(d.isAvailable);
                        return (
                          <button
                            key={d.id}
                            className={`group overflow-hidden rounded-xl border text-left transition-all duration-200 hover:shadow-md ${
                              isActive ? "border-stone-100 bg-white" : "border-stone-200 bg-stone-50/40"
                            } ${recentSavedDishId === d.id ? "border-emerald-200 ring-2 ring-emerald-200" : ""}`}
                            onClick={() => openDishEditor(d)}
                          >
                            <div className="relative h-32 bg-gradient-to-br from-amber-100/60 to-orange-100/60">
                              {d.images?.[0]?.url ? <Image src={d.images[0].url} alt="dish" fill sizes="33vw" className="object-cover opacity-90" /> : null}
                              <div className="absolute right-2 top-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${
                                    isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  {isActive ? "可点" : "售罄"}
                                </span>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="truncate font-bold text-stone-800">
                                    {d.name}
                                    {d.englishName ? ` / ${d.englishName}` : ""}
                                  </h3>
                                  <p className="mt-0.5 truncate text-xs text-stone-400">{tag ? tag : "经典风味"}</p>
                                </div>
                                <span className="shrink-0 font-bold text-orange-600">¥{d.price}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    isActive ? "border-green-200 bg-green-50 text-green-700" : "border-stone-200 bg-stone-100 text-stone-500"
                                  }`}
                                >
                                  {isActive ? "上架中" : "已下架"}
                                </span>
                                <span className="text-xs text-stone-400 transition group-hover:text-stone-600">点击编辑 →</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
          {drawerOpen && selectedDish ? (
            <div className="fixed inset-0 z-30">
              <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-auto border-l border-zinc-200 bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">
                    {isCreatingDish ? "新增菜品" : selectedDish.name}
                    {!isCreatingDish && selectedDish.englishName ? ` / ${selectedDish.englishName}` : ""}
                  </h3>
                  <button className="rounded-xl border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50" onClick={() => setDrawerOpen(false)}>
                    关闭
                  </button>
                </div>
                <input className="w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.name} onChange={(e) => setSelectedDish({ ...selectedDish, name: e.target.value })} />
                <input className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.englishName || ""} onChange={(e) => setSelectedDish({ ...selectedDish, englishName: e.target.value })} placeholder="英文名（可选）" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.categoryId} onChange={(e) => setSelectedDish({ ...selectedDish, categoryId: e.target.value })}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input className="rounded-xl border border-zinc-200 px-2 py-1" type="number" value={selectedDish.price} onChange={(e) => setSelectedDish({ ...selectedDish, price: Number(e.target.value || 0) })} />
                </div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1"
                  value={selectedDish.tags || ""}
                  onChange={(e) => setSelectedDish({ ...selectedDish, tags: e.target.value })}
                  placeholder="标签（仅保留一个，逗号前内容生效）"
                />
                <input className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.description} onChange={(e) => setSelectedDish({ ...selectedDish, description: e.target.value })} placeholder="描述" />
                <input className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.method} onChange={(e) => setSelectedDish({ ...selectedDish, method: e.target.value })} placeholder="做法" />
                <input className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.ingredients} onChange={(e) => setSelectedDish({ ...selectedDish, ingredients: e.target.value })} placeholder="食材" />
                <input className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1" value={selectedDish.seasonings} onChange={(e) => setSelectedDish({ ...selectedDish, seasonings: e.target.value })} placeholder="调料" />
                <div className="mt-2 flex items-center gap-2">
                  <button className="rounded-xl border border-zinc-300 px-2 py-1 hover:bg-zinc-50" onClick={() => setSelectedDish({ ...selectedDish, isAvailable: !selectedDish.isAvailable })}>
                    {selectedDish.isAvailable ? "切到售罄" : "切到可点"}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDish.images?.map((img) => (
                    <div key={img.id} className="rounded-xl border border-zinc-200 p-1">
                      <Image src={img.url} alt="dish" width={56} height={56} className="h-14 w-14 rounded object-cover" />
                      <button className="mt-1 rounded-lg border border-zinc-300 px-1 py-0.5 text-xs hover:bg-zinc-50" onClick={() => void deleteDishImage(img.id)}>
                        删图
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <input
                    ref={drawerFileInputRef}
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDrawerFile(file);
                      if (file && isCreatingDish && selectedDish && !selectedDish.name.trim()) {
                        const base = file.name.replace(/\.[^/.]+$/, "").trim();
                        if (base) setSelectedDish({ ...selectedDish, name: base });
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs hover:bg-zinc-50"
                      onClick={() => drawerFileInputRef.current?.click()}
                    >
                      {drawerFile ? "重新选择图片" : "选择图片"}
                    </button>
                    {drawerFile ? (
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                        onClick={() => {
                          setDrawerFile(null);
                          if (drawerFileInputRef.current) drawerFileInputRef.current.value = "";
                        }}
                      >
                        清除
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-xs text-zinc-600">{drawerFile ? `已选择：${drawerFile.name}` : "未选择文件，保存后将保留当前封面图"}</p>
                </div>
                <div className="sticky bottom-0 mt-3 flex gap-2 border-t bg-white pt-3">
                  <button className="rounded-xl bg-zinc-900 px-3 py-1 text-white disabled:opacity-60" disabled={isSavingDish} onClick={() => void saveDish(selectedDish, drawerFile)}>
                    {isSavingDish ? "保存中..." : "保存"}
                  </button>
                  {!isCreatingDish ? (
                    <button className="rounded-xl border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-60" disabled={isDeletingDish} onClick={() => void deleteDish(selectedDish.id)}>
                      {isDeletingDish ? "删除中..." : "删除"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "orders" ? (
        <section className="mt-4 space-y-3">
          <div className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm md:grid-cols-5">
            <input className="rounded-xl border border-zinc-200 px-2 py-1 text-sm" placeholder="点餐人" value={orderFilterName} onChange={(e) => setOrderFilterName(e.target.value)} />
            <input className="rounded-xl border border-zinc-200 px-2 py-1 text-sm" type="datetime-local" value={orderFilterFrom} onChange={(e) => setOrderFilterFrom(e.target.value)} />
            <input className="rounded-xl border border-zinc-200 px-2 py-1 text-sm" type="datetime-local" value={orderFilterTo} onChange={(e) => setOrderFilterTo(e.target.value)} />
            <select className="rounded-xl border border-zinc-200 px-2 py-1 text-sm" value={orderFilterStatus} onChange={(e) => setOrderFilterStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="PENDING">待备餐</option>
              <option value="PREPARING">备餐中</option>
              <option value="DONE">已完成</option>
            </select>
            <button className="rounded-xl bg-black px-3 py-1 text-sm text-white" onClick={() => void refresh(true)}>
              筛选
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <button
              type="button"
              className={`rounded-xl border px-3 py-1.5 text-sm ${isOrderMultiSelect ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white hover:bg-zinc-50"}`}
              onClick={() => {
                setIsOrderMultiSelect((v) => !v);
                setSelectedOrderIds([]);
              }}
            >
              {isOrderMultiSelect ? "退出多选" : "开启多选"}
            </button>
            {isOrderMultiSelect ? (
              <>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
                  onClick={() => setSelectedOrderIds((prev) => (prev.length === orders.length ? [] : orders.map((o) => o.id)))}
                >
                  {selectedOrderIds.length === orders.length ? "取消全选" : "全选"}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                  disabled={selectedOrderIds.length === 0}
                  onClick={() => void deleteOrdersBatch()}
                >
                  删除已选（{selectedOrderIds.length}）
                </button>
              </>
            ) : null}
          </div>
          {orders.map((o) => (
            <div key={o.id} className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm ${newOrderIds.includes(o.id) ? "border-orange-500 bg-orange-50" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isOrderMultiSelect ? (
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(o.id)}
                      onChange={(e) =>
                        setSelectedOrderIds((prev) =>
                          e.target.checked ? [...new Set([...prev, o.id])] : prev.filter((id) => id !== o.id)
                        )
                      }
                    />
                  ) : null}
                  <p>
                    {o.guest.name} - {new Date(o.createdAt).toLocaleString()}
                  </p>
                </div>
                <select className="rounded-xl border border-zinc-200 px-2 py-1 text-sm" value={o.status} onChange={(e) => void updateOrderStatus(o.id, e.target.value as Order["status"])}>
                  <option value="PENDING">待备餐</option>
                  <option value="PREPARING">备餐中</option>
                  <option value="DONE">已完成</option>
                </select>
              </div>
              <p className="mt-1 text-sm text-gray-700">当前状态：{statusText(o.status)}</p>
              <ul className="mt-2 text-sm">
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.dish.name} x{i.quantity} | 做法:{i.dish.method || "-"} | 食材:{i.dish.ingredients || "-"} | 调料:{i.dish.seasonings || "-"}
                  </li>
                ))}
              </ul>
              {o.note ? <p className="mt-1 text-sm text-gray-600">备注：{o.note}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
            <button className={`rounded-xl px-3 py-2 text-sm ${settingsSubTab === "links" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`} onClick={() => setSettingsSubTab("links")}>链接管理</button>
            <button className={`rounded-xl px-3 py-2 text-sm ${settingsSubTab === "categories" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`} onClick={() => setSettingsSubTab("categories")}>菜品类型管理</button>
            <button className={`rounded-xl px-3 py-2 text-sm ${settingsSubTab === "system" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`} onClick={() => setSettingsSubTab("system")}>系统设置</button>
            <button className={`rounded-xl px-3 py-2 text-sm ${settingsSubTab === "password" ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`} onClick={() => setSettingsSubTab("password")}>修改后台密码</button>
          </div>
          <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${settingsSubTab === "links" ? "" : "hidden"}`}>
            <h2 className="font-semibold">点餐链接管理</h2>
            <p className="mt-1 text-xs text-gray-500">模板支持变量：<code>{"{{friendName}}"}</code>，会自动替换为该链接的朋友姓名。</p>

            <div className="mt-3 space-y-4">
              <div className="rounded-xl border border-zinc-200 p-3">
                <h3 className="font-semibold">新建链接与列表</h3>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1 text-sm"
                  placeholder="新链接名称（例如：小王）"
                  value={newInviteLabel}
                  onChange={(e) => setNewInviteLabel(e.target.value)}
                />
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-2 py-1 text-sm"
                  placeholder="朋友姓名（用于欢迎词变量与下单姓名）"
                  value={newInviteGuestName}
                  onChange={(e) => setNewInviteGuestName(e.target.value)}
                />
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  <p>变量写法：<code>{"{{friendName}}"}</code></p>
                  <p className="mt-1">预览：{`欢迎你，${newInviteGuestName || "朋友"}，开始点餐`}</p>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" checked={newInviteShowPrice} onChange={(e) => setNewInviteShowPrice(e.target.checked)} />
                  该链接对外展示价格
                </label>
                <details className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-700">欢迎模板配置</summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] text-zinc-500">变量示例：欢迎你，{"{{friendName}}"}</p>
                    <label className="flex items-center gap-2 text-xs text-zinc-700">
                      <input
                        type="checkbox"
                        checked={newInviteTemplate.welcomeEnabled}
                        onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeEnabled: e.target.checked }))}
                      />
                      启用欢迎弹窗
                    </label>
                    <input className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-xs" placeholder="标题" value={newInviteTemplate.welcomeTitle} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeTitle: e.target.value }))} />
                    <input className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-xs" placeholder="副标题" value={newInviteTemplate.welcomeSubtitle} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeSubtitle: e.target.value }))} />
                    <input className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-xs" placeholder="按钮文案" value={newInviteTemplate.welcomeButtonText} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeButtonText: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-2">
                      <select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={newInviteTemplate.welcomeFontSize} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeFontSize: e.target.value as WelcomeTemplate["welcomeFontSize"] }))}>
                        <option value="sm">小号</option><option value="md">中号</option><option value="lg">大号</option>
                      </select>
                      <select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={newInviteTemplate.welcomeFontWeight} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeFontWeight: e.target.value as WelcomeTemplate["welcomeFontWeight"] }))}>
                        <option value="normal">常规</option><option value="medium">中等</option><option value="semibold">半粗</option><option value="bold">加粗</option>
                      </select>
                      <select className="rounded-lg border border-zinc-200 px-2 py-1 text-xs" value={newInviteTemplate.welcomeTextAlign} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeTextAlign: e.target.value as WelcomeTemplate["welcomeTextAlign"] }))}>
                        <option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <input className="h-8 w-full rounded border border-zinc-200" type="color" value={newInviteTemplate.welcomeButtonColor} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeButtonColor: e.target.value }))} />
                      <input className="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-xs" type="number" min={0} max={80} value={newInviteTemplate.welcomeBackdropOpacity} onChange={(e) => setNewInviteTemplate((t) => ({ ...t, welcomeBackdropOpacity: Math.max(0, Math.min(80, Number(e.target.value || 35))) }))} />
                    </div>
                    <div className="rounded-xl border border-amber-200/80 bg-white p-3">
                      <div
                        className="rounded-2xl border border-white/40 p-4 shadow-sm"
                        style={{
                          backgroundColor: `rgba(255,255,255,${Math.max(0.65, 1 - newInviteTemplate.welcomeBackdropOpacity / 100)})`,
                          textAlign: newInviteTemplate.welcomeTextAlign,
                        }}
                      >
                        <p className={`${newInviteTemplate.welcomeFontSize === "lg" ? "text-2xl" : newInviteTemplate.welcomeFontSize === "sm" ? "text-lg" : "text-xl"} ${newInviteTemplate.welcomeFontWeight === "bold" ? "font-bold" : newInviteTemplate.welcomeFontWeight === "medium" ? "font-medium" : newInviteTemplate.welcomeFontWeight === "normal" ? "font-normal" : "font-semibold"} text-stone-900`}>
                          {String(newInviteTemplate.welcomeTitle || "欢迎光临").replace(/\{\{\s*friendName\s*\}\}/gi, newInviteGuestName || "朋友")}
                        </p>
                        <p className="mt-2 text-sm text-stone-600">
                          {String(newInviteTemplate.welcomeSubtitle || "请开始点餐").replace(/\{\{\s*friendName\s*\}\}/gi, newInviteGuestName || "朋友")}
                        </p>
                        <button
                          type="button"
                          className="mt-3 rounded-xl px-3 py-1.5 text-sm font-semibold text-white"
                          style={{ backgroundColor: newInviteTemplate.welcomeButtonColor || "#111827" }}
                        >
                          {String(newInviteTemplate.welcomeButtonText || "开始点餐").replace(/\{\{\s*friendName\s*\}\}/gi, newInviteGuestName || "朋友")}
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60" disabled={isCreatingInvite} onClick={createInvite}>
                    {isCreatingInvite ? "创建中..." : "新建链接"}
                  </button>
                  <button className="rounded-xl bg-black px-3 py-2 text-sm text-white" onClick={resetInvite}>
                    重置链接
                  </button>
                </div>

                <div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-xl border border-zinc-200 p-2">
                  {inviteLinks.map((x) => {
                    const link = `${globalThis.location?.origin || ""}/menu/${x.token}`;
                    const isMain = invite?.id === x.id;
                    return (
                      <div key={x.id} className="rounded-lg border border-zinc-200 p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {x.label || "未命名链接"} {isMain ? "（主）" : ""}
                          </p>
                          {x.inviteGuestName ? <span className="text-zinc-500">朋友：{x.inviteGuestName}</span> : null}
                          <span className="text-zinc-500">
                            {x.isActive ? "启用" : "停用"} / {x.isExpired ? "过期" : "有效"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            className="rounded border px-2 py-0.5"
                            onClick={async () => {
                              const ok = await copyText(link);
                              setMessage(ok ? "链接已复制" : "复制失败，请手动复制");
                            }}
                          >
                            复制
                          </button>
                          <button
                            className="rounded border px-2 py-0.5"
                            onClick={async () => {
                              const res = await fetch("/api/admin/invite", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ mode: "update", id: x.id, showPrice: !Boolean(x.showPrice) }),
                              });
                              const d = await res.json();
                              if (d.ok) {
                                setMessage(!Boolean(x.showPrice) ? "已开启展示价格" : "已关闭展示价格");
                                await refresh(false);
                              } else {
                                setMessage(d.message || "更新失败");
                              }
                            }}
                          >
                            {x.showPrice ? "隐藏价格" : "展示价格"}
                          </button>
                          {!isMain ? (
                            <button className="rounded border px-2 py-0.5" onClick={() => setActiveInvite(x.id)}>
                              设为主链接
                            </button>
                          ) : null}
                          <button
                            className="rounded border px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={!x.isActive && x.isExpired}
                            onClick={() => toggleInvite(x.id, !x.isActive, x.isExpired)}
                          >
                            {x.isActive ? "停用" : x.isExpired ? "过期" : "启用"}
                          </button>
                          {!isMain ? (
                            <button className="rounded border px-2 py-0.5 text-red-600" onClick={() => removeInvite(x.id)}>
                              删除
                            </button>
                          ) : null}
                          <button className="rounded border px-2 py-0.5" onClick={() => setExpandedInviteId((v) => (v === x.id ? "" : x.id))}>
                            {expandedInviteId === x.id ? "收起链接" : "查看链接"}
                          </button>
                          <button
                            className="rounded border px-2 py-0.5"
                            onClick={() => {
                              setEditingInviteTemplateId((v) => (v === x.id ? "" : x.id));
                              setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: prev[x.id] || toTemplate(x) }));
                            }}
                          >
                            {editingInviteTemplateId === x.id ? "收起模板" : "模板"}
                          </button>
                        </div>
                        {expandedInviteId === x.id ? <p className="mt-1 break-all text-zinc-500">{link}</p> : null}
                        {editingInviteTemplateId === x.id ? (
                          <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
                            <label className="flex items-center gap-2 text-xs text-zinc-700">
                              <input
                                type="checkbox"
                                checked={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeEnabled}
                                onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeEnabled: e.target.checked } }))}
                              />
                              启用欢迎弹窗
                            </label>
                            <input className="w-full rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeTitle} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeTitle: e.target.value } }))} placeholder="标题" />
                            <input className="w-full rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeSubtitle} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeSubtitle: e.target.value } }))} placeholder="副标题" />
                            <input className="w-full rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeButtonText} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeButtonText: e.target.value } }))} placeholder="按钮文案" />
                            <div className="grid grid-cols-3 gap-2">
                              <select className="rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeFontSize} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeFontSize: e.target.value as WelcomeTemplate["welcomeFontSize"] } }))}><option value="sm">小</option><option value="md">中</option><option value="lg">大</option></select>
                              <select className="rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeFontWeight} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeFontWeight: e.target.value as WelcomeTemplate["welcomeFontWeight"] } }))}><option value="normal">常规</option><option value="medium">中</option><option value="semibold">半粗</option><option value="bold">粗</option></select>
                              <select className="rounded border border-zinc-200 px-2 py-1 text-xs" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeTextAlign} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeTextAlign: e.target.value as WelcomeTemplate["welcomeTextAlign"] } }))}><option value="left">左</option><option value="center">中</option><option value="right">右</option></select>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                              <input className="h-8 w-full rounded border border-zinc-200" type="color" value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeButtonColor} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeButtonColor: e.target.value } }))} />
                              <input className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs" type="number" min={0} max={80} value={(inviteTemplateDrafts[x.id] || toTemplate(x)).welcomeBackdropOpacity} onChange={(e) => setInviteTemplateDrafts((prev) => ({ ...prev, [x.id]: { ...(prev[x.id] || toTemplate(x)), welcomeBackdropOpacity: Math.max(0, Math.min(80, Number(e.target.value || 35))) } }))} />
                            </div>
                            <button className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100" onClick={() => void saveInviteTemplate(x.id)}>
                              保存模板
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">主链接（低频）</h3>
                  <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={() => setShowPrimaryInviteCard((v) => !v)}>
                    {showPrimaryInviteCard ? "隐藏" : "显示"}
                  </button>
                </div>
                {showPrimaryInviteCard ? (
                  <>
                <p className="mt-2 text-sm font-medium">{invite?.label || "未命名主链接"}</p>
                <p className="mt-1 text-xs text-gray-600">
                  {invite?.expiresAt
                    ? new Date(invite.expiresAt) < new Date()
                      ? "当前链接状态：已过期"
                      : `当前链接状态：有效（至 ${new Date(invite.expiresAt).toLocaleString()}）`
                    : "当前链接状态：永久有效"}
                </p>
                <input className="mt-3 w-full rounded-xl border border-zinc-200 px-2 py-1 text-sm" type="datetime-local" value={inviteExpiresAt} onChange={(e) => setInviteExpiresAt(e.target.value)} />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">X天内有效期</span>
                  <select
                    className="rounded-xl border border-zinc-200 px-2 py-1 text-sm"
                    value={expiryPresetDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExpiryPresetDays(v);
                      applyExpiryPreset(Number(v));
                    }}
                  >
                    <option value="0">自定义</option>
                    <option value="1">1天</option>
                    <option value="3">3天</option>
                    <option value="7">7天</option>
                    <option value="15">15天</option>
                    <option value="30">30天</option>
                  </select>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={copyInviteLink}>
                    复制链接
                  </button>
                  <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={saveInviteExpiry}>
                    保存有效期
                  </button>
                  {invite ? (
                    <button
                      className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                      onClick={() =>
                        toggleInvite(
                          invite.id,
                          !Boolean(invite.isActive ?? true),
                          Boolean(invite.expiresAt && new Date(invite.expiresAt) < new Date())
                        )
                      }
                    >
                      {invite.isActive === false ? "启用主链接" : "停用主链接"}
                    </button>
                  ) : null}
                </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${settingsSubTab === "system" ? "" : "hidden"}`}>
            <h2 className="font-semibold">系统设置</h2>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={debugUi}
                onChange={(e) => {
                  const v = e.target.checked;
                  setDebugUi(v);
                  setDebugUiEnabled(v);
                }}
              />
              <span>显示调试日志面板（全站生效，记录客户端请求；后台页额外展示服务端近期日志）。开关保存在本浏览器，也可通过 URL 参数 `?debug=1` 快速开启。</span>
            </label>
            <button type="button" className="mt-2 flex w-full items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50" onClick={() => setShowLowFrequencySettings((v) => !v)}>
              <span className="font-medium">低频区（邮件）</span>
              <span className="text-xs text-zinc-500">{showLowFrequencySettings ? "收起" : "展开"}</span>
            </button>
            <label className="mt-2 block text-sm">系统名称</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              value={settings.adminTitle || ""}
              onFocus={() => setIsEditingSettings(true)}
              onChange={(e) => setSettings({ ...settings, adminTitle: e.target.value })}
            />
            <label className="mt-2 block text-sm">订单刷新间隔（秒）</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              type="number"
              min={5}
              max={30}
              value={settings.refreshIntervalSec}
              onFocus={() => setIsEditingSettings(true)}
              onChange={(e) => setSettings({ ...settings, refreshIntervalSec: Number(e.target.value || 8) })}
            />
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })} />
              启用邮件提醒
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(settings.welcomeAlwaysShow)}
                onChange={(e) => setSettings({ ...settings, welcomeAlwaysShow: e.target.checked })}
              />
              欢迎弹窗每次都显示（忽略本地“已看过”标记）
            </label>
            <label className="mt-2 block text-sm">用户端主标题</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              value={settings.guestTitle || ""}
              onFocus={() => setIsEditingSettings(true)}
              onChange={(e) => setSettings({ ...settings, guestTitle: e.target.value })}
            />
            <label className="mt-2 block text-sm">用户端副标题</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
              value={settings.guestSubtitle || ""}
              onFocus={() => setIsEditingSettings(true)}
              onChange={(e) => setSettings({ ...settings, guestSubtitle: e.target.value })}
            />
            <label className="mt-2 block text-sm">用户端 Banner 头图</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                value={settings.guestBannerUrl || ""}
                onFocus={() => setIsEditingSettings(true)}
                onChange={(e) => setSettings({ ...settings, guestBannerUrl: e.target.value })}
                placeholder="可粘贴图片 URL，或使用右侧上传"
              />
              <button
                type="button"
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.set("file", file);
                    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
                    const d = await safeJson(res);
                    if (d.ok) {
                      setSettings((prev) => ({ ...prev, guestBannerUrl: String(d.url || "") }));
                      setIsEditingSettings(true);
                      setMessage("Banner 已上传，请点击“保存系统设置”生效");
                    } else {
                      setMessage(d.message || "Banner 上传失败");
                    }
                  };
                  input.click();
                }}
              >
                上传
              </button>
              {settings.guestBannerUrl ? (
                <button
                  type="button"
                  className="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, guestBannerUrl: "" }));
                    setIsEditingSettings(true);
                    setMessage("Banner 已删除，请点击“保存系统设置”生效");
                  }}
                >
                  删除
                </button>
              ) : null}
            </div>
            {settings.guestBannerUrl ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200">
                <div className="relative h-24 w-full bg-zinc-50">
                  <Image src={settings.guestBannerUrl} alt="banner-preview" fill sizes="100vw" className="object-cover" />
                </div>
              </div>
            ) : null}
            <div className={`mt-2 ${showLowFrequencySettings ? "" : "hidden"}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                onClick={() => setIsEmailConfigOpen((v) => !v)}
              >
                <span className="font-medium">邮件提醒配置</span>
                <span className="text-xs text-zinc-500">{isEmailConfigOpen ? "收起" : "展开"}</span>
              </button>
              {isEmailConfigOpen ? (
                <div className="mt-2 space-y-2">
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="发件邮箱（sender）"
                    value={settings.emailSender || ""}
                    onFocus={() => setIsEditingSettings(true)}
                    onChange={(e) => setSettings({ ...settings, emailSender: e.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="授权码（password）"
                    value={settings.emailPassword || ""}
                    onFocus={() => setIsEditingSettings(true)}
                    onChange={(e) => setSettings({ ...settings, emailPassword: e.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="收件邮箱（receiver）"
                    value={settings.emailReceiver || ""}
                    onFocus={() => setIsEditingSettings(true)}
                    onChange={(e) => setSettings({ ...settings, emailReceiver: e.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    placeholder="SMTP server"
                    value={settings.smtpServer || ""}
                    onFocus={() => setIsEditingSettings(true)}
                    onChange={(e) => setSettings({ ...settings, smtpServer: e.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    type="number"
                    placeholder="SMTP port"
                    value={settings.smtpPort || 587}
                    onFocus={() => setIsEditingSettings(true)}
                    onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value || 587) })}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex gap-2">
              <button className="rounded-xl bg-black px-3 py-2 text-sm text-white" onClick={saveSettings}>
                保存系统设置
              </button>
              <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={sendTestMail}>
                发送测试邮件
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
              <h3 className="text-sm font-semibold">菜单数据备份/恢复（ZIP）</h3>
              <p className="mt-1 text-xs text-zinc-500">导出格式：每道菜一个文件夹，内含 `dish.json` 和图片文件；可直接用于一键恢复。</p>
              <input
                ref={restoreZipInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importMenuBackupZip(file);
                  e.currentTarget.value = "";
                }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => void exportMenuBackupZip()}>
                  一键备份 ZIP
                </button>
                <button
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".zip,application/zip";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) void previewMenuBackupZip(file);
                    };
                    input.click();
                  }}
                >
                  预检恢复 ZIP
                </button>
                <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => restoreZipInputRef.current?.click()}>
                  一键恢复 ZIP
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <h3 className="text-sm font-semibold">标签治理（高级）</h3>
              <p className="mt-1 text-xs text-gray-500">自动隐藏无效标签已做在前台；这里提供“一键清理”，让管理员列表更干净。</p>
              <button
                className="mt-2 w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => void cleanupUnusedTags()}
              >
                一键清理无效标签
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3">
              <h3 className="text-sm font-semibold text-red-700">危险操作：一键硬删除所有菜品</h3>
              <p className="mt-1 text-xs text-red-600">会删除全部菜品、菜品图片，以及订单中的菜品明细（OrderItem），不可撤销。</p>
              <button
                className="mt-2 w-full rounded-xl border border-red-500 bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => void purgeAllDishes()}
              >
                一键硬删除所有菜品
              </button>
            </div>
          </div>
          <form className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${settingsSubTab === "password" ? "" : "hidden"}`} action={changePassword}>
            <h2 className="font-semibold">修改后台密码</h2>
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2" name="oldPassword" type="password" placeholder="旧密码" />
            <input className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2" name="newPassword" type="password" placeholder="新密码" />
            <button className="mt-2 rounded-xl bg-black px-3 py-2 text-sm text-white">保存新密码</button>
          </form>
          <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${settingsSubTab === "password" ? "" : "hidden"}`}>
            <h3 className="font-semibold">管理员管理</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" placeholder="新管理员用户名（3-24位）" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} />
              <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="password" placeholder="新管理员密码（至少8位）" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} />
            </div>
            <button className="mt-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => void createAdminUser()}>
              新增管理员
            </button>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <select className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" value={resetAdminUsername} onChange={(e) => setResetAdminUsername(e.target.value)}>
                <option value="">选择要重置密码的管理员</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.username}
                  </option>
                ))}
              </select>
              <input className="rounded-xl border border-zinc-200 px-3 py-2 text-sm" type="password" placeholder="新密码（至少8位）" value={resetAdminNewPassword} onChange={(e) => setResetAdminNewPassword(e.target.value)} />
            </div>
            <button className="mt-2 rounded-xl border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50" onClick={() => void resetTargetAdminPassword()}>
              重置指定管理员密码
            </button>
            <div className="mt-3 max-h-40 overflow-auto rounded-xl border border-zinc-200 p-2 text-xs text-zinc-600">
              {adminUsers.map((u) => (
                <p key={u.id}>
                  {u.username}（创建于 {new Date(u.createdAt).toLocaleString()}）
                </p>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${settingsSubTab === "categories" ? "" : "hidden"}`}>
            <h2 className="font-semibold">菜品类型管理</h2>
            <p className="mt-1 text-xs text-zinc-500">支持新增、删除、拖拽排序，排序结果会同步到用户点餐端。</p>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="新增分类名称（例如：热菜）"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white" onClick={() => void createCategoryInSettings()}>
                新增
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 p-2"
                  draggable
                  onDragStart={() => setDraggingCategoryId(c.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void reorderCategories(draggingCategoryId, c.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="cursor-move text-xs text-zinc-500">拖拽</span>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      onClick={() =>
                        void fetch("/api/admin/categories", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: c.id, name: c.name, sortOrder: c.sortOrder, isEnabled: !c.isEnabled }),
                        }).then(() => refresh(false))
                      }
                    >
                      {c.isEnabled ? "停用" : "启用"}
                    </button>
                    <button className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => void deleteCategoryInSettings(c.id)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      </div>
      <DebugLogPanel key={debugUi ? "dbg-on" : "dbg-off"} enabled={debugUi} fetchServerLogs />
    </main>
  );
}
