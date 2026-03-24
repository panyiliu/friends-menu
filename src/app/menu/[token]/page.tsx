import GuestMenuClient from "./ui";

export default async function MenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <GuestMenuClient token={token} />;
}
