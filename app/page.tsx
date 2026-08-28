import type { Metadata } from "next";
import HomeSearch from "@/app/components/home-search";
import NotificationLink from "@/app/components/notification-link";

export const metadata: Metadata = {
  title: "Debal | Find a room. Find your people.",
  description: "Verified rooms, homes, and compatible roommates across Ethiopia.",
};

const listings = [
  { area: "Bole, Addis Ababa", title: "Sunlit private room in Bole", price: "8,500 ETB", details: "Private room · Furnished · Available now", match: "94% match", tone: "listing-photo-one" },
  { area: "Gerji, Addis Ababa", title: "Room in a calm shared apartment", price: "6,200 ETB", details: "Private room · 2 roommates · Sep 1", match: "89% match", tone: "listing-photo-two" },
  { area: "Kazanchis, Addis Ababa", title: "Modern room near ECA", price: "9,000 ETB", details: "Private room · Utilities included · Aug 28", match: "86% match", tone: "listing-photo-three" },
];

export default function Home() {
  return (
    <main>
      <header className="site-header shell">
        <a className="brand" href="#top" aria-label="Debal home"><span className="brand-logo" aria-hidden="true" /></a>
        <nav aria-label="Main navigation"><a href="/listings">Find a home</a><a href="/roommates">Find a roommate</a><a href="#safety">How it works</a></nav>
        <div className="header-actions"><NotificationLink /><a className="button button-ghost" href="/onboarding">My profile</a><a className="button button-dark" href="/listings/new">List a place</a></div>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <span className="eyebrow">VERIFIED HOUSING IN ETHIOPIA</span>
          <h1>Find a place.<br />Find your people.</h1>
          <p>Discover verified rooms and compatible roommates—matched to your budget, location, and way of living.</p>
        </div>
        <video className="hero-motion" autoPlay muted loop playsInline poster="/Debal-logo.png" aria-label="Debal animated logo"><source src="/debal-logo%20video.mp4" type="video/mp4" /></video>
        <div className="trust-card" aria-label="Debal trust promise"><div className="trust-orbit"><span>✓</span></div><strong>Built for safer sharing</strong><p>Phone verification, clear listings, and compatibility-first matches.</p></div>
        <HomeSearch />
      </section>

      <section className="listing-section shell" id="homes">
        <div className="section-heading"><div><span className="eyebrow">PLACES YOU MAY LIKE</span><h2>Homes that fit your life</h2></div><a href="/listings" className="text-link">Explore all listings <span>→</span></a></div>
        <div className="listing-grid">
          {listings.map((listing, index) => (
            <article className="listing-card" key={listing.title}>
              <div className={`listing-photo ${listing.tone}`}><span className="verified-pill">✓ Verified</span><button className="heart" aria-label={`Save ${listing.title}`}>♡</button><span className="photo-number">0{index + 1}</span></div>
              <div className="listing-body"><span className="area">{listing.area}</span><h3>{listing.title}</h3><p>{listing.details}</p><div className="listing-meta"><strong>{listing.price}<small>/month</small></strong><span>{listing.match}</span></div></div>
            </article>
          ))}
        </div>
      </section>

      <section className="match-section" id="roommates">
        <div className="shell match-layout">
          <div className="match-copy"><span className="eyebrow light">MORE THAN A ROOM</span><h2>Meet someone you&apos;ll actually enjoy living with.</h2><p>Debal compares the things that make a shared home work—from quiet hours and cleanliness to budget and move-in date.</p><a className="button button-light" href="/roommates">Find my matches <span>→</span></a></div>
          <div className="match-card"><div className="profile-row"><div className="avatar avatar-one">H</div><div className="compatibility"><strong>92%</strong><span>compatible</span></div><div className="avatar avatar-two">M</div></div><div className="match-reasons"><span>✓ Same neighborhood</span><span>✓ Similar budget</span><span>✓ Both non-smokers</span><span>✓ Similar sleep schedule</span></div></div>
        </div>
      </section>

      <section className="safety-section shell" id="safety">
        <span className="eyebrow">TRUST, BUILT IN</span><h2>A safer way to find your next home</h2>
        <div className="steps"><article><span>01</span><h3>Create your profile</h3><p>Tell us what you need and how you like to live.</p></article><article><span>02</span><h3>Browse verified options</h3><p>See clear details, trust signals, and real compatibility.</p></article><article><span>03</span><h3>Connect safely</h3><p>Chat in Debal before deciding to meet or view a property.</p></article></div>
        <aside className="safety-note"><strong>Safety first:</strong> Always view a property and verify the person before sending money.</aside>
      </section>

      <footer><div className="shell footer-inner"><a className="brand brand-footer" href="#top" aria-label="Debal home"><span className="brand-logo brand-logo-light" aria-hidden="true" /></a><p>Finding the right place—and the right people—should feel this simple.</p><span>Made for Ethiopia</span></div></footer>
    </main>
  );
}
