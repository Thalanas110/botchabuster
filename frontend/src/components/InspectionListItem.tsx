import type { Inspection } from "@/types/inspection";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface InspectionListItemProps {
  inspection: Inspection;
  onClick?: () => void;
  className?: string;
}

export function InspectionListItem({ inspection, onClick, className }: InspectionListItemProps) {
  return (
    <Card
      className={cn("cursor-pointer transition-colors hover:bg-surface-elevated", className)}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {inspection.image_url ? (
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-border">
            <img src={inspection.image_url} alt="Sample" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border border-border bg-secondary">
            <span className="font-display text-lg text-muted-foreground">
              {inspection.meat_type[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-semibold capitalize truncate">
              {inspection.meat_type}
            </p>
            <FreshnessBadge classification={inspection.classification} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(inspection.created_at), "MMM d, yyyy · h:mm a")}
          </p>
          {inspection.location && (
            <p className="text-xs text-muted-foreground truncate">{inspection.location}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-display text-lg font-bold">{inspection.confidence_score}%</p>
          <p className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
            conf
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
