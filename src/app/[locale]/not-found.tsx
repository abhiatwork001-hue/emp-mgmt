import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-[#020817] text-white">
            <h1 className="text-9xl font-black text-slate-800">404</h1>
            <div className="absolute flex flex-col items-center gap-2">
                <h2 className="text-2xl font-bold">Page not found</h2>
                <p className="text-zinc-400">Sorry, we couldn't find the page you're looking for.</p>
                <Button asChild className="mt-4 bg-white text-black hover:bg-zinc-200">
                    <Link href="/dashboard">Return Home</Link>
                </Button>
            </div>
        </div>
    );
}
