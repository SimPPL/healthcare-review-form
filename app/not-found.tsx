import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-semibold">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button asChild className="w-full text-xs sm:text-sm">
              <Link href="/">
                <Home className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Go to Home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full bg-transparent text-xs sm:text-sm"
            >
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Go Back
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
