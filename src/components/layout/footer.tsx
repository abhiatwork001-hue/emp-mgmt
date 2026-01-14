import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="flex justify-center items-center py-4 bg-muted text-sm text-muted-foreground border-t">
            <div className="flex space-x-4">
                <Link href="/legal/privacy-policy.html" className="hover:underline">
                    Privacy Policy
                </Link>
                <Link href="/legal/terms-of-service.html" className="hover:underline">
                    Terms of Service
                </Link>
                <Link href="/legal/data-processing-agreement.md" className="hover:underline">
                    Data Processing Agreement
                </Link>
                <Link href="/legal/license-agreement.html" className="hover:underline">
                    License Agreement
                </Link>
            </div>
        </footer>
    );
}
