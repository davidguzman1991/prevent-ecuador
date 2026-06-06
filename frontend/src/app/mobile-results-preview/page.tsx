import MobileResultsDashboard from "@/components/mobile/results/MobileResultsDashboard";
import MobileResultsDashboardV2 from "@/components/mobile/results/MobileResultsDashboardV2";
import MobileResultsDashboardV3 from "@/components/mobile/results/MobileResultsDashboardV3";
import MobileResultsDashboardV4 from "@/components/mobile/results/MobileResultsDashboardV4";

const USE_RESULTS_V4 = true;
const USE_RESULTS_V3 = true;
const USE_RESULTS_V2 = true;

const mockResults = {
  cvd10: 12.4,
  ascvd10: 8.2,
  hf10: 4.1,
  cvd30: 38.2,
  chronologicalAge: 52,
  cardiovascularAge: 57.5,
  cardiovascularAgeDelta: 5.5,
  riskCategory10y: "Riesgo intermedio",
  keyFindings: [
    "La presión arterial es el principal factor modificable.",
    "La edad cardiovascular excede la cronológica por 5.5 años.",
    "El riesgo acumulado a largo plazo es 38.2%.",
  ],
};

export default function MobileResultsPreviewPage() {
  if (USE_RESULTS_V4) {
    return <MobileResultsDashboardV4 {...mockResults} />;
  }

  if (USE_RESULTS_V3) {
    return <MobileResultsDashboardV3 {...mockResults} />;
  }

  if (USE_RESULTS_V2) {
    return <MobileResultsDashboardV2 {...mockResults} />;
  }

  return <MobileResultsDashboard {...mockResults} />;
}
