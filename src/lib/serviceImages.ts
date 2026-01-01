// Service category to image mapping
import ppfFullBody from "@/assets/services/ppf-full-body.jpg";
import ceramicCoating from "@/assets/services/ceramic-coating.jpg";
import paintCorrection from "@/assets/services/paint-correction.jpg";
import fullDetail from "@/assets/services/full-detail.jpg";
import ppfStandard from "@/assets/services/ppf-standard.jpg";

export const serviceImages: Record<string, string> = {
  // By service title (exact match)
  "Technik Pro 10+ Full Body PPF": ppfFullBody,
  "Paint Protection Film": ppfStandard,
  "Ceramic Coating": ceramicCoating,
  "Paint Correction": paintCorrection,
  "Full Detail": fullDetail,
};

// Fallback by category
export const categoryImages: Record<string, string> = {
  "Protection": ceramicCoating,
  "Full Body Paint Protection": ppfFullBody,
  "Enhancement": paintCorrection,
  "Detailing": fullDetail,
};

export function getServiceImage(title: string, category: string): string | null {
  return serviceImages[title] || categoryImages[category] || null;
}
