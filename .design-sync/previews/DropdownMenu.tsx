import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "concall-alpha";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus } from "lucide-react";

// The portal's two real dropdowns are the watchlist manage kebab
// (app/watchlists/[id]/watchlist-manage-menu.tsx) and the "Save to watchlists"
// picker (components/watchlist-button.tsx). Both anchor to a small pill button
// and open with align="end". Every story below is authored OPEN so the menu
// body is visible in a static render — the closed state is just the trigger.

export const CompanyKebabMenu = () => (
  <div className="flex min-h-48 items-start justify-start">
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Company actions">
          <MoreHorizontal /> Manage
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Neuland Laboratories</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Copy company code
            <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>Open Q1 FY27 transcript</DropdownMenuItem>
          <DropdownMenuItem>Open investor presentation</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Q2 FY27 not scored yet</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">
          Report a data issue
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const SaveToWatchlists = () => (
  <div className="flex min-h-56 items-start justify-start">
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Save <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Save to watchlists</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Portfolio</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>
          API compounders
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>SOIC watchlist</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Replacement candidates</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus /> New watchlist…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const SortMenuWithRadioItems = () => (
  <div className="flex min-h-56 items-start justify-start">
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <ArrowUpDown /> Sort board
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Rank the Overall board by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value="blend">
          <DropdownMenuRadioItem value="blend">
            Latest 4Q blend
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="latest">
            Latest quarter only
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="growth">
            Forward growth score
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="delta">
            Biggest move vs Q4 FY26
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const WithSubmenu = () => (
  <div className="flex min-h-56 items-start justify-start">
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Export">
          <MoreHorizontal /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>MTAR Technologies</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Download score history</DropdownMenuItem>
        <DropdownMenuSub open>
          <DropdownMenuSubTrigger>Jump to section</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem>Business Snapshot</DropdownMenuItem>
            <DropdownMenuItem>Moat Analysis</DropdownMenuItem>
            <DropdownMenuItem>Future Growth</DropdownMenuItem>
            <DropdownMenuItem>Valuation Check</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Copy page link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
