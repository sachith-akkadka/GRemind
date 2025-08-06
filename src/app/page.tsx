
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Zap, BrainCircuit } from 'lucide-react';
import { AppLogo } from '@/components/icons';
import Image from "next/image";
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';


function HomePageContent() {
  return (
     <div className="flex flex-col min-h-screen bg-gradient-to-br from-primary/30 via-accent/30 to-background dark:from-primary/20 dark:via-accent/20">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
            <AppLogo className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">G-Remind</h1>
            </div>
            <nav className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
                <Link href="/signup">Sign Up</Link>
            </Button>
            </nav>
        </div>
      </header>

      <main className="flex-1">
        <section 
          className="relative py-20 md:py-32"
        >
          <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-foreground">
              Never forget a task at a location again.
            </h2>
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
              G-Remind is your intelligent assistant for location-based tasks. Set reminders for places, and get notified when you're nearby.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started for Free</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold">A smarter way to manage your errands</h3>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
                From AI-powered suggestions to optimized routing, we've got you covered.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<MapPin className="h-8 w-8 text-primary" />}
                title="Location-Based Tasks"
                description="Create tasks and link them to specific locations. Get reminders when you're in the vicinity."
              />
              <FeatureCard
                icon={<BrainCircuit className="h-8 w-8 text-primary" />}
                title="AI Location Suggestions"
                description="Start typing and our AI will suggest relevant locations, making task creation faster than ever."
              />
              <FeatureCard
                icon={<Navigation className="h-8 w-8 text-primary" />}
                title="Multi-Stop Navigation"
                description="Plan your route efficiently. Get an optimized multi-stop route for all your pending tasks for the day."
              />
               <FeatureCard
                icon={<Zap className="h-8 w-8 text-primary" />}
                title="Smart Task Management"
                description="Organize your tasks with categories, due dates, and priorities. Stay on top of your to-do list."
              />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                 <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center bg-card/20 backdrop-blur-sm p-8 rounded-2xl border border-white/10">
                    <div>
                        <Image src="https://placehold.co/600x400.png" alt="App Screenshot" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="app interface map" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">Designed for life on the go</h3>
                        <p className="mt-4 text-muted-foreground">
                           G-Remind's clean, intuitive interface helps you manage your location-based tasks without the clutter. Enjoy a calm, focused experience that adapts to your needs.
                        </p>
                        <ul className="mt-6 space-y-4">
                            <li className="flex items-start gap-3">
                               <MapPin className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Geofencing Alerts:</span> Get smart notifications when you enter or leave a designated area for a task.</span>
                            </li>
                             <li className="flex items-start gap-3">
                               <Navigation className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Optimized Routing:</span> Save time and fuel with the most efficient route for your day's errands.</span>
                            </li>
                             <li className="flex items-start gap-3">
                               <Zap className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Seamless Sync:</span> Your tasks are always available across all your devices, syncing automatically.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
      </main>

      <footer className="bg-card/20 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} G-Remind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}


export default function Home() {
  return (
     <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <HomePageContent />
    </ThemeProvider>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center bg-card/20 backdrop-blur-sm hover:bg-card/40 hover:shadow-lg transition-all duration-300 border border-white/10">
      <CardHeader>
        <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center">
          {icon}
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
