export { InspectionService, inspectionService } from "./InspectionService";
export { AnalysisService, analysisService } from "./AnalysisService";
export { ProfileService, profileService } from "./ProfileService";
export { AccessCodeService, accessCodeService } from "./AccessCodeService";
export { StatsService, statsService, type LandingPageStats } from "./StatsService";
// Note: StorageService removed - use uploadClient from @/integrations/api instead
// This ensures all uploads go through the backend for proper validation and security
