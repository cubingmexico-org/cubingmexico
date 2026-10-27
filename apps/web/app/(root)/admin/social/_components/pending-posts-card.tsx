"use client";

import type * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { PreviewTarget, SocialPostType } from "./social-types";
import { PreviewButton, missingPlatformBadges } from "./social-ui";

type PendingRow = {
  subjectKey: string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export function PendingPostsCard<Row extends PendingRow>({
  title,
  description,
  emptyMessage,
  subjectHeader,
  rows,
  postType,
  renderSubject,
  previewName,
  busyKey,
  onPreview,
}: {
  title: string;
  description: React.ReactNode;
  emptyMessage: string;
  subjectHeader: string;
  rows: Row[];
  postType: SocialPostType;
  /** Title and subtitle shown in the first column. */
  renderSubject: (row: Row) => {
    title: React.ReactNode;
    detail: React.ReactNode;
  };
  previewName: (row: Row) => string;
  busyKey: string | null;
  onPreview: (target: PreviewTarget) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{subjectHeader}</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead className="text-right">Vista previa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const subject = renderSubject(row);
                  return (
                    <TableRow key={row.subjectKey}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{subject.title}</p>
                          <p className="text-muted-foreground text-xs">
                            {subject.detail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{missingPlatformBadges(row)}</TableCell>
                      <TableCell className="text-right">
                        <PreviewButton
                          postType={postType}
                          subjectKey={row.subjectKey}
                          name={previewName(row)}
                          disabled={busyKey !== null}
                          onPreview={onPreview}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
