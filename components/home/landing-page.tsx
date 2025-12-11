"use client"

import { ArrowRight, Sparkles, Brain, GitBranch, Zap, Layout, Share2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CanvasDemo } from "./canvas-demo"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-sm border-b border-white/10">
        <div className="text-xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50">
            <Layout className="w-5 h-5 text-primary" />
          </div>
          LineHacker
        </div>
        <div className="flex gap-4">
          <Link href="/editor">
            <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/5">
              Log in
            </Button>
          </Link>
          <Link href="/editor">
            <Button className="bg-white text-black hover:bg-white/90">
              Get Started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="h-screen pb-[195px] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-black to-black opacity-50" />
        
        <div className="text-center z-10 max-w-4xl px-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Native Workflow Builder</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Turn Chaos into <br />
            <span className="text-primary">Structured Action</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Your AI thought partner for complex problem solving. 
            From messy ideas to actionable roadmaps in seconds.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/editor">
              <Button size="lg" className="h-12 px-8 text-lg bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-transform duration-300">
                Start Building Now
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg border-white/20 bg-white/5 hover:bg-white/10 text-white hover:scale-105 transition-transform duration-300">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Demo Component */}
        <div className="relative z-20 mt-16 w-full px-4 animate-fade-in-up delay-300 pb-20">
          <CanvasDemo />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <FloatingNode x="10%" y="20%" delay="0s" />
          <FloatingNode x="80%" y="15%" delay="1s" />
          <FloatingNode x="15%" y="70%" delay="2s" />
          <FloatingNode x="85%" y="80%" delay="3s" />
        </div>
      </section>

      {/* Story Section: The Problem */}
      <StorySection
        title="It starts with a spark"
        description="You have an idea, but it's messy. Just a stream of consciousness."
        icon={Brain}
        align="left"
      >
        <div className="bg-zinc-900 rounded-xl p-6 border border-white/10 shadow-2xl hover:border-primary/30 transition-colors duration-500 group">
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800" />
            <div className="bg-zinc-800 rounded-2xl rounded-tl-none p-4 max-w-[80%] text-sm text-gray-300">
              I want to launch a new coffee brand called "Inspiration Buyer", focusing on creative community...
            </div>
          </div>
          <div className="flex gap-3 justify-end opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-300">
            <div className="bg-primary/20 text-primary rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm">
              That sounds exciting! Let's break this down. Who is your target audience, and what are the core services?
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>
      </StorySection>

      {/* Story Section: The Structure */}
      <StorySection
        title="AI structures your thoughts"
        description="We analyze your intent and automatically generate a visual roadmap. Goals, risks, resources - all mapped out."
        icon={GitBranch}
        align="right"
      >
        <div className="relative h-[300px] w-full bg-zinc-900/50 rounded-xl border border-white/10 overflow-hidden group">
          <div className="absolute inset-0 grid grid-cols-[repeat(20,1fr)] grid-rows-[repeat(20,1fr)] gap-px opacity-10">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="bg-white/5" />
            ))}
          </div>
          
          {/* Animated Nodes */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-16 bg-blue-500/20 border-2 border-blue-500 rounded-lg flex items-center justify-center text-blue-400 font-bold scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500">
            Launch Brand
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-12 bg-yellow-500/20 border border-yellow-500 rounded-lg flex items-center justify-center text-yellow-400 text-xs opacity-0 group-hover:translate-x-[-100px] group-hover:translate-y-[80px] group-hover:opacity-100 transition-all duration-700 delay-200">
            Community
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-12 bg-green-500/20 border border-green-500 rounded-lg flex items-center justify-center text-green-400 text-xs opacity-0 group-hover:translate-x-[100px] group-hover:translate-y-[80px] group-hover:opacity-100 transition-all duration-700 delay-400">
            Marketing
          </div>

          {/* Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-500">
            <line x1="50%" y1="50%" x2="35%" y2="70%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <line x1="50%" y1="50%" x2="65%" y2="70%" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          </svg>
        </div>
      </StorySection>

      {/* Story Section: Action */}
      <StorySection
        title="From Plan to Action"
        description="Connect with your existing tools. Export to Markdown, Notion, or Linear. Make it real."
        icon={Zap}
        align="left"
      >
        <div className="grid grid-cols-2 gap-4 group">
          {['Markdown', 'Notion', 'Linear', 'GitHub'].map((tool, i) => (
            <div
              key={tool}
              className="bg-zinc-900 p-4 rounded-lg border border-white/10 flex items-center gap-3 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                <Share2 className="w-4 h-4" />
              </div>
              <span>{tool}</span>
            </div>
          ))}
        </div>
      </StorySection>

      {/* CTA Footer */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 z-0" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to organize your thoughts?</h2>
          <p className="text-gray-400 mb-8 text-lg">
            Join thousands of thinkers, creators, and builders using LineHacker.
          </p>
          <Link href="/editor">
            <Button size="lg" className="h-14 px-10 text-xl bg-white text-black hover:bg-gray-200 hover:scale-105 transition-transform duration-300">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function FloatingNode({ x, y, delay }: { x: string; y: string; delay: string }) {
  return (
    <div
      className="absolute w-32 h-12 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm animate-float"
      style={{ left: x, top: y, animationDelay: delay }}
    />
  )
}

function StorySection({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  align = 'left' 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  children: React.ReactNode; 
  align?: 'left' | 'right' 
}) {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <div className={`flex flex-col md:flex-row gap-12 items-center ${align === 'right' ? 'md:flex-row-reverse' : ''}`}>
        <div className="flex-1 space-y-6">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 text-primary">
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-xl text-gray-400 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="flex-1 w-full perspective-1000">
          {children}
        </div>
      </div>
    </section>
  )
}
