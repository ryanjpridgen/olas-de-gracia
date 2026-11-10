import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils";
import { tableData as defaultTableData } from "./data";
import TableOneRow from "./table-one-row";
import { TableOneProps } from "./types";
import { env } from "cloudflare:workers";
import { Button } from "@/components/ui/button";
import { LinkIcon } from "@/icons/link";

export default async function TableOne({
  data = defaultTableData,
  className,
}: TableOneProps) {
  const languages = await env.DB.prepare(
    "SELECT id, language, name, source_url FROM translations",
  ).all();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3",
        className,
      )}
    >
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/5">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-xs font-medium text-gray-500 sm:px-6 dark:text-gray-400"
              >
                Language
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-xs font-medium text-gray-500 sm:px-6 dark:text-gray-400"
              >
                Name
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 text-start text-xs font-medium text-gray-500 sm:px-6 dark:text-gray-400"
              >
                Source
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
            {languages.results.map(({ id, language, name, source_url }) => (
              <TableRow
                key={id}
                className="transition hover:bg-gray-50/50 dark:hover:bg-white/2"
              >
                <TableCell className="px-5 py-4 text-start sm:px-6">
                  {language}
                </TableCell>
                <TableCell className="px-5 py-4 text-start text-sm text-gray-500 sm:px-6 dark:text-gray-400">
                  {name}
                </TableCell>
                <TableCell className="px-5 py-4 text-start text-sm text-gray-500 sm:px-6 dark:text-gray-400">
                  <Button>
                    Download <LinkIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
