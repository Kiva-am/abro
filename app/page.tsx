import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abro | Find a room. Find your people.",
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
        <a className="brand" href="#top" aria-label="Abro home"><span className="brand-mark">A</span><span>abro</span></a>
        <nav aria-label="Main navigation"><a href="#homes">Find a home</a><a href="#roommates">Find a roommate</a><a href="#safety">How it works</a></nav>
        <div className="header-actions"><button className="button button-ghost">Sign in</button><button className="button button-dark">List a place</button></div>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <span className="eyebrow">VERIFIED HOUSING IN ETHIOPIA</span>
          <h1>Find a place.<br />Find your people.</h1>
          <p>Discover verified rooms and compatible roommates—matched to your budget, location, and way of living.</p>
        </div>
        <div className="trust-card" aria-label="Abro trust promise"><div className="trust-orbit"><span>✓</span></div><strong>Built for safer sharing</strong><p>Phone verification, clear listings, and compatibility-first matches.</p></div>
        <form className="search-panel" action="#homes">
          <label><span>Where</span><select defaultValue="Addis Ababa"><option>Addis Ababa</option><option>Adama</option><option>Hawassa</option><option>Bahir Dar</option><option>Dire Dawa</option></select></label>
          <label><span>I&apos;m looking for</span><select defaultValue="A private room"><option>A private room</option><option>A shared room</option><option>An apartment</option><option>A roommate</option></select></label>
          <label><span>Monthly budget</span><select defaultValue="3,000–10,000 ETB"><option>3,000–10,000 ETB</option><option>Under 5,000 ETB</option><option>5,000–8,000 ETB</option><option>8,000–12,000 ETB</option></select></label>
          <button className="search-button" type="submit">Search places <span>→</span></button>
        </form>
      </section>

      <section className="listing-section shell" id="homes">
        <div className="section-heading"><div><span className="eyebrow">PLACES YOU MAY LIKE</span><h2>Homes that fit your life</h2></div><a href="#homes" className="text-link">Explore all listings <span>→</span></a></div>
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
          <div className="match-copy"><span className="eyebrow light">MORE THAN A ROOM</span><h2>Meet someone you&apos;ll actually enjoy living with.</h2><p>Abro compares the things that make a shared home work—from quiet hours and cleanliness to budget and move-in date.</p><a className="button button-light" href="#top">Find my matches <span>→</span></a></div>
          <div className="match-card"><div className="profile-row"><div className="avatar avatar-one">H</div><div className="compatibility"><strong>92%</strong><span>compatible</span></div><div className="avatar avatar-two">M</div></div><div className="match-reasons"><span>✓ Same neighborhood</span><span>✓ Similar budget</span><span>✓ Both non-smokers</span><span>✓ Similar sleep schedule</span></div></div>
        </div>
      </section>

      <section className="safety-section shell" id="safety">
        <span className="eyebrow">TRUST, BUILT IN</span><h2>A safer way to find your next home</h2>
        <div className="steps"><article><span>01</span><h3>Create your profile</h3><p>Tell us what you need and how you like to live.</p></article><article><span>02</span><h3>Browse verified options</h3><p>See clear details, trust signals, and real compatibility.</p></article><article><span>03</span><h3>Connect safely</h3><p>Chat in Abro before deciding to meet or view a property.</p></article></div>
        <aside className="safety-note"><strong>Safety first:</strong> Always view a property and verify the person before sending money.</aside>
      </section>

      <footer><div className="shell footer-inner"><a className="brand brand-footer" href="#top"><span className="brand-mark">A</span><span>abro</span></a><p>Finding the right place—and the right people—should feel this simple.</p><span>Made for Ethiopia</span></div></footer>
    </main>
  );
}
