import Image from 'next/image';
import styles from './page.module.css';
import RigidMascot from './components/RigidMascot';

export const revalidate = 3600;

type Installer = {
  platform: string;
  filename: string;
  displayName: string;
  downloadUrl: string;
  fileSize: number;
};

type ReleaseData = {
  version: string;
  pubDate: string;
  installers: Installer[];
};

type ReleaseResponse = {
  success: boolean;
  data?: ReleaseData;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unreleased';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

async function getLatestRelease(): Promise<ReleaseResponse | null> {
  try {
    const response = await fetch('https://oasis.dterminal.net/rigid/releases/latest', {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as ReleaseResponse;
    if (!data.success) return null;
    return data;
  } catch {
    return null;
  }
}

// The Rigid Icon component - used purposefully, not scattered
function RigidIcon({ className = '', size = 130 }: { className?: string; size?: number }) {
  const scale = size / 130;
  return (
    <svg
      width={size}
      height={Math.round(113 * scale)}
      viewBox="0 0 130 113"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Top face - white */}
      <path d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z" fill="white"/>
      {/* Left face - black/dark */}
      <path d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z" fill="#0a0a0a"/>
      {/* Right face - yellow */}
      <path d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z" fill="#FACC15"/>
      {/* Right eye - white outer */}
      <path d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z" fill="white" stroke="white" strokeWidth="0.272224"/>
      {/* Right eye - black pupil */}
      <path d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="0.126582"/>
      {/* Left eye - white outer */}
      <path d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z" fill="white" stroke="white" strokeWidth="0.272224"/>
      {/* Left eye - black pupil */}
      <path d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="0.126582"/>
    </svg>
  );
}

export default async function HomePage() {
  const release = await getLatestRelease();
  const installers = release?.data?.installers ?? [];

  return (
    <div className={styles.page}>
      {/* Ambient background effects */}
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.gridOverlay} aria-hidden="true" />

      {/* Navigation */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navBrand}>
            <RigidIcon size={28} />
            <span>Rigid</span>
          </a>
          <nav className={styles.navLinks}>
            <a href="#manifesto">Why</a>
            <a href="#product">Product</a>
            <a href="#download">Download</a>
          </nav>
          <a className={styles.navCta} href="#download">
            Get Rigid
          </a>
        </div>
      </header>

      <main>
        {/* Hero Section - The Big Statement */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            {/* The Rigid mascot - ONE powerful placement with motion system */}
            <div className={styles.heroIcon}>
              <RigidMascot size={180} interactive />
            </div>

            <div className={styles.heroText}>
              <div className={styles.heroBadge}>
                <span className={styles.badgePulse} />
                Human-in-the-loop toolkit
              </div>

              <h1 className={styles.heroTitle}>
                AI writes the code.<br/>
                <span className={styles.heroAccent}>You sculpt it into something real.</span>
              </h1>

              <p className={styles.heroSubtitle}>
                Rigid is the missing layer between AI-generated code and production-ready software.
                Explore what agents built, document what matters, and ship with human-level intent.
              </p>

              <div className={styles.heroActions}>
                <a href="#download" className={styles.primaryBtn}>
                  <span>Download for Free</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <a href="#product" className={styles.secondaryBtn}>
                  See How It Works
                </a>
              </div>
            </div>
          </div>

          {/* Hero Screenshot - Cinematic presentation */}
          <div className={styles.heroShowcase}>
            <div className={styles.showcaseFrame}>
              <div className={styles.showcaseImage}>
                <Image
                  src="/brand/screenshots/Rigid's home view where You have access to all your apps.png"
                  alt="Rigid home view showing unified access to all your apps"
                  width={1200}
                  height={750}
                  priority
                />
              </div>
            </div>
            {/* Floating accent screenshots */}
            <div className={styles.floatingScreenshot1}>
              <Image
                src="/brand/screenshots/Interacting with Rigid's AI Interface.png"
                alt="AI collaboration interface"
                width={280}
                height={175}
              />
            </div>
            <div className={styles.floatingScreenshot2}>
              <Image
                src="/brand/screenshots/Changing Themes in Rigid's theme picker.png"
                alt="Theme customization"
                width={220}
                height={138}
              />
            </div>
          </div>
        </section>

        {/* Manifesto Section - The Problem We Solve */}
        <section id="manifesto" className={styles.manifesto}>
          <div className={styles.manifestoInner}>
            <div className={styles.manifestoLabel}>The shift</div>
            <h2 className={styles.manifestoTitle}>
              Development is no longer about writing code.
              <br />
              <span className={styles.manifestoFade}>It&apos;s about directing intent.</span>
            </h2>
            <div className={styles.manifestoBody}>
              <p>
                AI agents can generate entire applications. They scaffold features, write tests,
                and deploy infrastructure. But what they produce is a rough draft, not a finished product.
              </p>
              <p>
                The gap between &quot;generated&quot; and &quot;shippable&quot; is where human judgment lives.
                Rigid fills that gap with tools built for a new kind of developer:
                <strong> the sculptor, not the scribe.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Value Props - Three Pillars */}
        <section className={styles.pillars}>
          <div className={styles.pillarsInner}>
            <div className={styles.pillar}>
              <div className={styles.pillarNumber}>01</div>
              <h3 className={styles.pillarTitle}>Explore</h3>
              <p className={styles.pillarBody}>
                Map what the agents built. Navigate every surface, trace every decision,
                and maintain a living exploration log of your inherited codebase.
              </p>
            </div>
            <div className={styles.pillarDivider} />
            <div className={styles.pillar}>
              <div className={styles.pillarNumber}>02</div>
              <h3 className={styles.pillarTitle}>Document</h3>
              <p className={styles.pillarBody}>
                Capture findings as you learn. Annotate screenshots, record video evidence,
                and create a traceable narrative from chaos to clarity.
              </p>
            </div>
            <div className={styles.pillarDivider} />
            <div className={styles.pillar}>
              <div className={styles.pillarNumber}>03</div>
              <h3 className={styles.pillarTitle}>Deliver</h3>
              <p className={styles.pillarBody}>
                Ship with confidence. Validate edge cases, verify intent, and close the loop
                on what matters before your users feel the gaps.
              </p>
            </div>
          </div>
        </section>

        {/* Product Showcase - The Cinematic Gallery */}
        <section id="product" className={styles.product}>
          <div className={styles.productHeader}>
            <div className={styles.productLabel}>The toolkit</div>
            <h2 className={styles.productTitle}>
              Every surface built for focused analysis
            </h2>
            <p className={styles.productSubtitle}>
              Rigid keeps you grounded in what the agents produced. Review tasks, annotate issues,
              and capture decisions directly where the work happens.
            </p>
          </div>

          {/* Feature 1 - Command Center */}
          <div className={styles.featureBlock}>
            <div className={styles.featureContent}>
              <div className={styles.featureTag}>Home View</div>
              <h3 className={styles.featureTitle}>Your command center</h3>
              <p className={styles.featureDesc}>
                Start with a clear map of every app, surface, and exploration thread.
                See what you&apos;re working with before diving into the details.
              </p>
              <ul className={styles.featureList}>
                <li>Unified app overview</li>
                <li>Quick access to recent work</li>
                <li>Status at a glance</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <div className={styles.featureScreenshot}>
                <Image
                  src="/brand/screenshots/Rigid's home view where You have access to all your apps.png"
                  alt="Rigid home view"
                  width={600}
                  height={375}
                />
              </div>
            </div>
          </div>

          {/* Feature 2 - Annotation */}
          <div className={`${styles.featureBlock} ${styles.featureReverse}`}>
            <div className={styles.featureContent}>
              <div className={styles.featureTag}>Precision Annotation</div>
              <h3 className={styles.featureTitle}>Mark everything with intent</h3>
              <p className={styles.featureDesc}>
                Annotate screenshots and video evidence so every issue has context.
                No more &quot;what was this about?&quot; moments in code review.
              </p>
              <ul className={styles.featureList}>
                <li>Screenshot markup</li>
                <li>Video annotations</li>
                <li>Bug tracking integration</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <div className={styles.featureScreenshotStack}>
                <div className={styles.stackPrimary}>
                  <Image
                    src="/brand/screenshots/Browsing through a video and adding anotations for errors in rigid's video annotation editro.png"
                    alt="Video annotation editor"
                    width={600}
                    height={375}
                  />
                </div>
                <div className={styles.stackSecondary}>
                  <Image
                    src="/brand/screenshots/Circling a screenshot taken with rigin in the screenshot editore.png"
                    alt="Screenshot markup tool"
                    width={300}
                    height={188}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 - Demo Videos */}
          <div className={styles.featureBlock}>
            <div className={styles.featureContent}>
              <div className={styles.featureTag}>Demo Editor</div>
              <h3 className={styles.featureTitle}>Create release-ready walkthroughs</h3>
              <p className={styles.featureDesc}>
                Craft polished video demos that keep stakeholders aligned.
                Record, edit, and share without leaving the review flow.
              </p>
              <ul className={styles.featureList}>
                <li>Screen recording</li>
                <li>Trim and annotate</li>
                <li>One-click sharing</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <div className={styles.featureScreenshot}>
                <Image
                  src="/brand/screenshots/Creating a demo video for a Product Launch in Rigid's demo video editor.png"
                  alt="Demo video editor"
                  width={600}
                  height={375}
                />
              </div>
            </div>
          </div>

          {/* Feature 4 - AI Collaboration */}
          <div className={`${styles.featureBlock} ${styles.featureReverse}`}>
            <div className={styles.featureContent}>
              <div className={styles.featureTag}>AI Collaborator</div>
              <h3 className={styles.featureTitle}>An assistant that gets the context</h3>
              <p className={styles.featureDesc}>
                Rigid&apos;s AI understands your project structure. Ask questions,
                get explanations, and communicate intent clearly across your team.
              </p>
              <ul className={styles.featureList}>
                <li>Project-aware responses</li>
                <li>Code explanation</li>
                <li>Intent documentation</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <div className={styles.featureScreenshot}>
                <Image
                  src="/brand/screenshots/Interacting with Rigid's AI Interface.png"
                  alt="AI collaboration interface"
                  width={600}
                  height={375}
                />
              </div>
            </div>
          </div>

          {/* Feature 5 - Customization */}
          <div className={styles.featureBlock}>
            <div className={styles.featureContent}>
              <div className={styles.featureTag}>Customization</div>
              <h3 className={styles.featureTitle}>Make it yours</h3>
              <p className={styles.featureDesc}>
                Choose from 24+ themes and tune the workspace to your preferences.
                Adjust surface density without losing focus on what matters.
              </p>
              <ul className={styles.featureList}>
                <li>24+ built-in themes</li>
                <li>Adjustable density</li>
                <li>Keyboard-first workflow</li>
              </ul>
            </div>
            <div className={styles.featureMedia}>
              <div className={styles.featureScreenshot}>
                <Image
                  src="/brand/screenshots/Changing Themes in Rigid's theme picker.png"
                  alt="Theme picker"
                  width={600}
                  height={375}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className={styles.stats}>
          <div className={styles.statsInner}>
            <div className={styles.stat}>
              <div className={styles.statValue}>24+</div>
              <div className={styles.statLabel}>Built-in themes</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>3</div>
              <div className={styles.statLabel}>Platforms supported</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>100%</div>
              <div className={styles.statLabel}>Free to use</div>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className={styles.download}>
          <div className={styles.downloadInner}>
            <div className={styles.downloadHeader}>
              <h2 className={styles.downloadTitle}>
                Ready to sculpt?
              </h2>
              <p className={styles.downloadSubtitle}>
                {release?.data
                  ? `Version ${release.data.version} released ${formatDate(release.data.pubDate)}`
                  : 'Download Rigid and start shipping AI-built software with confidence.'}
              </p>
            </div>

            <div className={styles.downloadGrid}>
              {installers.length > 0 ? (
                installers.map((installer) => (
                  <a
                    href={installer.downloadUrl}
                    className={styles.downloadCard}
                    key={installer.platform}
                  >
                    <div className={styles.downloadPlatform}>
                      {installer.platform === 'darwin-aarch64' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                      )}
                      {installer.platform === 'windows-x86_64' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
                        </svg>
                      )}
                      {installer.platform === 'linux-x86_64' && (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533.19-.135.4-.198.629-.198zm-4.153.148c.133-.016.277.005.393.064.206.088.377.222.522.4.145.178.264.377.358.59.09.215.15.46.165.724.02.263-.032.513-.114.727-.087.227-.2.46-.366.62-.164.158-.353.27-.578.338-.224.068-.443.072-.67.02-.123-.032-.241-.08-.357-.143-.105.128-.234.285-.389.47l-.068.06c-.152.132-.32.272-.477.379-.102-.063-.222-.132-.34-.195a1.732 1.732 0 01-.31-.2c-.18-.137-.31-.319-.397-.527-.085-.21-.13-.449-.088-.702.023-.14.07-.285.15-.422l-.014-.011c-.222-.186-.417-.38-.56-.581a1.19 1.19 0 01-.232-.627c-.001-.18.05-.385.18-.512.051-.048.108-.088.17-.118h.02c.063-.02.132-.058.197-.058.257-.02.505.07.697.204.19.134.314.332.395.527.047.133.073.263.078.4v.018a.834.834 0 01-.015.174c.125.025.256.062.386.096.106.027.212.06.318.09a.77.77 0 00.009-.16v-.019c.002-.16-.033-.318-.1-.472a1.152 1.152 0 00-.265-.385c.069-.065.135-.134.209-.197l.035-.03c.09-.068.18-.132.281-.185a.908.908 0 01.37-.107z"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.downloadInfo}>
                      <div className={styles.downloadName}>{installer.displayName}</div>
                      <div className={styles.downloadMeta}>
                        {formatBytes(installer.fileSize)}
                      </div>
                    </div>
                    <div className={styles.downloadArrow}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 15h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </a>
                ))
              ) : (
                <>
                  <div className={styles.downloadCardPlaceholder}>
                    <div className={styles.downloadPlatform}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                    </div>
                    <div className={styles.downloadInfo}>
                      <div className={styles.downloadName}>macOS</div>
                      <div className={styles.downloadMeta}>Coming soon</div>
                    </div>
                  </div>
                  <div className={styles.downloadCardPlaceholder}>
                    <div className={styles.downloadPlatform}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
                      </svg>
                    </div>
                    <div className={styles.downloadInfo}>
                      <div className={styles.downloadName}>Windows</div>
                      <div className={styles.downloadMeta}>Coming soon</div>
                    </div>
                  </div>
                  <div className={styles.downloadCardPlaceholder}>
                    <div className={styles.downloadPlatform}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533.19-.135.4-.198.629-.198zm-4.153.148c.133-.016.277.005.393.064.206.088.377.222.522.4.145.178.264.377.358.59.09.215.15.46.165.724.02.263-.032.513-.114.727-.087.227-.2.46-.366.62-.164.158-.353.27-.578.338-.224.068-.443.072-.67.02-.123-.032-.241-.08-.357-.143-.105.128-.234.285-.389.47l-.068.06c-.152.132-.32.272-.477.379-.102-.063-.222-.132-.34-.195a1.732 1.732 0 01-.31-.2c-.18-.137-.31-.319-.397-.527-.085-.21-.13-.449-.088-.702.023-.14.07-.285.15-.422l-.014-.011c-.222-.186-.417-.38-.56-.581a1.19 1.19 0 01-.232-.627c-.001-.18.05-.385.18-.512.051-.048.108-.088.17-.118h.02c.063-.02.132-.058.197-.058.257-.02.505.07.697.204.19.134.314.332.395.527.047.133.073.263.078.4v.018a.834.834 0 01-.015.174c.125.025.256.062.386.096.106.027.212.06.318.09a.77.77 0 00.009-.16v-.019c.002-.16-.033-.318-.1-.472a1.152 1.152 0 00-.265-.385c.069-.065.135-.134.209-.197l.035-.03c.09-.068.18-.132.281-.185a.908.908 0 01.37-.107z"/>
                      </svg>
                    </div>
                    <div className={styles.downloadInfo}>
                      <div className={styles.downloadName}>Linux</div>
                      <div className={styles.downloadMeta}>Coming soon</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.downloadGithub}>
              <a
                href="https://github.com/porkytheblack/taka"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.githubBtn}
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={styles.starIcon}>
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/>
                </svg>
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <RigidIcon size={24} />
            <span>Rigid</span>
          </div>
          <div className={styles.footerTagline}>
            The human-in-the-loop system for AI-built software.
          </div>
        </div>
        <div className={styles.footerBottom}>
          <div className={styles.footerProductBy}>
            <span>A product by</span>
            <a
              href="https://dterminal.net"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerDterminal}
            >
              <Image
                src="/brand/dterminal-typography.png"
                alt="dterminal"
                width={100}
                height={24}
              />
            </a>
          </div>
          <div className={styles.footerCopyright}>
            &copy; {new Date().getFullYear()} dterminal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
