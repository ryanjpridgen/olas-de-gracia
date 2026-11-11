import PageBreadcrumb from "@/components/common/page-breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { env } from "cloudflare:workers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bible" };

type Translation = {
  id: string;
  language: "en" | "es";
  name: string;
  abbreviation: string;
  license: string;
  version: number;
  active: number;
};

export default async function BiblePage() {
  const { results } = await env.DB.prepare(
    `SELECT id, language, name, abbreviation, license, version, active
     FROM translations ORDER BY language, name`,
  ).all<Translation>();

  return (
    <div>
      <PageBreadcrumb pageTitle="Bible" />
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Translations
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Bible translations available to the app.
            </p>
          </div>
          <Link
            href="/bible/upload"
            className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Add translation
          </Link>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Language", "Name", "Abbreviation", "License", "Version", "Status"].map((heading) => (
                  <TableCell
                    key={heading}
                    isHeader
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 sm:px-6 dark:text-gray-400"
                  >
                    {heading}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.map((translation) => (
                <TableRow key={translation.id}>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 sm:px-6 dark:text-gray-300">
                    {translation.language.toUpperCase()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 sm:px-6 dark:text-white/90">
                    {translation.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 sm:px-6 dark:text-gray-300">
                    {translation.abbreviation}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 sm:px-6 dark:text-gray-300">
                    {translation.license}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 sm:px-6 dark:text-gray-300">
                    {translation.version}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 sm:px-6 dark:text-gray-300">
                    {translation.active ? "Active" : "Inactive"}
                  </TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 sm:px-6 dark:text-gray-400">
                    No translations yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
