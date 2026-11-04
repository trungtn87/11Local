import type { Metadata } from "next";
import DiscordSettingsApp from "./discord-settings-app";

export const metadata: Metadata = {
  title: "Cài đặt Discord | 11Local Admin",
  robots: { index: false, follow: false },
};

export default function AdminDiscordPage() {
  return <DiscordSettingsApp />;
}
