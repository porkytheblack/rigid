import { useState } from 'react';

export default function RigidMotionSystem() {
  const [activeSection, setActiveSection] = useState('principles');
  const [activeStoryboard, setActiveStoryboard] = useState(0);

  const sections = [
    { id: 'principles', label: 'Motion Principles' },
    { id: 'mascot', label: 'Rigid Character' },
    { id: 'intro', label: 'Intro Video' },
    { id: 'ui', label: 'UI Motion' },
  ];

  const storyboardFrames = [
    {
      time: '0:00',
      visual: 'Black screen → single pixel appears',
      motion: 'Fade in, tiny scale up',
      text: null,
      concept: 'Origin point. The spark of intent.'
    },
    {
      time: '0:02',
      visual: 'Pixel explodes into chaotic code fragments',
      motion: 'Burst outward, fragments tumbling in 3D space',
      text: '"Development used to mean one thing"',
      concept: 'The old world: precise, fragmented, overwhelming.'
    },
    {
      time: '0:05',
      visual: 'Code fragments trying to assemble, jittering',
      motion: 'Magnetic attraction, but unstable — pieces snap then fall',
      text: '"Translate intent into instructions. Precisely."',
      concept: 'The struggle of traditional development.'
    },
    {
      time: '0:08',
      visual: 'Fragments freeze. A hand/cursor appears.',
      motion: 'Everything pauses. Cursor moves with purpose.',
      text: '"That\'s changing."',
      concept: 'The shift. Human agency enters.'
    },
    {
      time: '0:10',
      visual: 'Cursor gestures — fragments begin to FLOW, reshape',
      motion: 'Fluid morphing. Clay-like deformation. Organic.',
      text: '"AI agents can write the code now."',
      concept: 'The new paradigm: directing, not dictating.'
    },
    {
      time: '0:14',
      visual: 'Fragments coalesce into rough Rigid cube shape',
      motion: 'Convergence with overshoot, settling into form',
      text: '"The question is no longer can you express this logic"',
      concept: 'Something recognizable emerging from chaos.'
    },
    {
      time: '0:17',
      visual: 'Hands sculpt the cube — refining edges, smoothing faces',
      motion: 'Each touch creates ripples of refinement',
      text: '"It\'s can you shape what emerges?"',
      concept: 'Iteration as craft. Touch as direction.'
    },
    {
      time: '0:21',
      visual: 'Cube rotates, eyes appear, comes alive',
      motion: 'Subtle breathing begins. Eyes blink. Personality.',
      text: '"We call this sculpting."',
      concept: 'The artifact becomes a collaborator.'
    },
    {
      time: '0:24',
      visual: 'Rigid cube and human silhouette side by side',
      motion: 'Both turn to face the same direction (forward)',
      text: null,
      concept: 'Partnership. Shared vision.'
    },
    {
      time: '0:26',
      visual: 'Pull back to reveal Rigid UI interface surrounding them',
      motion: 'UI elements fade in with staggered timing',
      text: '"Rigid"',
      concept: 'The tool that enables this workflow.'
    },
    {
      time: '0:28',
      visual: 'Tagline appears, Rigid logo locks up',
      motion: 'Type on with subtle tracking animation',
      text: '"Sculpt software with AI"',
      concept: 'Clear value prop. End frame.'
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(1deg); }
        }
        
        @keyframes sculpt {
          0% { transform: scale(1) rotate(0deg); border-radius: 4px; }
          25% { transform: scale(1.05, 0.95) rotate(-2deg); border-radius: 8px; }
          50% { transform: scale(0.95, 1.05) rotate(2deg); border-radius: 12px; }
          75% { transform: scale(1.02, 0.98) rotate(-1deg); border-radius: 6px; }
          100% { transform: scale(1) rotate(0deg); border-radius: 4px; }
        }
        
        @keyframes emerge {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        
        @keyframes iterate {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        
        @keyframes refine {
          0% { clip-path: polygon(10% 0%, 90% 5%, 95% 90%, 5% 95%); }
          50% { clip-path: polygon(5% 2%, 95% 0%, 98% 95%, 2% 98%); }
          100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
        }

        @keyframes slideIn {
          0%, 100% { transform: translateX(100%); opacity: 0; }
          50% { transform: translateX(0); opacity: 1; }
        }
        
        .anim-float { animation: float 3s ease-in-out infinite; }
        .anim-sculpt { animation: sculpt 2s ease-in-out infinite; }
        .anim-emerge { animation: emerge 1s ease-out forwards; }
        .anim-iterate { animation: iterate 1.5s ease-in-out infinite; }
        .anim-refine { animation: refine 3s ease-in-out infinite; }
        .anim-slide { animation: slideIn 2s ease-out infinite; }
      `}</style>

      {/* Header */}
      <header className="border-b border-neutral-800 px-8 py-5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <svg width="28" height="24" viewBox="0 0 130 113" fill="none">
              <path d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z" fill="white"/>
              <path d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z" fill="#111"/>
              <path d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z" fill="#FACC15"/>
            </svg>
            <span className="font-semibold text-lg">Rigid Motion System</span>
          </div>
          <span className="text-xs text-neutral-500">Motion Design Guide v1.0</span>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-neutral-800 px-8 py-3 sticky top-0 bg-black z-50">
        <div className="flex gap-2 max-w-6xl mx-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                activeSection === section.id
                  ? 'bg-yellow-400 text-black font-medium'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-12">
        
        {/* PRINCIPLES SECTION */}
        {activeSection === 'principles' && (
          <div className="space-y-16">
            <div>
              <h1 className="text-4xl font-bold mb-4">Motion Principles</h1>
              <p className="text-neutral-400 max-w-2xl text-lg">
                Rigid's motion language embodies the shift from writing code to sculpting software. 
                Every animation should feel like <span className="text-yellow-400">intentional shaping</span>, not mechanical execution.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Principle 1: Emergence */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="h-32 flex items-center justify-center mb-6">
                  <div className="flex gap-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-4 h-4 bg-yellow-400 rounded-sm anim-emerge"
                        style={{ 
                          animationDelay: `${i * 0.15}s`,
                          opacity: 0
                        }}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Emergence</h3>
                <p className="text-neutral-500 text-sm mb-4">
                  Elements don't just appear—they emerge from potential into form. 
                  Use blur-to-sharp, scale-up, and fade transitions that feel like materialization.
                </p>
                <code className="text-xs text-yellow-400 bg-neutral-950 px-3 py-1.5 rounded">
                  blur(10px) → blur(0) + scale(0.8→1)
                </code>
              </div>

              {/* Principle 2: Sculpting */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="h-32 flex items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-yellow-400 anim-sculpt" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Sculpting</h3>
                <p className="text-neutral-500 text-sm mb-4">
                  Transformations feel malleable, like clay being shaped. 
                  Slight squash-and-stretch, organic easing, imperfect but intentional movement.
                </p>
                <code className="text-xs text-yellow-400 bg-neutral-950 px-3 py-1.5 rounded">
                  ease-in-out + slight overshoot + organic curves
                </code>
              </div>

              {/* Principle 3: Iteration */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="h-32 flex items-center justify-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 border-2 border-neutral-600 rounded-lg" />
                    <div className="text-neutral-600">→</div>
                    <div className="w-12 h-12 border-2 border-neutral-400 rounded-lg anim-iterate" />
                    <div className="text-neutral-600">→</div>
                    <div className="w-12 h-12 bg-yellow-400 rounded-lg anim-float" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">Iteration</h3>
                <p className="text-neutral-500 text-sm mb-4">
                  Show progression and refinement. States don't just switch—they evolve 
                  through visible intermediate steps. Each iteration adds clarity.
                </p>
                <code className="text-xs text-yellow-400 bg-neutral-950 px-3 py-1.5 rounded">
                  state A → transition → state B (show the journey)
                </code>
              </div>

              {/* Principle 4: Refinement */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="h-32 flex items-center justify-center mb-6">
                  <div className="w-24 h-16 bg-yellow-400 anim-refine" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Refinement</h3>
                <p className="text-neutral-500 text-sm mb-4">
                  Rough becomes smooth. Use morphing clip-paths, softening edges, 
                  and polish animations that show craft being applied.
                </p>
                <code className="text-xs text-yellow-400 bg-neutral-950 px-3 py-1.5 rounded">
                  jagged polygon → smooth rectangle
                </code>
              </div>
            </div>

            {/* Timing Guidelines */}
            <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
              <h3 className="text-xl font-semibold mb-6">Timing & Easing</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-yellow-400 text-2xl font-bold mb-1">200-400ms</div>
                  <div className="text-sm text-neutral-300">Micro-interactions</div>
                  <div className="text-xs text-neutral-500 mt-1">Hovers, toggles, small state changes</div>
                </div>
                <div>
                  <div className="text-yellow-400 text-2xl font-bold mb-1">400-800ms</div>
                  <div className="text-sm text-neutral-300">Transitions</div>
                  <div className="text-xs text-neutral-500 mt-1">Panel reveals, mode switches, navigation</div>
                </div>
                <div>
                  <div className="text-yellow-400 text-2xl font-bold mb-1">800-1500ms</div>
                  <div className="text-sm text-neutral-300">Statements</div>
                  <div className="text-xs text-neutral-500 mt-1">Intro sequences, major reveals, celebrations</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <div className="text-sm text-neutral-400 mb-2">Preferred Easing</div>
                <code className="text-xs text-yellow-400">
                  cubic-bezier(0.16, 1, 0.3, 1) — "Sculpt ease" — quick start, gentle settle
                </code>
              </div>
            </div>
          </div>
        )}

        {/* MASCOT SECTION */}
        {activeSection === 'mascot' && (
          <div className="space-y-16">
            <div>
              <h1 className="text-4xl font-bold mb-4">Rigid Character</h1>
              <p className="text-neutral-400 max-w-2xl text-lg">
                The Rigid mascot is an isometric cube with personality—a visual metaphor for 
                <span className="text-yellow-400"> the artifact being sculpted</span>. 
                It's both the output and the collaborator.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Character Anatomy */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-xl font-semibold mb-6">Anatomy & Meaning</h3>
                <div className="flex gap-8">
                  <svg width="130" height="113" viewBox="0 0 130 113" fill="none" className="flex-shrink-0">
                    <path d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z" fill="white"/>
                    <path d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z" fill="#171717"/>
                    <path d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z" fill="#FACC15"/>
                    <path d="M92.4905 53.3794L92.5438 39.7694L104.288 32.9462L104.304 46.6232L92.4905 53.3794Z" fill="white" stroke="white" strokeWidth="0.272224"/>
                    <path d="M95.6658 49.2786L95.6906 42.95L101.151 39.7773L101.159 46.137L95.6658 49.2786Z" fill="#171717"/>
                    <path d="M68.9058 66.9988L68.9591 53.3888L80.703 46.5656L80.719 60.2426L68.9058 66.9988Z" fill="white" stroke="white" strokeWidth="0.272224"/>
                    <path d="M72.0811 62.8979L72.1059 56.5694L77.5667 53.3966L77.5741 59.7564L72.0811 62.8979Z" fill="#171717"/>
                  </svg>
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3 items-start">
                      <div className="w-4 h-4 bg-white rounded-sm flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-neutral-200">Top face</div>
                        <div className="text-neutral-500 text-xs">Clarity. The clean slate. Potential.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-4 h-4 bg-neutral-800 border border-neutral-600 rounded-sm flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-neutral-200">Left face</div>
                        <div className="text-neutral-500 text-xs">Depth. The unseen complexity.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-4 h-4 bg-yellow-400 rounded-sm flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-neutral-200">Right face</div>
                        <div className="text-neutral-500 text-xs">Energy. The active side. Where the eyes live.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="w-4 h-4 border-2 border-neutral-400 rounded-full flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-neutral-200">Eyes</div>
                        <div className="text-neutral-500 text-xs">Awareness. The AI that observes and responds.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personality States */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-xl font-semibold mb-6">Emotional States</h3>
                <div className="space-y-4">
                  {[
                    { state: 'Idle', desc: 'Gentle float, slow breathing, occasional blinks', timing: '3s cycle' },
                    { state: 'Observing', desc: 'Eyes tracking, head slight tilt toward focus', timing: 'Real-time' },
                    { state: 'Processing', desc: 'Subtle pulse, faster blinks, slight vibration', timing: '1.5s cycle' },
                    { state: 'Success', desc: 'Bounce + slight spin, eyes widen momentarily', timing: '800ms' },
                    { state: 'Error', desc: 'Horizontal shake, eyes squeeze shut', timing: '600ms' },
                    { state: 'Waiting', desc: 'Slow rock side-to-side, patient expression', timing: '2s cycle' },
                  ].map((item) => (
                    <div key={item.state} className="flex justify-between items-start">
                      <div>
                        <div className="text-neutral-200 text-sm">{item.state}</div>
                        <div className="text-neutral-500 text-xs">{item.desc}</div>
                      </div>
                      <code className="text-xs text-yellow-400">{item.timing}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Eye Behavior */}
            <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
              <h3 className="text-xl font-semibold mb-6">Eye Behavior System</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 bg-neutral-900 rounded-sm" />
                  </div>
                  <div className="text-sm text-neutral-200">Neutral</div>
                  <div className="text-xs text-neutral-500">Center position</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-6 h-1.5 bg-neutral-900 rounded-sm" />
                  </div>
                  <div className="text-sm text-neutral-200">Blink</div>
                  <div className="text-xs text-neutral-500">scaleY: 0.1, 150ms</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center relative">
                    <div className="w-6 h-6 bg-neutral-900 rounded-sm absolute" style={{ transform: 'translate(4px, -2px)' }} />
                  </div>
                  <div className="text-sm text-neutral-200">Looking</div>
                  <div className="text-xs text-neutral-500">±3px offset max</div>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-neutral-900 rounded-sm" />
                  </div>
                  <div className="text-sm text-neutral-200">Wide (surprise)</div>
                  <div className="text-xs text-neutral-500">scale: 1.3, 200ms</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INTRO VIDEO SECTION */}
        {activeSection === 'intro' && (
          <div className="space-y-12">
            <div>
              <h1 className="text-4xl font-bold mb-4">Intro Video Concept</h1>
              <p className="text-neutral-400 max-w-2xl text-lg">
                A ~30 second brand film that visualizes the shift from 
                <span className="text-neutral-200"> "writing code" </span> to 
                <span className="text-yellow-400"> "sculpting software"</span>.
              </p>
            </div>

            {/* Video Specs */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="bg-neutral-900 px-4 py-2 rounded-lg">
                <span className="text-neutral-500">Duration:</span>
                <span className="text-white ml-2">28-32s</span>
              </div>
              <div className="bg-neutral-900 px-4 py-2 rounded-lg">
                <span className="text-neutral-500">Resolution:</span>
                <span className="text-white ml-2">1920×1080 / 4K</span>
              </div>
              <div className="bg-neutral-900 px-4 py-2 rounded-lg">
                <span className="text-neutral-500">FPS:</span>
                <span className="text-white ml-2">60</span>
              </div>
              <div className="bg-neutral-900 px-4 py-2 rounded-lg">
                <span className="text-neutral-500">Tool:</span>
                <span className="text-yellow-400 ml-2">Remotion</span>
              </div>
            </div>

            {/* Storyboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Timeline */}
              <div className="lg:col-span-5 space-y-2">
                <h3 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">Storyboard</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {storyboardFrames.map((frame, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStoryboard(i)}
                      className={`w-full text-left p-3 rounded-lg transition-all text-sm ${
                        activeStoryboard === i
                          ? 'bg-yellow-400 text-black'
                          : 'bg-neutral-900 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs ${activeStoryboard === i ? 'text-black' : 'text-neutral-500'}`}>
                          {frame.time}
                        </span>
                        <span className={activeStoryboard === i ? 'text-black' : 'text-neutral-300'}>
                          {frame.text || frame.visual.split('→')[0].substring(0, 20) + '...'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Detail */}
              <div className="lg:col-span-7">
                <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 sticky top-24">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-3xl font-bold text-yellow-400">
                      {storyboardFrames[activeStoryboard].time}
                    </div>
                    <div className="h-8 w-px bg-neutral-700" />
                    <div className="text-neutral-500 text-sm">
                      Frame {activeStoryboard + 1} of {storyboardFrames.length}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Visual</div>
                      <div className="text-lg text-neutral-200">{storyboardFrames[activeStoryboard].visual}</div>
                    </div>

                    <div>
                      <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Motion</div>
                      <div className="text-neutral-400">{storyboardFrames[activeStoryboard].motion}</div>
                    </div>

                    {storyboardFrames[activeStoryboard].text && (
                      <div>
                        <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Text/VO</div>
                        <div className="text-yellow-400 text-xl font-medium">
                          {storyboardFrames[activeStoryboard].text}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-neutral-800">
                      <div className="text-xs uppercase tracking-widest text-neutral-500 mb-2">Concept</div>
                      <div className="text-neutral-500 italic">{storyboardFrames[activeStoryboard].concept}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remotion Structure */}
            <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
              <h3 className="text-xl font-semibold mb-6">Remotion Component Structure</h3>
              <pre className="text-sm text-neutral-400 overflow-x-auto bg-neutral-950 p-4 rounded-lg">
{`// Suggested Remotion composition structure
<Composition
  id="RigidIntro"
  component={RigidIntro}
  durationInFrames={60 * 30} // 30s at 60fps
  fps={60}
  width={1920}
  height={1080}
/>

// Sequence breakdown
<Sequence from={0} durationInFrames={120}>
  <OriginPixel />           {/* 0:00-0:02 */}
</Sequence>
<Sequence from={120} durationInFrames={180}>
  <CodeFragmentBurst />     {/* 0:02-0:05 */}
</Sequence>
<Sequence from={300} durationInFrames={180}>
  <FragmentAssembly />      {/* 0:05-0:08 */}
</Sequence>
<Sequence from={480} durationInFrames={120}>
  <CursorEnters />          {/* 0:08-0:10 */}
</Sequence>
<Sequence from={600} durationInFrames={240}>
  <SculptingMorph />        {/* 0:10-0:14 */}
</Sequence>
<Sequence from={840} durationInFrames={180}>
  <CubeFormation />         {/* 0:14-0:17 */}
</Sequence>
<Sequence from={1020} durationInFrames={240}>
  <RefinementHands />       {/* 0:17-0:21 */}
</Sequence>
<Sequence from={1260} durationInFrames={180}>
  <RigidAwakens />          {/* 0:21-0:24 */}
</Sequence>
<Sequence from={1440} durationInFrames={120}>
  <PartnershipShot />       {/* 0:24-0:26 */}
</Sequence>
<Sequence from={1560} durationInFrames={120}>
  <UIReveal />              {/* 0:26-0:28 */}
</Sequence>
<Sequence from={1680} durationInFrames={120}>
  <LogoLockup />            {/* 0:28-0:30 */}
</Sequence>`}
              </pre>
            </div>
          </div>
        )}

        {/* UI MOTION SECTION */}
        {activeSection === 'ui' && (
          <div className="space-y-16">
            <div>
              <h1 className="text-4xl font-bold mb-4">UI Motion Patterns</h1>
              <p className="text-neutral-400 max-w-2xl text-lg">
                Micro-interactions and transitions that reinforce the sculpting metaphor 
                throughout the Rigid interface.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Pattern: Panel Reveal */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-4">Panel Reveal</h3>
                <p className="text-neutral-500 text-sm mb-6">
                  Panels emerge from the edge, materializing with blur-to-sharp and slight overshoot.
                </p>
                <div className="bg-neutral-950 rounded-lg p-4 h-32 flex items-center justify-center relative overflow-hidden">
                  <div 
                    className="absolute right-4 w-24 h-20 bg-yellow-400 rounded border border-yellow-500 opacity-80 anim-slide"
                  />
                </div>
                <code className="block mt-4 text-xs text-neutral-500">
                  translateX(100%) → translateX(-5%) → translateX(0)
                </code>
              </div>

              {/* Pattern: Focus State */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-4">Focus Highlight</h3>
                <p className="text-neutral-500 text-sm mb-6">
                  Selected elements get a subtle glow that pulses once then settles.
                </p>
                <div className="bg-neutral-950 rounded-lg p-4 h-32 flex items-center justify-center">
                  <div 
                    className="w-32 h-12 bg-neutral-800 rounded-lg border-2 border-yellow-400 relative"
                    style={{
                      boxShadow: '0 0 20px rgba(250, 204, 21, 0.3)',
                    }}
                  />
                </div>
                <code className="block mt-4 text-xs text-neutral-500">
                  box-shadow pulse 0→0.4→0.2 opacity, 600ms
                </code>
              </div>

              {/* Pattern: Loading */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-4">Processing State</h3>
                <p className="text-neutral-500 text-sm mb-6">
                  The Rigid mascot appears miniaturized, pulsing with the "thinking" animation.
                </p>
                <div className="bg-neutral-950 rounded-lg p-4 h-32 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <svg width="32" height="28" viewBox="0 0 130 113" fill="none" className="anim-sculpt">
                      <path d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z" fill="white"/>
                      <path d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z" fill="#171717"/>
                      <path d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z" fill="#FACC15"/>
                    </svg>
                    <span className="text-neutral-500 text-sm">Analyzing...</span>
                  </div>
                </div>
                <code className="block mt-4 text-xs text-neutral-500">
                  Mini Rigid + sculpt animation + text fade loop
                </code>
              </div>

              {/* Pattern: Success */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="text-lg font-semibold mb-4">Success Celebration</h3>
                <p className="text-neutral-500 text-sm mb-6">
                  Brief confetti of yellow particles + Rigid bounce. Joyful but not excessive.
                </p>
                <div className="bg-neutral-950 rounded-lg p-4 h-32 flex items-center justify-center relative overflow-hidden">
                  <svg width="48" height="42" viewBox="0 0 130 113" fill="none" className="anim-float">
                    <path d="M21.6687 24.8282L65.0641 0L108.341 24.8282L64.8597 50L21.6687 24.8282Z" fill="white"/>
                    <path d="M21.7994 24.9292L64.999 50.0966L65.1355 99.9895L21.5955 74.9196L21.7994 24.9292Z" fill="#171717"/>
                    <path d="M64.838 99.9895L65.0339 49.994L108.174 24.9292L108.233 75.171L64.838 99.9895Z" fill="#FACC15"/>
                  </svg>
                </div>
                <code className="block mt-4 text-xs text-neutral-500">
                  Bounce + 8 particles radial burst, 800ms total
                </code>
              </div>
            </div>

            {/* Transition Table */}
            <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
              <h3 className="text-xl font-semibold mb-6">Transition Reference</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-800">
                      <th className="pb-3 font-medium">Trigger</th>
                      <th className="pb-3 font-medium">Animation</th>
                      <th className="pb-3 font-medium">Duration</th>
                      <th className="pb-3 font-medium">Easing</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    {[
                      ['Hover', 'Scale 1.02 + lift shadow', '200ms', 'ease-out'],
                      ['Click/Tap', 'Scale 0.98 + shadow compress', '100ms', 'ease-in'],
                      ['Focus', 'Yellow border + glow pulse', '300ms', 'ease-out'],
                      ['Page transition', 'Crossfade + slide', '400ms', 'cubic-bezier(0.16, 1, 0.3, 1)'],
                      ['Modal open', 'Backdrop fade + scale 0.95', '300ms', 'ease-out'],
                      ['Modal close', 'Scale to 0.95 + fade', '200ms', 'ease-in'],
                      ['Toast appear', 'Slide up + fade in', '300ms', 'ease-out'],
                      ['Toast dismiss', 'Slide down + fade out', '200ms', 'ease-in'],
                      ['List item enter', 'Stagger fade + translateY', '400ms', '50ms stagger'],
                      ['Error shake', 'Horizontal shake', '500ms', 'ease-in-out'],
                    ].map(([trigger, anim, dur, ease]) => (
                      <tr key={trigger} className="border-b border-neutral-800">
                        <td className="py-3">{trigger}</td>
                        <td className="py-3 text-neutral-500">{anim}</td>
                        <td className="py-3 font-mono text-yellow-400">{dur}</td>
                        <td className="py-3 text-neutral-500">{ease}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-8 py-6 mt-16">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-xs text-neutral-600">
          <span>Rigid Motion System • Design Guide</span>
          <span>Ready for Remotion implementation</span>
        </div>
      </footer>
    </div>
  );
}
