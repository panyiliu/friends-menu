import GuestMyOrdersClient from "./ui";

export default async function MyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestMyOrdersClient token={token} />;
}
