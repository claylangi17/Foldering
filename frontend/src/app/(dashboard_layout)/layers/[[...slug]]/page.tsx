// src/app/(dashboard_layout)/layers/[[...slug]]/page.tsx
"use client"; // For useEffect and useState

import Link from 'next/link';
import { useEffect, useState, use, useMemo, useCallback } from 'react'; // Added useCallback
import { fetchLayerData, fetchItemsForLayerDefinitionPk, FrontendLayerNode, FrontendItemInLayer } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PODetailsModalSimple } from "@/components/custom/po-details-modal-simple"; // Using SimpleModal instead of Radix Dialog to fix freezing
import { Folder, FileText, Download, Search as SearchIcon, CalendarDays, Layers as LayersIcon, ChevronRight as ChevronRightIcon } from "lucide-react"; // Icons, Added Download, SearchIcon, CalendarDays, LayersIcon, ChevronRightIcon
import { DataTable } from "@/components/custom/data-table"; // Import DataTable
import { CardViewItems } from './card-view-items'; // Import CardViewItems
import { ItemDisplaySwitcher } from './item-display-switcher'; // Import ItemDisplaySwitcher
import { getItemColumns } from "./item-columns"; // Import getItemColumns function
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import { useAuth } from '@/context/AuthContext'; // Import useAuth to get user role
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Changed import for explicit application
import { Button } from '@/components/ui/button'; // Import Button
import { Input } from "@/components/ui/input"; // Import Input
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import PaginationControls from '@/components/custom/pagination-controls'; // Import PaginationControls

interface LayerPageProps {
    // Params can be a promise in some Next.js contexts, especially with Turbopack/newer versions
    params: Promise<{ slug?: string[] }> | { slug?: string[] };
}

interface DisplayData {
    type: 'layer-listing' | 'item-listing' | 'loading' | 'error' | 'empty';
    currentLevelDisplayed?: number; // Level of the subLayers or items being shown
    layerName?: string; // Name of the L2 layer if showing items
    parentLayerName?: string | null; // Name of the L1 parent layer if showing L2 subLayers
    subLayers?: FrontendLayerNode[];
    items?: FrontendItemInLayer[];
    breadcrumbs: Array<{ name: string; href: string }>;
    error?: string;
}

