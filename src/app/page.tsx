import { FisherIntake } from "@/components/fisher-intake";

export default function Home() {
  return (
    <main>
      <header className="brand-header">
        <div className="brand-mark" aria-hidden="true">
          ஆ
        </div>
        <div>
          <p className="brand-name">AAZHI</p>
          <p className="tagline">
            See the sea. Speak your situation. Know your next move.
          </p>
        </div>
      </header>

      <div className="product-position">
        <span>MARINE SYSTEMS FORECAST THE SEA</span>
        <span aria-hidden="true">→</span>
        <strong>AAZHI INTERPRETS THE DECISION AT THE SHORE</strong>
      </div>

      <FisherIntake />

      <footer>
        <span>AAZHI · PRE-DEPARTURE READINESS ASSISTANCE</span>
        <span>MARINE DATA: OPEN-METEO</span>
      </footer>
    </main>
  );
}
