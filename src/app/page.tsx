import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Daily Life Tracker</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Track your daily health metrics including nutrition, intestinal health, 
          physical activity, and sleep patterns for better insights into your wellbeing.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍽️ Food Tracking
            </CardTitle>
            <CardDescription>
              Log your meals and automatically calculate macronutrients using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/food">
              <Button className="w-full">Track Food</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏥 Health Monitoring
            </CardTitle>
            <CardDescription>
              Monitor intestinal health and digestive patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/health">
              <Button className="w-full">Log Health</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Analytics
            </CardTitle>
            <CardDescription>
              View trends and correlations in your health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/analytics">
              <Button className="w-full" variant="secondary">
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Link href="/auth/signin">
          <Button variant="outline" size="lg">
            Sign In to Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
} 