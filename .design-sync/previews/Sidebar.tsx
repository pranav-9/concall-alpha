import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "concall-alpha";
import {
  BarChart3,
  Building2,
  LineChart,
  ListChecks,
  Newspaper,
  Shield,
} from "lucide-react";

// Sidebar is a LAYOUT, not a widget: SidebarProvider owns the open/collapsed
// state and must wrap both the rail and the page body, and SidebarInset is the
// content column beside it. Every Sidebar* part throws outside the provider, so
// the only true preview is the whole shell.
//
// The sidebar surface tokens (bg-sidebar, text-sidebar-foreground,
// w-(--sidebar-width)) are Tailwind v4 utilities that this v3 build does not
// emit, so the shell is given its width and surface through className — see
// .design-sync/learnings/B-overlay-nav.md.

const SHELL_CLASS = "w-64 shrink-0 border-r border-border bg-muted";

export const CompanyPageNav = () => (
  <SidebarProvider
    style={{ minHeight: 0, height: 560 }}
    className="overflow-hidden rounded-lg border border-border"
  >
    <Sidebar collapsible="none" className={SHELL_CLASS}>
      <SidebarHeader className="px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Story of a Stock
        </p>
        <p className="text-sm font-medium text-foreground">
          Neuland Laboratories
        </p>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Company page</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>
                  <BarChart3 /> <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Building2 /> <span>Business Snapshot</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Shield /> <span>Moat Analysis</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>Narrow</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <LineChart /> <span>Future Growth</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ListChecks /> <span>Key Variables</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>4</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        <p className="text-[11px] text-muted-foreground">
          Q1 FY27 · scored 12 Aug 2026
        </p>
      </SidebarFooter>
    </Sidebar>

    <SidebarInset className="p-5">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Overview
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tabular-nums text-foreground">
          8.2
        </span>
        <span className="text-sm text-muted-foreground">
          Strongly bullish · up 0.6 from Q4 FY26
        </span>
      </div>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The composite is 88% quarter leg and 12% growth leg. Ranks are computed
        inside the covered universe of 100 mid- and small-cap companies.
      </p>
    </SidebarInset>
  </SidebarProvider>
);

export const GroupedNavigation = () => (
  <SidebarProvider
    style={{ minHeight: 0, height: 560 }}
    className="overflow-hidden rounded-lg border border-border"
  >
    <Sidebar collapsible="none" className={SHELL_CLASS}>
      <SidebarHeader className="px-3 py-3">
        <p className="text-sm font-medium text-foreground">Coverage</p>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Boards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>
                  <BarChart3 /> <span>Overall</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive>
                      Latest 4Q blend
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>Quarter</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>Growth</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Watchlists</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ListChecks /> <span>Portfolio</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>19</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <ListChecks /> <span>API compounders</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>7</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Desk</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Newspaper /> <span>Exchange filings</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>12</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>

    <SidebarInset className="p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Overall board · Q1 FY27
      </p>
      <ol className="mt-3 max-w-md divide-y divide-border text-sm">
        {[
          ["1", "MTAR Technologies", "8.4"],
          ["2", "Neuland Laboratories", "8.2"],
          ["3", "HFCL", "7.6"],
          ["4", "Pricol", "7.3"],
        ].map(([rank, name, read]) => (
          <li key={name} className="flex items-baseline gap-4 py-2">
            <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
              {rank}
            </span>
            <span className="flex-1 text-foreground">{name}</span>
            <span className="font-medium tabular-nums text-foreground">
              {read}
            </span>
          </li>
        ))}
      </ol>
    </SidebarInset>
  </SidebarProvider>
);
