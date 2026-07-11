import { FisherIntake } from "@/components/fisher-intake";

export default function Home() {
  return (
    <main>
      <header className="brand-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            ஆ
          </div>
          <div>
            <p className="brand-name">AAZHI</p>
            <p className="operational-label">OPERATIONAL DECISION SUPPORT</p>
          </div>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">
          See the sea. Speak your situation.
          <span>Know your next move.</span>
        </h1>
        <p>
          Marine systems forecast the sea. AAZHI interprets the decision at the
          shore.
        </p>
      </section>

      <FisherIntake />

      <footer>
        <span>AAZHI · PRE-DEPARTURE READINESS ASSISTANCE</span>
        <span>MARINE DATA: OPEN-METEO</span>
      </footer>
    </main>
  );
}
