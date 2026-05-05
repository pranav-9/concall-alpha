"use client";

import type { ReactNode } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function AdminAnalyticsTabs({
  usage,
  watchlists,
  operations,
}: {
  usage: ReactNode;
  watchlists: ReactNode;
  operations: ReactNode;
}) {
  return (
    <Tabs defaultValue="usage" className="gap-4">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/40 p-1">
        <TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="usage"
            className="min-w-[9rem] rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background dark:data-[state=active]:bg-foreground dark:data-[state=active]:text-background"
          >
            User Usage
          </TabsTrigger>
          <TabsTrigger
            value="watchlists"
            className="min-w-[9rem] rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background dark:data-[state=active]:bg-foreground dark:data-[state=active]:text-background"
          >
            Watchlists
          </TabsTrigger>
          <TabsTrigger
            value="operations"
            className="min-w-[13rem] rounded-xl px-4 py-2.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background dark:data-[state=active]:bg-foreground dark:data-[state=active]:text-background"
          >
            Requests & Moderation
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="usage" className="mt-0">
        {usage}
      </TabsContent>
      <TabsContent value="watchlists" className="mt-0">
        {watchlists}
      </TabsContent>
      <TabsContent value="operations" className="mt-0">
        {operations}
      </TabsContent>
    </Tabs>
  );
}
