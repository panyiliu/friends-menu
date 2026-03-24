export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">朋友聚餐点餐系统</h1>
      <p className="mt-3 text-sm text-gray-600">访客请通过管理员分享的点餐链接进入。</p>
      <a className="mt-6 inline-block rounded bg-black px-4 py-2 text-sm text-white" href="/admin/login">
        进入管理员后台
      </a>
    </main>
  );
}
