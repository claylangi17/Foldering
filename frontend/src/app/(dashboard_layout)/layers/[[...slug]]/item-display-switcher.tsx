"use client";

import React from 'react';
import { FrontendItemInLayer } from '@/lib/api';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/custom/data-table';
import { CardViewItems } from './card-view-items'; // Import the new CardViewItems
import { LayoutGrid, List } from 'lucide-react'; // Icons for view toggle

interface ItemDisplaySwitcherProps {
  currentDisplayMode: 'card' | 'table';
  onDisplayModeChange: (mode: 'card' | 'table') => void;
  items: FrontendItemInLayer[];
  columns: ColumnDef<FrontendItemInLayer>[];
  onShowDetails: (item: FrontendItemInLayer) => void;
  currentUserRole?: string;
  requestDataRefresh?: () => Promise<void>; // Function to call for data refresh
  actionsPrefix?: React.ReactNode; // To add elements before the view toggle
  // Token is not explicitly passed here, CardViewItems and DataTable (via item-columns) use useAuth internally
}

export const ItemDisplaySwitcher: React.FC<ItemDisplaySwitcherProps> = ({ items, columns, onShowDetails, currentUserRole, requestDataRefresh, currentDisplayMode, onDisplayModeChange, actionsPrefix }) => {
  return (
    <div className="flex items-center gap-2"> {/* Container for switcher buttons and prefix */}
      {actionsPrefix}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Button
          variant={currentDisplayMode === 'card' ? "secondary" : "ghost"}
          size="sm"
          onClick={() => { onDisplayModeChange('card'); if (requestDataRefresh) requestDataRefresh(); }}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentDisplayMode === 'card' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted text-muted-foreground'}`}
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Card View
        </Button>
        <Button
          variant={currentDisplayMode === 'table' ? "secondary" : "ghost"}
          size="sm"
          onClick={() => { onDisplayModeChange('table'); if (requestDataRefresh) requestDataRefresh(); }}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentDisplayMode === 'table' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted text-muted-foreground'}`}
        >
          <List className="h-4 w-4 mr-2" />
          Table View
        </Button>
      </div>
    </div>
  );
};
