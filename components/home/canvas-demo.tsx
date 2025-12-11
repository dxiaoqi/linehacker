"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Sparkles, Loader2 } from "lucide-react"

export function CanvasDemo() {
  const [step, setStep] = useState(0)
  const [typedText, setTypedText] = useState("")
  const [thinkingStep, setThinkingStep] = useState<string | null>(null)
  const targetText = "我想开一家咖啡店，主要面向年轻创意人群"
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Animation sequence
  useEffect(() => {
    const runSequence = async () => {
      // Step 0: Initial state (1s)
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })
      
      // Step 1: Typing (2s)
      setStep(1)
      for (let i = 0; i <= targetText.length; i++) {
        setTypedText(targetText.slice(0, i))
        await new Promise(r => {
          timeoutRef.current = setTimeout(r, 50)
        })
      }
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 500)
      })

      // Step 2: Sending & AI Thinking (3s)
      setStep(2)
      // Simulate AI analyzing steps
      setThinkingStep("Analyzing request...")
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })
      setThinkingStep("Identifying goals...")
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })
      setThinkingStep("Structuring workflow...")
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })

      // Step 3: Generating Goal Node (1s)
      setStep(3)
      setThinkingStep(null)
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })

      // Step 4: Generating Resource Nodes (1s)
      setStep(4)
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 1000)
      })

      // Step 5: Connecting Nodes (1s)
      setStep(5)
      await new Promise(r => {
        timeoutRef.current = setTimeout(r, 3000)
      })

      // Reset loop
      setStep(0)
      setTypedText("")
      runSequence()
    }

    runSequence()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto aspect-video bg-[#0A0A0A] rounded-xl border border-white/10 shadow-2xl overflow-hidden relative font-sans flex flex-col min-h-[650px]">
      {/* Fake Browser Header */}
      <div className="h-10 bg-[#161616] border-b border-white/5 flex items-center px-4 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
        </div>
        <div className="ml-4 px-3 py-1 bg-black/50 rounded-md text-[10px] text-gray-500 flex-1 text-center font-mono">
          linehacker.app/editor
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-[#050505] p-8 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 grid grid-cols-[repeat(40,1fr)] grid-rows-[repeat(40,1fr)] gap-px opacity-[0.03] pointer-events-none">
          {Array.from({ length: 1600 }).map((_, i) => (
            <div key={i} className="bg-white" />
          ))}
        </div>

        {/* Nodes Container */}
        <div className="relative w-full h-full">
          {/* AI Thinking Indicator - Center it visually in the available space */}
          <div 
            className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-30
              ${step === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
            `}
          >
            <div className="bg-[#1A1A1A] border border-primary/30 rounded-xl p-4 shadow-xl flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-primary rounded-full animate-ping absolute inset-0" />
                <div className="w-3 h-3 bg-primary rounded-full relative z-10" />
              </div>
              <div className="text-sm font-mono text-primary animate-pulse">
                {thinkingStep}
              </div>
            </div>
          </div>

          {/* Goal Node - Move up slightly */}
          <div 
            className={`absolute top-[25%] left-1/2 -translate-x-1/2 transition-all duration-700 ease-out transform z-10
              ${step >= 3 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10'}
            `}
          >
            <div className="w-48 bg-[#1A1A1A] border border-blue-500/30 rounded-xl p-4 shadow-lg shadow-blue-500/5 relative group">
              <div className="absolute -left-1 top-4 w-1 h-8 bg-blue-500 rounded-r-full" />
              <div className="text-xs font-semibold text-blue-400 mb-1">GOAL</div>
              <div className="text-sm text-gray-200">Launch "Inspiration Buyer" Coffee Shop</div>
            </div>
          </div>

          {/* Resource Node 1 (Left) - Move up and out */}
          <div 
            className={`absolute top-[55%] left-[15%] transition-all duration-700 delay-100 ease-out transform z-10
              ${step >= 4 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10'}
            `}
          >
            <div className="w-40 bg-[#1A1A1A] border border-purple-500/30 rounded-xl p-3 shadow-lg shadow-purple-500/5 relative">
              <div className="absolute -left-1 top-3 w-1 h-6 bg-purple-500 rounded-r-full" />
              <div className="text-[10px] font-semibold text-purple-400 mb-1">RESOURCE</div>
              <div className="text-xs text-gray-300">Seed Funding & Location</div>
            </div>
          </div>

          {/* Resource Node 2 (Right) - Move up and out */}
          <div 
            className={`absolute top-[55%] right-[15%] transition-all duration-700 delay-200 ease-out transform z-10
              ${step >= 4 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10'}
            `}
          >
            <div className="w-40 bg-[#1A1A1A] border border-yellow-500/30 rounded-xl p-3 shadow-lg shadow-yellow-500/5 relative">
              <div className="absolute -left-1 top-3 w-1 h-6 bg-yellow-500 rounded-r-full" />
              <div className="text-[10px] font-semibold text-yellow-400 mb-1">IDEA</div>
              <div className="text-xs text-gray-300">Creative Community Events</div>
            </div>
          </div>

          {/* Connection Lines (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
            {/* Line 1: Goal (Bottom Center) -> Resource 1 (Top Center) */}
            <path
              d="M 450 170 C 450 250, 200 250, 200 350" 
              fill="none"
              stroke="#A855F7"
              strokeWidth="2"
              strokeDasharray="10 5"
              className={`transition-all duration-1000 ease-out ${step >= 5 ? 'opacity-30' : 'opacity-0'}`}
              style={{ strokeDashoffset: step >= 5 ? 0 : 100 }}
            />
             {/* Line 2: Goal (Bottom Center) -> Resource 2 (Top Center) */}
             <path
              d="M 450 170 C 450 250, 700 250, 700 350"
              fill="none"
              stroke="#EAB308"
              strokeWidth="2"
              strokeDasharray="10 5"
              className={`transition-all duration-1000 ease-out ${step >= 5 ? 'opacity-30' : 'opacity-0'}`}
              style={{ strokeDashoffset: step >= 5 ? 0 : 100 }}
            />
          </svg>

          {/* Cursor Simulation */}
          <div 
            className={`absolute w-4 h-4 pointer-events-none z-50 transition-all duration-1000 ease-in-out
              ${step === 0 ? 'top-[90%] left-[50%] opacity-100' : ''}
              ${step === 1 ? 'top-[90%] left-[60%] opacity-100' : ''}
              ${step === 2 ? 'top-[90%] left-[90%] opacity-100' : ''}
              ${step >= 3 ? 'top-[40%] left-[50%] opacity-0' : ''}
            `}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="white" stroke="black" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Canvas Toolbar (Simulated) */}
      <div className="absolute bottom-25 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-20">
        <div className="bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-2">
          {/* Chat Area */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 bg-black/50 min-h-[40px] rounded-lg border border-white/10 flex items-center px-3 py-2 text-sm text-gray-300 relative overflow-hidden">
              {step === 2 || step === 3 || step === 4 || step === 5 ? (
                <div className="flex items-center gap-2 text-primary/70">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">AI is thinking...</span>
                </div>
              ) : (
                <>
                  {typedText}
                  {step === 1 && <span className="w-0.5 h-4 bg-primary ml-0.5 animate-pulse inline-block align-middle" />}
                  {step === 0 && <span className="text-gray-600">Ask AI to build a workflow...</span>}
                </>
              )}
            </div>
            <button 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 mb-0
                ${step >= 2 && step <= 5 ? 'bg-primary text-white' : 'bg-white/5 text-gray-500'}
              `}
            >
              {step >= 2 && step <= 5 ? <div className="w-2 h-2 bg-white rounded-sm animate-pulse" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Helper Text */}
          <div className="flex justify-between items-center px-1 text-[10px] text-gray-600 font-mono">
            <div className="flex gap-2">
              <span>⏎ to send</span>
              <span>/ for commands</span>
            </div>
            <div>AI-Native Canvas</div>
          </div>
        </div>
      </div>
    </div>
  )
}