export default function LayerPage({ params: paramsProp }: LayerPageProps) {
    // Resolve params if it's a Promise, as suggested by the error message
    const params = (typeof (paramsProp as any).then === 'function') ? use(paramsProp as Promise<{ slug?: string[] }>) : (paramsProp as { slug?: string[] });
    const { slug } = params; // e.g., undefined, ['L1', '123'], ['L1', '123', 'L2', '456'], ['L1', '123', 'L2', '456', 'L3', '789']
    const [displayData, setDisplayData] = useState<DisplayData>({ type: 'loading', breadcrumbs: [] });
    const [itemSearchTerm, setItemSearchTerm] = useState(''); // State for item search term
    const [searchByColumn, setSearchByColumn] = useState<string>('PO_NO'); // Default search column
    const [folderSearchTerm, setFolderSearchTerm] = useState(''); // State for folder search term
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedPO, setSelectedPO] = useState<FrontendItemInLayer | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user, token, isLoading } = useAuth(); // Get user, token, and isLoading state from AuthContext
    const [currentCardPage, setCurrentCardPage] = useState(1);
    const [currentDisplayMode, setCurrentDisplayMode] = useState<'card' | 'table'>('card'); // Default to card view
    const ITEMS_PER_CARD_PAGE = 5; // Or any other number you prefer

    const showDetailsCallback = useCallback((item: FrontendItemInLayer) => {
        setSelectedPO(item);
        setIsModalOpen(true);
    }, [setSelectedPO, setIsModalOpen]);

    console.log(`LayerPage Render - User Role for useMemo: ${user?.role}`); // Debug user role
    console.log(`LayerPage Render - isLoading: ${isLoading}, Token: ${token ? token.substring(0,10)+'...' : 'null'}`);
    // Generate columns dynamically based on user role, memoize based on user role
    const columns = useMemo(() => getItemColumns(user?.role, showDetailsCallback), [user?.role, showDetailsCallback]);

    const availableYears = useMemo(() => {
        if (displayData.type === 'item-listing' && displayData.items) {
            return [...new Set(displayData.items.filter(item => item.TGL_PO).map(item => new Date(item.TGL_PO!).getFullYear()))].sort((a, b) => b - a);
        }
        return [];
    }, [displayData]);

    const months = [
        { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
        { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
        { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
        { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
    ];

    const searchableColumns: { value: keyof FrontendItemInLayer | 'ALL'; label: string }[] = [
        { value: 'ALL', label: 'All Fields' },
        { value: 'PO_NO', label: 'PO Number' },
        { value: 'ITEM', label: 'Item Code' },
        { value: 'ITEM_DESC', label: 'Item Desc' },
        { value: 'Supplier_Name', label: 'Supplier' },
        { value: 'PR_No', label: 'PR Number' },
        { value: 'PO_Status', label: 'PO Status' },
        // PO_BUYER removed as it does not exist in FrontendItemInLayer
    ];

    // Add _showDetails method to each item
    const itemsWithViewAction = useMemo(() => {
        if (displayData.type !== 'item-listing' || !displayData.items) return [];
        
        return displayData.items.map(item => ({
            ...item,
            _showDetails: () => {
                setSelectedPO(item);
                setIsModalOpen(true);
            }
        }));
    }, [displayData]);

    const filteredSubLayers = useMemo(() => {
        if (displayData.type === 'layer-listing' && displayData.subLayers) {
            return displayData.subLayers.filter(layer =>
                layer.name.toLowerCase().includes(folderSearchTerm.toLowerCase())
            );
        }
        return [];
    }, [displayData, folderSearchTerm]);

    const filteredItems = useMemo(() => {
        if (!displayData.items) return [];
        let items = displayData.items;

        // Filter by Year
        if (selectedYear && selectedYear !== 'all-years') {
            items = items.filter(item => item.TGL_PO && new Date(item.TGL_PO).getFullYear().toString() === selectedYear);
        }

        // Filter by Month
        if (selectedMonth && selectedMonth !== 'all-months') {
            items = items.filter(item => item.TGL_PO && (new Date(item.TGL_PO).getMonth() + 1).toString() === selectedMonth);
        }

        // Filter by Search Term and Selected Column
        if (itemSearchTerm) {
            const lowercasedFilter = itemSearchTerm.toLowerCase();
            items = items.filter(item => {
                if (searchByColumn === 'ALL') {
                    return (
                        item.PO_NO?.toLowerCase().includes(lowercasedFilter) ||
                        item.ITEM?.toLowerCase().includes(lowercasedFilter) ||
                        item.ITEM_DESC?.toLowerCase().includes(lowercasedFilter) ||
                        item.Supplier_Name?.toLowerCase().includes(lowercasedFilter) ||
                        item.PR_No?.toLowerCase().includes(lowercasedFilter) ||
                        item.PO_Status?.toLowerCase().includes(lowercasedFilter)
                        // PO_BUYER removed from 'ALL' search logic
                    );
                } else {
                    const columnValue = item[searchByColumn as keyof FrontendItemInLayer];
                    return typeof columnValue === 'string' && columnValue.toLowerCase().includes(lowercasedFilter);
                }
            });
        }
        return items;
    }, [displayData.items, itemSearchTerm, selectedYear, selectedMonth, searchByColumn]);

    // Handle PO update from modal
    const handlePOUpdate = useCallback((updatedPO: FrontendItemInLayer) => {
        if (displayData.type !== 'item-listing' || !displayData.items) return;
        
        // Update local data with updated PO information
        const updatedItems = displayData.items.map(item => {
            if (item.id === updatedPO.id) {
                return {
                    ...item,
                    Checklist: updatedPO.Checklist,
                    Keterangan: updatedPO.Keterangan
                };
            }
            return item;
        });
        
        setDisplayData(prev => ({
            ...prev,
            items: updatedItems
        }));
        
        // Update the selected PO if it's still open
        if (selectedPO && selectedPO.id === updatedPO.id) {
            setSelectedPO({
                ...selectedPO,
                Checklist: updatedPO.Checklist,
                Keterangan: updatedPO.Keterangan
            });
        }
    }, [displayData, selectedPO]);

    // Reset card page when slug changes (which implies data reloaded)
    useEffect(() => {
        setCurrentCardPage(1);
    }, [slug]);

    // Calculate paginated items for card view
    const paginatedCardItems = useMemo(() => {
        if (displayData.type !== 'item-listing' || !displayData.items) return [];
        const startIndex = (currentCardPage - 1) * ITEMS_PER_CARD_PAGE;
        const endIndex = startIndex + ITEMS_PER_CARD_PAGE;
        return filteredItems.slice(startIndex, endIndex); // Slice from already filtered items
    }, [currentCardPage, filteredItems, displayData.type, displayData.items]);

    const totalCardPages = useMemo(() => {
        if (displayData.type !== 'item-listing' || !displayData.items) return 0;
        return Math.ceil(filteredItems.length / ITEMS_PER_CARD_PAGE);
    }, [filteredItems, displayData.type, displayData.items]);

    const exportToPDF = () => {
        console.log("Export to PDF triggered."); // Log trigger
        if (displayData.type === 'item-listing' && itemsWithViewAction.length > 0) {
            try { // Wrap PDF generation in try-catch
                const doc = new jsPDF({ orientation: 'landscape' }); // Use landscape for more width

                // Extract headers more reliably, handling cases where header is a function (e.g., for sorting buttons)
                const headerNames = columns
                    .map(col => {
                        const colDef = col as any;
                        if (typeof colDef.header === 'string') {
                            return colDef.header;
                        }
                        // If header is a function (likely for sorting UI), try to get a sensible name.
                        // This might need adjustment based on how your headers are structured.
                        // For now, using accessorKey or id as a fallback if header is not a simple string.
                        return colDef.accessorKey || colDef.id || '';
                    })
                    .filter(header => header && header.toLowerCase() !== 'actions' && header.toLowerCase() !== 'select');

                const itemsToExport = filteredItems.length > 0 ? filteredItems : (displayData.items || []);

                const truncateText = (text: string | null | undefined, maxLength: number): string => {
                    if (text === null || text === undefined) return '';
                    const str = String(text);
                    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
                };

                const tableRows = itemsToExport.map(item => {
                    return columns
                        .filter(col => {
                            const colDef = col as any;
                            const header = typeof colDef.header === 'string' ? colDef.header : (colDef.accessorKey || colDef.id || '');
                            return header && header.toLowerCase() !== 'actions' && header.toLowerCase() !== 'select';
                        })
                        .map(col => {
                            const colDef = col as any;
                            const accessorKey = colDef.accessorKey || colDef.id;
                            let value: any = '';

                            if (accessorKey) {
                                // Simplified value access, assuming item-columns.tsx handles complex data for display
                                // and here we just need the raw or slightly processed value.
                                value = (item as any)[accessorKey];
                                if (accessorKey === 'TGL_PO' || accessorKey === 'PR_Date' || accessorKey === 'RECEIVED_DATE') {
                                    return value ? new Date(value as string).toLocaleDateString() : '-';
                                }
                                if (accessorKey === 'Original_PRICE' || accessorKey === 'Sum_of_Order_Amount_IDR' || accessorKey === 'Cumulative_Item_Amount_IDR') {
                                    const amount = parseFloat(String(value) || '0');
                                    return amount ? amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }) : '-'; // Format as IDR currency
                                }
                                if (accessorKey === 'Checklist') {
                                    return value ? 'Checked' : 'No'; // Represent boolean clearly
                                }
                            }

                            if (accessorKey === 'ITEM_DESC') {
                                return truncateText(String(value), 30);
                            }
                            if (accessorKey === 'Keterangan') {
                                return truncateText(String(value), 25);
                            }
                            if (accessorKey === 'Supplier_Name') {
                                return truncateText(String(value), 20);
                            }

                            return value !== null && value !== undefined ? String(value) : '';
                        });
                });

                console.log("PDF Headers:", headerNames); // Log headers
                console.log("PDF Rows (first 5):", tableRows.slice(0, 5)); // Log first few rows
                console.log(`Total rows for PDF: ${tableRows.length}`);

                autoTable(doc, {
                    head: [headerNames],
                    body: tableRows,
                    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' }, // Smaller font, cell padding, and allow linebreak
                    headStyles: { fontSize: 8, fillColor: [22, 160, 133], textColor: 255 },
                    alternateRowStyles: { fillColor: [245, 245, 245] },
                    tableWidth: 'auto',
                    margin: { top: 10, right: 7, bottom: 10, left: 7 }, // More margin
                    columnStyles: {
                        ITEM_DESC: { cellWidth: 'wrap' }, // Allow ITEM_DESC to wrap
                        Keterangan: { cellWidth: 'wrap' }, // Allow Keterangan to wrap
                        Supplier_Name: { cellWidth: 'wrap' }
                    }
                });

                const safeLayerName = displayData.layerName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'exported_items';
                doc.save(`${safeLayerName}.pdf`);
                console.log("PDF generation successful."); // Log success
            } catch (error) {
                console.error("Error generating PDF:", error); // Log any error during PDF generation
                alert("Failed to generate PDF. See console for details.");
            }
        }
    };

    // Define loadData with useCallback BEFORE the useEffect that calls it
    const loadData = useCallback(async (): Promise<void> => {
            if (!token) { // This check is now for when isLoading is false, but token is still null (e.g. not logged in, or auto-login failed)
                console.log("LayerPage loadData: Auth loaded but no token. User not authenticated.");
                // Optionally set an error state or a message indicating authentication is required
                setDisplayData({ type: 'error', breadcrumbs: [], error: 'Authentication required to view this page.' });
                return;
            }
            console.log(`LayerPage loadData: Attempting to load data with token: ${token.substring(0, 10)}...`);

            // Initial breadcrumbs (can be refined later to show names instead of IDs)
            let currentBreadcrumbs: Array<{ name: string; href: string }> = [];
            if (slug) {
                let pathAccumulator = '/layers';
                slug.forEach(part => {
                    pathAccumulator += `/${part}`; // Keep accumulating the full path for href
                    // Only create a breadcrumb item if the part is NOT 'L1', 'L2', etc.
                    // These non-'L' parts are IDs that will be replaced by names.
                    if (!part.startsWith('L')) {
                        currentBreadcrumbs.push({ name: `Node ${part}`, href: pathAccumulator });
                    }
                });
            }
            setDisplayData({ type: 'loading', breadcrumbs: currentBreadcrumbs });

            let apiSlugForLayers: string[] = [];
            let layerDefinitionPkForItems: number | null = null;
            let effectiveCurrentLevel = 0; // Level of content being displayed

            if (!slug || slug.length === 0) { // Root: /layers -> fetch L1
                apiSlugForLayers = ['L1'];
                effectiveCurrentLevel = 1;
            } else {
                const lastSlugPart = slug[slug.length - 1];
                const secondLastSlugPart = slug.length > 1 ? slug[slug.length - 2] : null;

                if (lastSlugPart.match(/^\d+$/) && secondLastSlugPart) { // Last part is an ID
                    const currentId = parseInt(lastSlugPart, 10);
                    if (secondLastSlugPart === 'L1') { // e.g. /L1/123 -> slug is ['L1', '123']. We want to fetch L2 children of '123'.
                        // The API call for children of L1 node '123' to get L2 nodes is: /layers/L1/123/L2
                        apiSlugForLayers = [...slug, 'L2'];
                        effectiveCurrentLevel = 2; // The sub-layers displayed will be L2
                    } else if (secondLastSlugPart === 'L2') { // e.g. /L1/123/L2/456 -> slug is ['L1', '123', 'L2', '456']
                        // This means '456' is an L2 definition PK. We should fetch items for it.
                        layerDefinitionPkForItems = currentId; // currentId is 456
                        effectiveCurrentLevel = 2; // We are viewing items OF an L2 node. The node itself is L2.
                        // The content (items) can be thought of as "L3 content".
                        // } else if (secondLastSlugPart === 'L3') { // This case is removed for a 2-level folder system + items
                        //     layerDefinitionPkForItems = currentId;
                        //     effectiveCurrentLevel = 3; 
                    } else {
                        setDisplayData({ type: 'error', error: 'Invalid slug structure.', breadcrumbs: currentBreadcrumbs });
                        return;
                    }
                } else {
                    // This case implies slug ends with L1, L2 (e.g. /layers/L1 or /layers/L1/123/L2)
                    // This means the API call should be for the children of the path represented by slug
                    apiSlugForLayers = slug;
                    if (lastSlugPart === 'L1') {
                        effectiveCurrentLevel = 1; // We are at /L1, displaying L1 folders
                    } else if (lastSlugPart === 'L2') {
                        // This means slug is like /L1/parent_l1_pk/L2. We are displaying L2 folders.
                        effectiveCurrentLevel = 2;
                        // } else if (lastSlugPart === 'L3') { // L3 folders are not part of this 2-level design
                        //    effectiveCurrentLevel = 3;
                    } else {
                        setDisplayData({ type: 'error', error: 'Invalid layer marker in slug.', breadcrumbs: currentBreadcrumbs });
                        return;
                    }
                }
            }

            try {
                if (layerDefinitionPkForItems !== null) { // We are fetching items for an L2 layer
                    console.log(`LayerPage loadData: Calling fetchItemsForLayerDefinitionPk for PK ${layerDefinitionPkForItems} with token ${token.substring(0,10)}...`);
                    const layerDataWithItems = await fetchItemsForLayerDefinitionPk(layerDefinitionPkForItems, token); // Fetches L2 items and L2 layer name

                    let updatedBreadcrumbs = [...currentBreadcrumbs];

                    // Update L2 breadcrumb (the last one, for the items' parent layer)
                    if (updatedBreadcrumbs.length > 0) {
                        const lastCrumbIndex = updatedBreadcrumbs.length - 1;
                        const lastCrumb = updatedBreadcrumbs[lastCrumbIndex];
                        if (lastCrumb.name === `Node ${layerDefinitionPkForItems}`) {
                            updatedBreadcrumbs[lastCrumbIndex] = {
                                ...lastCrumb,
                                name: layerDataWithItems.layer_name, // Use actual L2 name
                            };
                        }
                    }

                    // If this L2 layer has an L1 parent, fetch the L1 parent's name
                    // slug structure for L2 items: ['L1', l1_id, 'L2', l2_id_which_is_layerDefinitionPkForItems]
                    if (slug && slug.length === 4 && slug[0] === 'L1' && slug[2] === 'L2') {
                        const l1ParentIdFromSlug = slug[1]; // This is the ID of the L1 parent
                        
                        // The breadcrumb for this L1 parent is expected to be at updatedBreadcrumbs[0]
                        // when the slug is 4 parts long and structured as L1/id1/L2/id2,
                        // because 'L1' and 'L2' markers are skipped in breadcrumb creation.
                        if (updatedBreadcrumbs.length > 0 && updatedBreadcrumbs[0].name === `Node ${l1ParentIdFromSlug}`) {
                            try {
                                console.log(`LayerPage loadData: Attempting to update L1 breadcrumb for ID ${l1ParentIdFromSlug}. Current L1 crumb:`, JSON.stringify(updatedBreadcrumbs[0]));
                                const l1ParentInfo = await fetchLayerData(['L1', l1ParentIdFromSlug], token);
                                console.log(`LayerPage loadData: Response from fetchLayerData(['L1', '${l1ParentIdFromSlug}']):`, JSON.stringify(l1ParentInfo));

                                if (l1ParentInfo.parent_name) {
                                    const l1ParentName = l1ParentInfo.parent_name;
                                    console.log(`LayerPage loadData: Found L1 parent name: '${l1ParentName}' for ID: ${l1ParentIdFromSlug} from 'parent_name' field. Updating breadcrumb.`);
                                    updatedBreadcrumbs[0] = {
                                        ...updatedBreadcrumbs[0],
                                        name: l1ParentName,
                                    };
                                } else {
                                    console.warn(`LayerPage loadData: L1 parent name for ID ${l1ParentIdFromSlug} is MISSING (null) in API response's 'parent_name' field. API Response: ${JSON.stringify(l1ParentInfo)}. Breadcrumb will remain 'Node ${l1ParentIdFromSlug}'. Backend needs to populate 'parent_name' for GET /layers/L1/${l1ParentIdFromSlug}.`);
                                }
                            } catch (e) {
                                console.error(`LayerPage loadData: Error fetching or processing L1 parent name for ID ${l1ParentIdFromSlug}:`, e);
                            }
                        } else {
                            console.warn(`LayerPage loadData: L1 breadcrumb at index 0 not found, or its name does not match 'Node ${l1ParentIdFromSlug}'. Current breadcrumbs:`, JSON.stringify(updatedBreadcrumbs));
                        }
                    }

                    setDisplayData({
                        type: 'item-listing',
                        currentLevelDisplayed: effectiveCurrentLevel,
                        layerName: layerDataWithItems.layer_name,
                        items: layerDataWithItems.items,
                        breadcrumbs: updatedBreadcrumbs,
                    });
                } else if (apiSlugForLayers.length > 0) { // We are fetching a list of sub-layers (L1 or L2 folders)
                    console.log(`LayerPage loadData: Calling fetchLayerData for slug parts: ${apiSlugForLayers.join('/')} with token ${token.substring(0,10)}...`);
                    const fetchedLayerData = await fetchLayerData(apiSlugForLayers, token);

                    let updatedBreadcrumbs = [...currentBreadcrumbs];
                    if (effectiveCurrentLevel === 2 && fetchedLayerData.parent_name && slug && slug.length >= 2) {
                        const l1ParentIdFromSlug = slug[1]; // This is the ID of the L1 parent
                        
                        // The breadcrumb for this L1 parent is expected to be at updatedBreadcrumbs[0]
                        // when the slug is 2 parts long and structured as L1/id1,
                        // because 'L1' marker is skipped in breadcrumb creation.
                        if (updatedBreadcrumbs.length > 0 && updatedBreadcrumbs[0].name === `Node ${l1ParentIdFromSlug}`) {
                            updatedBreadcrumbs[0] = {
                                ...updatedBreadcrumbs[0],
                                name: fetchedLayerData.parent_name,
                            };
                        }
                    }

                    setDisplayData({
                        type: 'layer-listing',
                        currentLevelDisplayed: effectiveCurrentLevel,
                        parentLayerName: fetchedLayerData.parent_name,
                        subLayers: fetchedLayerData.layers,
                        breadcrumbs: updatedBreadcrumbs,
                    });
                } else {
                    setDisplayData({ type: 'empty', breadcrumbs: currentBreadcrumbs });
                }
            } catch (error: any) {
                console.error("Error fetching layer page data:", error);
                setDisplayData({
                    type: 'error',
                    error: error.message || "Failed to load data.",
                    breadcrumbs: currentBreadcrumbs,
                });
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [slug, token, setDisplayData]); // setDisplayData is stable, slug & token are main triggers

    // useEffect to call loadData when auth is ready and loadData itself (or its key dependencies) change
    useEffect(() => {
        console.log(`LayerPage useEffect triggered. isLoading: ${isLoading}, Slug: ${slug ? slug.join('/') : 'undefined'}, Token: ${token ? token.substring(0,10)+'...' : 'null'}`);
        if (isLoading) {
            console.log("LayerPage useEffect: Auth context is loading, deferring data load.");
            // Optionally set a loading state specific to auth if not already handled by global loading
            // setDisplayData({ type: 'loading', breadcrumbs: [], error: 'Authenticating...' });
            return; // Don't proceed if auth is still loading
        }
        // If we reach here, isLoading is false.
        loadData();
    }, [isLoading, loadData]); // Depends on auth loading state and the memoized loadData (which depends on slug, token)

    const currentPathForLinks = slug ? `/layers/${slug.join('/')}` : '/layers';

    // Skeleton component for loading state
    const LayerPageSkeleton = () => (
        <div className="container mx-auto py-10">
            {/* Skeleton for Breadcrumbs */}
            <div className="mb-6 flex space-x-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
            </div>
            {/* Skeleton for Title */}
            <Skeleton className="h-10 w-3/4 mb-6" />

            {/* Skeleton for Cards (if layer listing) or Table (if item listing) */}
            {/* This part can be made more dynamic based on expected content type, but for now, a generic card skeleton */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-1/2 mb-2" />
                            <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Alternatively, if expecting a table: */}
            {/* <div className="rounded-md border">
                <Skeleton className="h-12 w-full mb-1" /> 
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-1" />)}
            </div> */}
        </div>
    );

    if (displayData.type === 'loading') {
        return <LayerPageSkeleton />;
    }

    if (displayData.type === 'error') {
        return <div className="container mx-auto py-10 text-center text-red-600"><p>Error: {displayData.error}</p></div>;
    }

    // Determine title based on displayData
    let pageTitle = "Layers";
    if (displayData.type === 'layer-listing' && displayData.subLayers && displayData.subLayers.length > 0) {
        if (displayData.currentLevelDisplayed === 1) {
            pageTitle = `L1 Categories`;
        } else if (displayData.currentLevelDisplayed === 2 && displayData.parentLayerName) {
            pageTitle = `L2 Categories under ${displayData.parentLayerName}`;
        } else if (displayData.currentLevelDisplayed === 2) {
            // Fallback if parentLayerName is somehow not available but we are at L2
            const parentL1Id = slug && slug.length >= 2 ? slug[1] : "Unknown L1 Parent";
            pageTitle = `L2 Categories (under L1: ${parentL1Id})`;
        } else {
            pageTitle = `Level ${displayData.subLayers[0].level} Categories`; // Generic fallback
        }
    } else if (displayData.type === 'item-listing') {
        pageTitle = `Items in ${displayData.layerName || 'Selected Layer'}`;
    } else if (displayData.type === 'empty') {
        pageTitle = 'No data found for this layer.';
    }

    return (
        <div className="container mx-auto py-10">
            {/* PO Details Modal - Using SimpleModal implementation to fix UI freezing */}
            {selectedPO && (
                <PODetailsModalSimple
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedPO={selectedPO}
                    onItemUpdated={handlePOUpdate}
                    isSPV={user?.role === 'SPV'}
                    showCumulativeData={true} // Explicitly set to true for Layers page
                />
            )}
            
            <div>
                <nav aria-label="breadcrumb" className="mb-6">
                    <ol className="flex space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <li className="flex items-center">
                            <LayersIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <Link href="/layers" className="hover:underline">Layers</Link>
                        </li>
                        {displayData.breadcrumbs.map((crumb, index) => (
                            <li key={index} className="flex items-center">
                                <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
                                {index === displayData.breadcrumbs.length - 1 ? (
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">{crumb.name}</span>
                                ) : (
                                    <Link href={crumb.href} className="hover:underline">{crumb.name}</Link>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>

                <h1 className="mb-6 text-3xl font-bold">
                    {pageTitle}
                </h1>

                {displayData.type === 'layer-listing' && (
                    <>
                        <div className="mb-4">
                            <div className="relative w-full sm:w-[300px]">
                                <SearchIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search folders by name..."
                                    value={folderSearchTerm}
                                    onChange={(e) => {
                                        setFolderSearchTerm(e.target.value);
                                        setCurrentCardPage(1); // Reset to first page on new search
                                    }}
                                    className="pl-8 w-full"
                                />
                            </div>
                        </div>
                        <TooltipProvider> {/* Add TooltipProvider around the grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {filteredSubLayers && filteredSubLayers.length > 0 ? filteredSubLayers.map((layerNode) => {
                                    // Construct href for the next level
                                    const linkSlugParts = slug ? [...slug] : []; // current path parts
                                    if (linkSlugParts.length === 0 && layerNode.level === 1) { // We are at /layers, linking to an L1 node
                                        linkSlugParts.push(`L1`); // Add L1 marker
                                    } else if (linkSlugParts.length > 0 && linkSlugParts[linkSlugParts.length - 1].startsWith('L') && layerNode.level > parseInt(linkSlugParts[linkSlugParts.length - 1].substring(1), 10)) {
                                        // This case should not happen if slug is like /L1/123 and layerNode.level is 2
                                        // This means we are at /L1/123, linking to an L2 node.
                                        // The current slug is like ['L1', '123']
                                        // The layerNode.level is 2. We need to add L2 marker.
                                        // This condition is complex, let's simplify.
                                        // If current slug is ['L1', 'parentL1_PK'], and we are linking to an L2 node (layerNode.level == 2)
                                        // then the new slug part is 'L2', then layerNode.id
                                    }

                                    // Corrected href construction
                                    let newPath = "#"; // Default to a safe fallback
                                    if (displayData.currentLevelDisplayed === 1 && layerNode.level === 1) {
                                        // CASE 1: Current page is /layers (or /layers/L1), displaying L1 folders.
                                        // layerNode is an L1 folder.
                                        // Link to view its L2 children. Path: /layers/L1/{L1_ID}/L2
                                        newPath = `/layers/L1/${layerNode.id}/L2`;
                                    } else if (displayData.currentLevelDisplayed === 2 && layerNode.level === 2) {
                                        // CASE 2: Current page is displaying L2 folders.
                                        // layerNode is an L2 folder.
                                        // Link to view items of this L2 folder. Path: /layers/L1/{parentL1_ID}/L2/{L2_ID}

                                        // The `slug` prop for the current page determines the base of the link.
                                        // If current page URL is /layers/L1/parentL1_ID, then slug is ['L1', 'parentL1_ID']
                                        // If current page URL is /layers/L1/parentL1_ID/L2, then slug is ['L1', 'parentL1_ID', 'L2']

                                        if (slug && slug.length === 2 && slug[0] === 'L1' && slug[1].match(/^\d+$/)) {
                                            // Current page is /layers/L1/parentL1_ID. We are listing L2s.
                                            // layerNode is an L2 folder.
                                            newPath = `/layers/${slug[0]}/${slug[1]}/L2/${layerNode.id}`;
                                        } else if (slug && slug.length === 3 && slug[0] === 'L1' && slug[1].match(/^\d+$/) && slug[2] === 'L2') {
                                            // Current page is /layers/L1/parentL1_ID/L2. We are listing L2s.
                                            // layerNode is an L2 folder.
                                            newPath = `/layers/${slug[0]}/${slug[1]}/${slug[2]}/${layerNode.id}`;
                                        } else {
                                            console.error("Error constructing L2 item link: Unexpected slug structure for L2 listing page.", slug);
                                        }
                                    } else {
                                        console.error(
                                            "Error constructing link: Mismatch in currentLevelDisplayed and layerNode.level or unexpected state.",
                                            `Current Level: ${displayData.currentLevelDisplayed}, Node Level: ${layerNode.level}`
                                        );
                                    }

                                    return (
                                        <Link key={layerNode.id} href={newPath} passHref>
                                            <Card className="hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer h-full flex flex-col">
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <CardTitle className="text-xl font-semibold truncate"> {/* Added truncate */}
                                                                {layerNode.name}
                                                            </CardTitle>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{layerNode.name}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                    {layerNode.level === 1 ? <Folder className="h-5 w-5 text-sky-500" /> : <FileText className="h-5 w-5 text-green-500" />}
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                    <p className="text-sm text-muted-foreground">
                                                        {layerNode.level === 1 ? "General Category" : 
                                                         layerNode.level === 2 ? "Sub-Category" : "Specific Item Type"} 
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                        Contains: {layerNode.item_count != null ? `${layerNode.item_count} ${layerNode.level === 1 ? 'sub-types' : (layerNode.level === 2 ? 'sub-types' : 'POs')}` : 'N/A'}
                                                    </p>
                                                    {/* Display Total POs for L1 and L2 layers */}
                                                    {(layerNode.level === 1 || layerNode.level === 2) && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Total POs: {typeof layerNode.total_po_count === 'number' ? layerNode.total_po_count.toLocaleString() : 'N/A'}
                                                        </p>
                                                    )}
                                                </CardContent>
                                        </Card>
                                    </Link>
                                );
                            }) : (
                                <div className="col-span-full text-center py-10">
                                    <Folder size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
                                    <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                                        {folderSearchTerm ? 'No matching folders found.' : 'No sub-categories found.'}
                                    </p>
                                    {folderSearchTerm && <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search term.</p>}
                                    {!folderSearchTerm && <p className="text-sm text-gray-500 dark:text-gray-400">There are no further classifications under this category.</p>}
                                </div>
                            )}
                        </div>
                    </TooltipProvider>
                </>
            )}

            {displayData.type === 'item-listing' && (
                <div>
                    {displayData.items && displayData.items.length > 0 ? (
                        <>
                            {/* Main Control Bar for Filters and Actions/View Switcher */}
                            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                {/* Left Side: Filters */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    <div className="flex items-center space-x-2 flex-grow md:flex-grow-0 mr-2">
                                    <Select value={searchByColumn} onValueChange={setSearchByColumn}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Search by..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Fields</SelectItem>
                                            <SelectItem value="PO_NO">PO Number</SelectItem>
                                            <SelectItem value="ITEM">Item Code</SelectItem>
                                            <SelectItem value="ITEM_DESC">Item Desc</SelectItem>
                                            <SelectItem value="Supplier_Name">Supplier</SelectItem>
                                            <SelectItem value="PR_No">PR Number</SelectItem>
                                            <SelectItem value="PO_Status">PO Status</SelectItem>
                                            {/* PO_BUYER SelectItem removed */}
                                        </SelectContent>
                                    </Select>
                                    <div className="relative flex-grow">
                                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                        <Input
                                            type="search"
                                            placeholder={`Search ${searchByColumn === 'ALL' ? 'all fields' : (searchableColumns.find(sc => sc.value === searchByColumn)?.label || searchByColumn.replace('_', ' '))}...`}
                                            value={itemSearchTerm}
                                            onChange={(e) => {
                                                setItemSearchTerm(e.target.value);
                                                setCurrentCardPage(1); // Reset to first page on search
                                            }}
                                            className="pl-8 w-full"
                                        />
                                    </div>
                                </div>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="w-full sm:w-[120px]">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-years">All Years</SelectItem>
                                            {availableYears.map(year => (
                                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!(selectedYear && selectedYear !== 'all-years') && availableYears.length > 0}>
                                        <SelectTrigger className="w-full sm:w-[150px]">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-months">All Months</SelectItem>
                                            {months.map(month => (
                                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Right Side: Actions (Export) and View Switcher - Handled by ItemDisplaySwitcher */}
                                <ItemDisplaySwitcher 
                                    items={currentDisplayMode === 'card' ? paginatedCardItems : filteredItems} 
                                    columns={columns} 
                                    onShowDetails={showDetailsCallback} 
                                    currentUserRole={user?.role} 
                                    currentDisplayMode={currentDisplayMode} // Pass currentDisplayMode
                                    onDisplayModeChange={setCurrentDisplayMode} // Pass handler to change mode
                                    requestDataRefresh={() => loadData()} // Pass loadData wrapped in a new function
                                    actionsPrefix={
                                        <Button onClick={exportToPDF} variant="outline" className="whitespace-nowrap">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export to PDF
                                        </Button>
                                    }
                                />
                            </div>

                            {/* Content Area: Cards or Table, rendered based on currentDisplayMode */}
                            {currentDisplayMode === 'card' ? (
                                <CardViewItems items={paginatedCardItems} onShowDetails={showDetailsCallback} currentUserRole={user?.role} />
                            ) : (
                                <DataTable columns={columns} data={filteredItems} />
                            )}
                            
                            {/* Pagination controls remain below the content area, only for card view */}
                            {currentDisplayMode === 'card' && totalCardPages > 1 && (
                                <PaginationControls 
                                    currentPage={currentCardPage}
                                    totalPages={totalCardPages}
                                    onPageChange={setCurrentCardPage}
                                    itemsPerPage={ITEMS_PER_CARD_PAGE}
                                    totalItems={filteredItems.length}
                                />
                            )}
                            
                            {/* PO Details Modal - intentionally removed duplicate modal as it's already at the top level */}
                        </>
                    ) : (
                        <div className="col-span-full text-center py-10">
                            <FileText size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
                            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">No items found in this category.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">There are no purchase orders associated with this specific item type.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
}
