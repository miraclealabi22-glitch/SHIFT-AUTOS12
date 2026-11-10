import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";
import ShiftLogo from "@/components/brand/shift-logo";
import CinematicHero from "@/components/site/cinematic-hero";
import { getManufacturers, getVehicles } from "@/lib/catalog/catalog";

export const instant = false;

export default async function Home() {
  const [vehicles, manufacturers] = await Promise.all([getVehicles(), getManufacturers()]);
  const featuredVehicles = vehicles.items.slice(0, 3);
  const featuredManufacturers = manufacturers.items.slice(0, 4);

  return (
    <>
      <SiteHeader cinematic />
      <main id="main-content">
        <CinematicHero />
        <section className="manifesto landing-section" id="brand" aria-labelledby="manifesto-title">
          <p className="eyebrow">A DIFFERENT POINT OF VIEW</p>
          <h2 id="manifesto-title" data-landing-reveal>Discover.<br />Experience.<br />Share.</h2>
          <p data-landing-reveal>Machines are more than movement. They are design, engineering and the people who bring them to life. SHIFT is a place to look closer at all of it.</p>
        </section>
        <section className="landing-collection" aria-labelledby="collection-title">
          <div className="landing-section-heading" data-landing-reveal>
            <div>
              <p className="catalog-eyebrow">THE SHIFT ARCHIVE / SELECTED MACHINES</p>
              <h2 id="collection-title">A closer look at remarkable machines.</h2>
            </div>
            <Link className="landing-inline-link" href="/login">VIEW THE ARCHIVE <span aria-hidden="true">↗</span></Link>
          </div>
          {featuredVehicles.length ? (
            <div className="landing-vehicle-grid">
              {featuredVehicles.map((vehicle) => (
                <Link className="landing-vehicle" href={`/vehicles/${vehicle.slug}`} key={vehicle.id}>
                  <span className="landing-vehicle__image">
                    {vehicle.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={vehicle.images[0].url} alt={vehicle.images[0].alt} loading="lazy" />
                    ) : <span>IMAGE UNAVAILABLE</span>}
                  </span>
                  <span className="landing-vehicle__maker">{vehicle.manufacturerName}</span>
                  <strong>{vehicle.modelName}</strong>
                  {(vehicle.generation || vehicle.variant || vehicle.edition) && (
                    <span className="landing-vehicle__detail">
                      {[vehicle.generation, vehicle.variant, vehicle.edition].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <article className="landing-feature" data-landing-reveal>
              <div className="landing-feature__image">
                <Image
                  src="/media/auth/shift-ferrari-black-studio-poster.webp"
                  alt="A red sports car photographed in a dark studio"
                  fill
                  sizes="(max-width: 700px) 100vw, 68vw"
                />
                <span>VISUAL STUDY / SHIFT MEDIA</span>
              </div>
              <div className="landing-feature__copy">
                <p className="catalog-eyebrow">MACHINE / FORM / PRESENCE</p>
                <h3>A closer look changes everything.</h3>
                <p>Vehicle profiles will appear here as the SHIFT archive grows. Until then, explore the wider automotive world.</p>
                <Link className="landing-inline-link" href="/login">DISCOVER VEHICLES <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          )}
        </section>
        {featuredManufacturers.length > 0 && (
          <section className="landing-makers" aria-labelledby="makers-title">
            <div className="landing-makers__heading" data-landing-reveal>
              <div>
                <p className="catalog-eyebrow">MAKERS / FROM THE SHIFT DIRECTORY</p>
                <h2 id="makers-title">Different origins.<br />Different points of view.</h2>
              </div>
              <Link className="landing-inline-link" href="/login">EXPLORE MANUFACTURERS <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="landing-makers__list">
              {featuredManufacturers.map((manufacturer, index) => (
                <Link
                  className="landing-makers__item"
                  href={`/discover/brands/${manufacturer.slug}`}
                  key={manufacturer.id}
                  data-landing-reveal
                >
                  <span className="landing-makers__index">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{manufacturer.name}</strong>
                  <span className="landing-makers__arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="landing-culture" aria-labelledby="culture-title">
          <div className="landing-culture__copy" data-landing-reveal>
            <p className="catalog-eyebrow">AUTOMOTIVE CULTURE / PEOPLE FIRST</p>
            <h2 id="culture-title">Built around<br />what moves us.</h2>
            <p>Meet the enthusiasts, builders and photographers who see more in every machine. Their stories belong here.</p>
            <Link className="landing-inline-link" href="/login">STEP INTO THE COMMUNITY <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="landing-culture__index" data-landing-reveal aria-hidden="true">
            <span className="landing-culture__number">02</span>
            <span>PEOPLE<br />MAKE THE CULTURE</span>
          </div>
        </section>
        <section className="landing-journal" aria-labelledby="journal-title">
          <div className="landing-journal__number" data-landing-reveal>SHIFT / JOURNAL</div>
          <div className="landing-journal__copy" data-landing-reveal>
            <p className="catalog-eyebrow">STORIES / IDEAS / PERSPECTIVES</p>
            <h2 id="journal-title">Every machine<br />has a story.</h2>
            <p>Considered stories on the machines, ideas and people shaping what comes next.</p>
            <Link className="landing-inline-link" href="/login">ENTER THE JOURNAL <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="landing-journal__availability">
            <span>THE SHIFT JOURNAL</span>
            <span>EDITORIAL STORIES APPEAR HERE WHEN PUBLISHED</span>
          </div>
        </section>
        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <p className="catalog-eyebrow">A NEW PERSPECTIVE STARTS HERE</p>
          <h2 id="landing-cta-title" data-landing-reveal>LOOK CLOSER.<br />MOVE DIFFERENTLY.</h2>
          <Link className="text-link" href="/login"><span>ENTER SHIFT</span><span aria-hidden="true">↗</span></Link>
        </section>
      </main>
      <footer className="site-footer" id="footer">
        <div className="footer-top">
          <Link className="brand-link" href="/login" aria-label="SHIFT home">
            <ShiftLogo size="small" alt="SHIFT home" />
          </Link>
          <p>LOOK CLOSER. MOVE DIFFERENTLY.</p>
          <a className="back-to-top" href="#main-content" aria-label="Back to top">↑</a>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <Link href="/login">Discover</Link>
          <Link href="/login">Reels</Link>
          <Link href="/login">Community</Link>
          <Link href="/login">Journal</Link>
        </nav>
        <div className="footer-bottom">
          <span>© 2026 SHIFT</span><span>DISCOVER. EXPERIENCE. SHARE.</span><Link href="/login">EXPLORE SHIFT</Link>
        </div>
      </footer>
    </>
  );
}
