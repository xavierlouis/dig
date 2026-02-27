import DigHero from "@/components/DigHero";
import PackShop from "@/components/PackShop";
import Header from "@/components/ui/Header";
import HomeInitializer from "@/components/HomeInitializer";
import FireflyParticles from "@/components/effects/FireflyParticles";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-gradient-to-b from-bg0 to-bg1 text-ink overflow-hidden pb-12">
      {/* Initialize store with today's token */}
      <HomeInitializer />

      {/* background image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage: "url(/bg/graveyard-desktop.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* tsparticles effects */}
      <FireflyParticles />

      <div className="relative mx-auto w-full max-w-[1100px] px-4 py-4">
        <Header />

        <section className="mt-4">
          <DigHero />
        </section>

        <section className="mt-4">
          <PackShop />
        </section>
      </div>
    </main>
  );
}
