import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="w-full py-6 bg-muted/30 border-t mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground text-center md:text-left">
                    <p>&copy; {new Date().getFullYear()} Developed by <strong>LaGasy</strong>.</p>
                    <p className="mt-1">Licensed to <strong>Chick-fil-A</strong></p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                    <Link href="/legal/privacy" className="hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/legal/terms" className="hover:text-primary transition-colors">
                        Terms of Service
                    </Link>
                    <Link href="/legal/dpa" className="hover:text-primary transition-colors">
                        Data Processing
                    </Link>
                    <Link href="/legal/license" className="hover:text-primary transition-colors">
                        License
                    </Link>
                </div>
            </div>
        </footer>
    );
}
