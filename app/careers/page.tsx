import type { Metadata } from "next";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";
import CareersClient from "./CareersClient";
import styles from "./careers.module.css";

export const metadata: Metadata = {
  title: "Careers",
  description: "Build the next great night out. Explore remote opportunities and marketing internships at FunctionHour.",
  alternates: { canonical: "https://functionhour.com/careers" },
  openGraph: { title: "Build what brings people together | FunctionHour Careers", description: "Explore 10 team roles and two marketing internship openings at FunctionHour.", url: "https://functionhour.com/careers", type: "website" },
  twitter: { card: "summary_large_image", title: "FunctionHour Careers", description: "Build what brings people together." },
};

export default function CareersPage() {
  return <main className={styles.page}>
    <DiscoveryNav />
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>FUNCTIONHOUR / CAREERS</p>
        <h1>Build what<br />brings people<br /><span>together.</span></h1>
        <p className={styles.intro}>Great experiences start with people who care. Help us make finding your next event—and creating one—feel effortless.</p>
        <a className={styles.primary} href="#opportunities">Find your role <span aria-hidden="true">↗</span></a>
        <p className={styles.heroNote}>Remote team. Real ownership. A product made for real life.</p>
      </div>
      <div className={styles.art} aria-hidden="true">
        <div className={styles.orbitOne} /><div className={styles.orbitTwo} />
        <div className={styles.core}>MAKE<br />IT<br /><em>HAPPEN.</em></div>
        <span className={styles.planetOne}>BUILD</span><span className={styles.planetTwo}>CONNECT</span><span className={styles.planetThree}>CREATE</span>
        <span className={styles.spark}>✦</span>
      </div>
    </section>
    <section className={styles.principles} aria-labelledby="team-heading">
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>SMALL TEAM. BIG POSSIBILITY.</p><h2 id="team-heading">Your work should<br />mean something.</h2><p>We’re an early-stage event platform. You’ll help shape how people discover experiences, how organizers grow, and how a community comes together.</p></div>
      <div className={styles.valueGrid}>{[
        ["01", "Make it useful.", "Solve a real problem for attendees and organizers. Keep the experience clear, thoughtful, and easy to use."],
        ["02", "Own the outcome.", "Bring ideas, test them, and follow through. Good work is more than a handoff—it’s seeing what happens next."],
        ["03", "Build together.", "Share feedback early. Stay curious. Make room for different perspectives and better ways to work."],
      ].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <CareersClient />
    <section className={styles.process} aria-labelledby="process-heading"><div><p className={styles.eyebrow}>A HUMAN PROCESS</p><h2 id="process-heading">Show us how<br />you think.</h2></div><ol><li><strong>Introduce yourself</strong><p>Send a résumé or portfolio and a short note about the role that interests you.</p></li><li><strong>Meet the team</strong><p>Talk through your experience, ideas, availability, and the opportunity. Compensation and engagement terms will be discussed before you commit.</p></li><li><strong>Find the fit</strong><p>Align on responsibilities, expectations, and next steps. For internships, confirm your school’s requirements before starting.</p></li></ol></section>
    <section className={styles.lastCall}><h2>Different background?<br /><span>Bring it.</span></h2><p>Don’t see your exact fit? Tell us what you could help build. If you need an accommodation during the application process, email our team.</p><a href="mailto:operations@functionhour.com?subject=FunctionHour%20careers%20%E2%80%94%20Introduction">Say hello ↗</a></section>
    <Footer />
  </main>;
}
