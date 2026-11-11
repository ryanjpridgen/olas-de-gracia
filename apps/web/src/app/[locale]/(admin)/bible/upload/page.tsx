import PageBreadcrumb from "@/components/common/page-breadcrumb";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import TranslationForm from "./translation-form";

export const metadata: Metadata = { title: "Upload Bible Translation" };

export default function BibleUploadPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Upload Bible Translation" />
      <section className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 sm:p-6">
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Translation details
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Register a translation in the Bible catalog.
          </p>
        </div>
        <TranslationForm />
        <Link
          href="/bible"
          className="mt-5 inline-flex text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          Back to Bible translations
        </Link>
      </section>
    </div>
  );
}
