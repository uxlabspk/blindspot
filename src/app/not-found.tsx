import { Home } from "lucide-react";
import Link from "next/link";


export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-2">
      <h1 className="text-3xl text-gray-800">Not Found</h1>
      <p className="text-gray-600">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded">
          <Home className="w-5 h-5" />
          Go to Home
        </button>
      </Link>
    </div>
  );
}
