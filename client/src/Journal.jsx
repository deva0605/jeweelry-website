import editorialImg from '../assests/WhatsApp Image 2026-08-24 at 11.39.23 PM (1).jpeg'
import journalImg from '../assests/WhatsApp Image 2026-08-24 at 11.39.14 PM.jpeg'
import detailImg from '../assests/WhatsApp Image 2026-08-24 at 11.38.10 PM.jpeg'
import Footer from './Footer'
import './Journal.css'

const ARTICLES = [
  ['The Art of Layering: Modern Chains & Pendants', '6 min read', editorialImg],
  ['925 Sterling Silver vs. Gold Vermeil: Care & Longevity', '4 min read', journalImg],
  ['Behind the Design: Geometry & Minimalist Forms', '5 min read', detailImg],
]

export default function Journal() {
  return (
    <main className="journal">
      <header className="journal__hero">
        <p className="journal__eyebrow">The journal / notes on adornment</p>
        <h1>A point<br />of view.</h1>
        <p>Stories on material, form, and the rituals that make a piece yours.</p>
      </header>
      <section className="journal__grid">
        {ARTICLES.map(([title, readTime, image]) => (
          <article className="journal-card" key={title}>
            <div className="journal-card__image"><img src={image} alt="" loading="lazy" /></div>
            <p className="journal-card__meta">Editorial · {readTime}</p>
            <h2>{title}</h2>
            <button className="journal-card__read" type="button" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              Read story <span>↗</span>
            </button>
          </article>
        ))}
      </section>
      <Footer />
    </main>
  )
}
