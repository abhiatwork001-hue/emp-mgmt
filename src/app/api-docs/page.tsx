import { getApiDocs } from "@/lib/swagger";
import ReactSwagger from "./react-swagger";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: 'API Documentation',
    description: 'API documentation for the Application',
};

export default async function IndexPage() {
    const spec = await getApiDocs();
    return (
        <div className="pt-20 bg-white min-h-screen text-slate-900">
            <div className="container mx-auto px-4 py-8">
                <ReactSwagger spec={spec} />
            </div>
        </div>
    );
}
