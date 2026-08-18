import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DocumentBadges({ version, accessLevel }: { version: number; accessLevel: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {version > 1 && (
        <Badge variant="outline" className="text-[10px]">
          v{version}
        </Badge>
      )}
      {accessLevel === "restricted" && (
        <Badge variant="warning" className="text-[10px]">
          <Lock className="size-3" /> Restricted
        </Badge>
      )}
    </span>
  );
}
