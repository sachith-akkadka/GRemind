import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Zap, BrainCircuit, BarChart2 } from 'lucide-react';
import { AppLogo } from '@/components/icons';
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">G-Remind</h1>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-32 bg-primary/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold font-headline text-primary-foreground-dark">
              Organize your life, intelligently.
            </h2>
            <p className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
              G-Remind is more than just a to-do list. It's your personal assistant, learning your habits to help you stay productive and focused.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started for Free</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold font-headline">Features that Power Your Productivity</h3>
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
                From AI-powered suggestions to seamless organization, we've got you covered.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-primary" />}
                title="Streamlined Task Input"
                description="Quickly add tasks with our intuitive interface, including dates, locations, and recurring schedules."
              />
              <FeatureCard
                icon={<BrainCircuit className="h-8 w-8 text-primary" />}
                title="AI Smart Suggestions"
                description="Our AI suggests categories and optimal reschedule times, learning from your behavior to keep you on track."
              />
              <FeatureCard
                icon={<CheckCircle className="h-8 w-8 text-primary" />}
                title="Prioritized Views"
                description="Focus on what matters with clear, organized views for pending, today's, and completed tasks."
              />
              <FeatureCard
                icon={<BarChart2 className="h-8 w-8 text-primary" />}
                title="Analytics Dashboard"
                description="Visualize your progress with insightful charts on completion trends and category breakdowns."
              />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24 bg-card">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                    <div>
                        <Image src="https://placehold.co/600x400.png" alt="App Screenshot" width={600} height={400} className="rounded-lg shadow-xl" data-ai-hint="app interface" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold font-headline">Work Smarter, Not Harder</h3>
                        <p className="mt-4 text-muted-foreground">
                            G-Remind's clean, card-based layout and thoughtful design help you manage your tasks without the clutter. Enjoy a calm, focused workspace that adapts to your needs.
                        </p>
                        <ul className="mt-6 space-y-4">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Dark & Light Modes:</span> Switch themes to match your environment and reduce eye strain.</span>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Location-Based Reminders:</span> Get notified when you're near a location where a task needs to be done.</span>
                            </li>
                             <li className="flex items-start gap-3">
                                <CheckCircle className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                                <span><span className="font-semibold">Offline Support:</span> Your tasks are always available, syncing automatically when you're back online.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
      </main>

      <footer className="bg-background border-t">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} G-Remind. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center bg-card hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="mx-auto bg-primary/10 rounded-full h-16 w-16 flex items-center justify-center">
          {icon}
        </div>
        <CardTitle className="mt-4 font-headline">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
