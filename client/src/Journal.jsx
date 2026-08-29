import { useParams, Link, useNavigate } from 'react-router-dom'
import editorialImg from '../assests/WhatsApp Image 2026-08-24 at 11.39.23 PM (1).jpeg'
import journalImg from '../assests/WhatsApp Image 2026-08-24 at 11.39.14 PM.jpeg'
import detailImg from '../assests/WhatsApp Image 2026-08-24 at 11.38.10 PM.jpeg'
import Footer from './Footer'
import './Journal.css'

/**
 * ARTICLES — in-code article data structure (lightweight, no CMS)
 * slug: URL-friendly article identifier
 * title: article heading
 * readTime: estimated reading time
 * image: hero image
 * body: article content (markdown-like text)
 */
const ARTICLES = [
  {
    slug: 'art-of-layering',
    title: 'The Art of Layering: Modern Chains & Pendants',
    readTime: '6 min read',
    image: editorialImg,
    body: `Layering jewelry has become an art form in modern fashion. Whether you're combining delicate chains with statement pendants or mixing metals with confidence, the key is intentionality and balance.

Start with a foundation piece — typically a shorter, finer chain that sits close to the neck. Add movement and interest by layering longer pieces beneath it. Vary the pendant styles: a subtle geometric shape paired with an organic form creates visual harmony.

The beauty of layering is that it's personal. There's no single rule beyond what speaks to you. Mix gold with silver if it feels right. Combine vintage pieces with contemporary designs. The story you tell with your jewelry is uniquely yours.

Consider weight and proportion. Lighter chains support more delicate pendants, while thicker chains can anchor bolder statement pieces. Experiment, adjust, and most importantly — wear what makes you feel confident and beautiful.`
  },
  {
    slug: 'sterling-silver-vs-gold-vermeil',
    title: '925 Sterling Silver vs. Gold Vermeil: Care & Longevity',
    readTime: '4 min read',
    image: journalImg,
    body: `Understanding the materials in your jewelry ensures you can care for them properly and enjoy them for years to come.

925 Sterling Silver is an alloy containing 92.5% pure silver and 7.5% other metals (typically copper). It's durable, affordable, and develops a beautiful patina over time. Sterling silver requires occasional polishing to maintain its shine, but this care ritual is part of its charm.

Gold Vermeil is a layer of gold plating over a sterling silver base. It offers the warmth of gold with the durability of silver underneath. Vermeil typically lasts 1-3 years with proper care, depending on wear and maintenance.

Care tips:
- Store in a cool, dry place away from moisture
- Use a soft cloth to polish, never abrasive materials
- Avoid chlorine and harsh chemicals
- For gold vermeil, remove before swimming or showering when possible
- Consider professional cleaning once a year

Both materials reward mindful care and regular wear. The more you wear your jewelry, the more it becomes part of your story.`
  },
  {
    slug: 'behind-the-design',
    title: 'Behind the Design: Geometry & Minimalist Forms',
    readTime: '5 min read',
    image: detailImg,
    body: `Minimalism in jewelry design isn't about doing less — it's about doing exactly what's necessary to create impact.

Geometry provides the framework for minimalist design. A perfect circle, a clean line, a precise angle — these elements create visual clarity and timeless appeal. Unlike trends that come and go, geometric forms remain contemporary across decades.

The design philosophy behind our pieces starts with constraint. What if we remove every unnecessary element? What remains should be beautiful enough to stand alone. A cuff doesn't need ornament; its form is the ornament. A pendant gains power through proportion, not complexity.

This approach demands precision in execution. Every measurement matters. The thickness of a band, the angle of a cut, the placement of a stone — these details compound to create a piece that feels inevitable, as if it was always meant to exist in exactly this form.

When you wear minimalist jewelry, you're not making a loud statement. You're making a quiet one. You're saying: I know what I like, and I don't need excess to feel beautiful. That confidence is the real luxury.`
  },
]

/**
 * Journal listing page
 */
function JournalListing() {
  return (
    <main className="journal">
      <header className="journal__hero">
        <p className="journal__eyebrow">The journal / notes on adornment</p>
        <h1>A point<br />of view.</h1>
        <p>Stories on material, form, and the rituals that make a piece yours.</p>
      </header>
      <section className="journal__grid">
        {ARTICLES.map((article) => (
          <article className="journal-card" key={article.slug}>
            <Link to={`/journal/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="journal-card__image"><img src={article.image} alt="" loading="lazy" /></div>
              <p className="journal-card__meta">Editorial · {article.readTime}</p>
              <h2>{article.title}</h2>
            </Link>
            <Link to={`/journal/${article.slug}`} className="journal-card__read">
              Read story <span>↗</span>
            </Link>
          </article>
        ))}
      </section>
      <Footer />
    </main>
  )
}

/**
 * Individual article page
 */
function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const article = ARTICLES.find(a => a.slug === slug)

  if (!article) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Article not found.</p>
        <button className="btn" onClick={() => navigate('/journal')}>← Back to Journal</button>
      </div>
    )
  }

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button 
        className="pd__back" 
        onClick={() => navigate('/journal')} 
        type="button"
        style={{ marginBottom: '2rem' }}
      >
        ← Back to Journal
      </button>

      <article>
        <div style={{ marginBottom: '2rem' }}>
          <img src={article.image} alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '2rem' }} />
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
            Editorial · {article.readTime}
          </p>
          <h1 style={{ marginBottom: '1.5rem' }}>{article.title}</h1>
        </div>

        <div style={{ lineHeight: 1.8, color: '#333' }}>
          {article.body.split('\n\n').map((paragraph, idx) => (
            <p key={idx} style={{ marginBottom: '1.5rem' }}>
              {paragraph.split('\n').map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line}
                  {lineIdx < paragraph.split('\n').length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      </article>

      <div style={{ borderTop: '1px solid #eee', marginTop: '3rem', paddingTop: '2rem', textAlign: 'center' }}>
        <Link to="/journal" style={{ textDecoration: 'underline' }}>← Back to All Articles</Link>
      </div>

      <Footer />
    </main>
  )
}

/**
 * Router wrapper — decides between listing and detail view
 */
export default function JournalRouter() {
  const { slug } = useParams()
  return slug ? <ArticleDetail /> : <JournalListing />
}
