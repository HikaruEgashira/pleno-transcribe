"use client";

import { motion } from "framer-motion";
import { Mic, Zap, Clock, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/packages/lib/cn";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-indigo-500/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border border-indigo-500/[0.1]",
            "shadow-[0_8px_32px_0_rgba(99,102,241,0.1)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

interface VoiceVisualizerProps {
  isActive: boolean;
  bars?: number;
}

function VoiceVisualizer({ isActive, bars = 24 }: VoiceVisualizerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-16 w-full flex items-center justify-center gap-1">
      {[...Array(bars)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-300",
            isActive ? "bg-primary animate-pulse" : "bg-primary/20 h-2"
          )}
          style={
            isActive && isClient
              ? {
                  height: `${20 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.05}s`,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "default" | "outline";
  size?: "default" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all",
        "disabled:pointer-events-none disabled:opacity-50",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        variant === "default" &&
          "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
        variant === "outline" &&
          "border border-border bg-background hover:bg-surface",
        size === "default" && "h-10 px-4 py-2",
        size === "lg" && "h-12 px-8 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const features = [
  {
    icon: Zap,
    title: "Instant Transcription",
    description:
      "Convert your voice memos to text in seconds with AI-powered accuracy",
  },
  {
    icon: Clock,
    title: "Save Time",
    description: "Stop typing. Start speaking. Get more done in less time",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your voice memos are encrypted and stored securely",
  },
];

function VoiceMemoLanding() {
  const [isRecording, setIsRecording] = useState(false);

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2 + i * 0.15,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
    }),
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRecording((prev) => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={500}
          height={120}
          rotate={12}
          gradient="from-indigo-500/[0.08]"
          className="left-[-10%] top-[15%]"
        />

        <ElegantShape
          delay={0.5}
          width={400}
          height={100}
          rotate={-15}
          gradient="from-indigo-500/[0.08]"
          className="right-[-5%] top-[70%]"
        />

        <ElegantShape
          delay={0.4}
          width={250}
          height={70}
          rotate={-8}
          gradient="from-indigo-500/[0.08]"
          className="left-[10%] bottom-[10%]"
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-foreground">
                Pleno Transcribe
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted hover:text-foreground transition-colors">
                Features
              </a>
              <a
                href="https://github.com/HikaruEgashira/pleno-transcribe/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="default">
                  Download App
                </Button>
              </a>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-12 pb-16 md:pt-24 md:pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <motion.div
                custom={0}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-primary/10 mb-8"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm text-muted font-medium">
                  AI-Powered Transcription
                </span>
              </motion.div>

              <motion.h1
                custom={1}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight text-foreground"
              >
                Turn Voice into{" "}
                <span className="text-primary">Knowledge</span>
              </motion.h1>

              <motion.p
                custom={2}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="text-lg md:text-xl text-muted mb-10 max-w-2xl mx-auto leading-relaxed"
              >
                Transform your voice memos into searchable, organized text.
                Capture ideas on the go and never lose a thought again.
              </motion.p>

              <motion.div
                custom={3}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
              >
                <a href="https://github.com/HikaruEgashira/pleno-transcribe/releases">
                  <Button size="lg">Download App</Button>
                </a>
                <a href="https://github.com/HikaruEgashira/pleno-transcribe">
                  <Button size="lg" variant="outline">
                    View on GitHub
                  </Button>
                </a>
              </motion.div>

              <motion.div
                custom={4}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                className="max-w-2xl mx-auto"
              >
                <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
                  <div className="flex flex-col items-center gap-4">
                    <button
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                        isRecording
                          ? "bg-primary shadow-lg shadow-primary/30"
                          : "bg-background border-2 border-primary hover:bg-primary/5"
                      )}
                      onClick={() => setIsRecording(!isRecording)}
                    >
                      {isRecording ? (
                        <motion.div
                          className="w-6 h-6 rounded-sm bg-white"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        />
                      ) : (
                        <Mic className="w-7 h-7 text-primary" />
                      )}
                    </button>

                    <VoiceVisualizer isActive={isRecording} />

                    <p className="text-sm text-muted font-medium">
                      {isRecording
                        ? "Recording..."
                        : "Click to start recording"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything you need
              </h2>
              <p className="text-lg text-muted">
                Powerful features to help you work smarter
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-surface border border-border rounded-2xl p-8 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted mb-8">
              Download the app and start turning your voice into knowledge
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://github.com/HikaruEgashira/pleno-transcribe/releases">
                <Button size="lg">Download Now</Button>
              </a>
              <a href="https://github.com/HikaruEgashira/pleno-transcribe">
                <Button size="lg" variant="outline">
                  Star on GitHub
                </Button>
              </a>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">
                Pleno Transcribe
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <a
                href="https://github.com/HikaruEgashira/pleno-transcribe"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <span>© 2025 Pleno Transcribe</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default VoiceMemoLanding;
