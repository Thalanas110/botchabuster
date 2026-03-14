import { PageHeader } from "@/components/PageHeader";
import { InspectionListItem } from "@/components/InspectionListItem";
import { useInspections } from "@/hooks/useInspections";
import { Loader2, ClipboardList } from "lucide-react";

const HistoryPage = () => {
  const { data: inspections, isLoading } = useInspections();

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="History" subtitle="Past inspection records" />

      <div className="px-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !inspections?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-3" />
            <p className="font-display text-sm uppercase tracking-wider">No inspections yet</p>
            <p className="text-xs mt-1">Capture and analyze a sample to get started</p>
          </div>
        ) : (
          inspections.map((inspection) => (
            <InspectionListItem key={inspection.id} inspection={inspection} />
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
