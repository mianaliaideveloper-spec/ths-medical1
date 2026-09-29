import { AuthGate } from "@/components/auth-gate";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
