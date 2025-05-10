// src/app/(dashboard_layout)/layers/[[...slug]]/page.tsx
"use client"; // For useEffect and useState

import Link from 'next/link';
import { useEffect, useState, use } from 'react'; // Added 'use'
import { fetchLayerData, fetchItemsForLayerDefinitionPk, FrontendLayerNode, FrontendItemInLayer } from '@/lib/api';

interface LayerPageProps {
    // Params can be a promise in some Next.js contexts, especially with Turbopack/newer versions
    params: Promise<{ slug?: string[] }> | { slug?: string[] };
}

interface DisplayData {
    type: 'layer-listing' | 'item-listing' | 'loading' | 'error' | 'empty';
    currentLevelDisplayed?: number; // Level of the subLayers or items being shown
    layerName?: string; // Name of the layer if showing items
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

    useEffect(() => {
        async function loadData() {
            // Initial breadcrumbs (can be refined later to show names instead of IDs)
            let currentBreadcrumbs: Array<{ name: string; href: string }> = [];
            if (slug) {
                let pathAccumulator = '/layers';
                slug.forEach(part => {
                    pathAccumulator += `/${part}`;
                    currentBreadcrumbs.push({ name: part.startsWith('L') ? part : `Node ${part}`, href: pathAccumulator });
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
                if (layerDefinitionPkForItems !== null) {
                    const fetchedItems = await fetchItemsForLayerDefinitionPk(layerDefinitionPkForItems);
                    setDisplayData({
                        type: 'item-listing',
                        currentLevelDisplayed: effectiveCurrentLevel,
                        layerName: `Node ${layerDefinitionPkForItems}`, // Placeholder name
                        items: fetchedItems,
                        breadcrumbs: currentBreadcrumbs,
                    });
                } else if (apiSlugForLayers.length > 0) {
                    const fetchedSubLayers = await fetchLayerData(apiSlugForLayers);
                    setDisplayData({
                        type: 'layer-listing',
                        currentLevelDisplayed: effectiveCurrentLevel,
                        subLayers: fetchedSubLayers,
                        breadcrumbs: currentBreadcrumbs,
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
        }

        loadData();
    }, [slug]);

    const currentPathForLinks = slug ? `/layers/${slug.join('/')}` : '/layers';

    if (displayData.type === 'loading') {
        return <div className="container mx-auto py-10 text-center"><p>Loading layer data...</p></div>;
    }

    if (displayData.type === 'error') {
        return <div className="container mx-auto py-10 text-center text-red-600"><p>Error: {displayData.error}</p></div>;
    }

    // Determine title based on displayData
    let pageTitle = "Layers";
    if (displayData.type === 'layer-listing' && displayData.subLayers && displayData.subLayers.length > 0) {
        pageTitle = `Level ${displayData.subLayers[0].level} Categories`;
        if (slug && slug.length > 0) {
            const parentIdentifier = slug[slug.length - 1].startsWith('L') ? (slug.length > 1 ? slug[slug.length - 2] : slug[slug.length - 1]) : slug[slug.length - 1];
            pageTitle += ` (under ${parentIdentifier})`;
        }
    } else if (displayData.type === 'item-listing') {
        pageTitle = `Items in ${displayData.layerName || 'Selected Layer'}`;
    } else if (displayData.type === 'empty') {
        pageTitle = 'No data found for this layer.';
    }


    return (
        <div className="container mx-auto py-10">
            <nav aria-label="breadcrumb" className="mb-6">
                <ol className="flex space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <li>
                        <Link href="/layers" className="hover:underline">Layers</Link>
                    </li>
                    {displayData.breadcrumbs.map((crumb, index) => (
                        <li key={index} className="flex items-center">
                            <span className="mx-2">/</span>
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {displayData.subLayers && displayData.subLayers.length > 0 ? displayData.subLayers.map((layerNode) => {
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

                        // Simplified href construction:
                        // If current slug is empty (root /layers), link is /layers/L1/layerNode.id
                        // If current slug is /layers/L1/parentL1_pk, link is /layers/L1/parentL1_pk/L2/layerNode.id
                        let newPath = currentPathForLinks;
                        if (newPath === '/layers') { // Root, linking to L1
                            newPath = `/layers/L1/${layerNode.id}`;
                        } else { // Already in a layer, linking to a sub-layer
                            // currentPathForLinks is like /layers/L1/123
                            // layerNode.level should be 2 if it's an L2 node
                            newPath = `${currentPathForLinks}/L${layerNode.level}/${layerNode.id}`;
                        }

                        return (
                            <Link
                                key={layerNode.id}
                                href={newPath}
                                className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                            >
                                <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {layerNode.name} {layerNode.level === 1 ? "(L1 Folder)" : "(L2 Item Type)"}
                                </h5>
                                <p className="font-normal text-gray-700 dark:text-gray-400">
                                    {layerNode.item_count != null ? `${layerNode.item_count} ${layerNode.level === 1 ? 'types' : 'POs'}` : 'N/A'}
                                </p>
                            </Link>
                        );
                    }) : <p>No sub-categories found.</p>}
                </div>
            )}

            {displayData.type === 'item-listing' && (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="py-3 px-6">PO Number</th>
                                <th scope="col" className="py-3 px-6">PO Date</th>
                                <th scope="col" className="py-3 px-6">Item Code</th>
                                <th scope="col" className="py-3 px-6">Item Desc</th>
                                <th scope="col" className="py-3 px-6">Qty</th>
                                <th scope="col" className="py-3 px-6">Unit</th>
                                <th scope="col" className="py-3 px-6">Price</th>
                                <th scope="col" className="py-3 px-6">Currency</th>
                                <th scope="col" className="py-3 px-6">Supplier</th>
                                <th scope="col" className="py-3 px-6">PR No</th>
                                <th scope="col" className="py-3 px-6">PR Date</th>
                                <th scope="col" className="py-3 px-6">PR Ref A</th>
                                <th scope="col" className="py-3 px-6">PR Ref B</th>
                                <th scope="col" className="py-3 px-6">Payment Term</th>
                                <th scope="col" className="py-3 px-6">Received Date</th>
                                <th scope="col" className="py-3 px-6">Sum Amount IDR</th>
                                <th scope="col" className="py-3 px-6">Checklist</th>
                                <th scope="col" className="py-3 px-6">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.items && displayData.items.length > 0 ? displayData.items.map((item) => (
                                <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                        {item.PO_No || item.id}
                                    </th>
                                    <td className="py-4 px-6">{item.TGL_PO ? new Date(item.TGL_PO).toLocaleDateString() : "-"}</td>
                                    <td className="py-4 px-6">{item.ITEM || "-"}</td>
                                    <td className="py-4 px-6">{item.ITEM_DESC || "-"}</td>
                                    <td className="py-4 px-6">{item.QTY_ORDER != null ? item.QTY_ORDER : "-"}</td>
                                    <td className="py-4 px-6">{item.UNIT || "-"}</td>
                                    <td className="py-4 px-6">{item.Original_PRICE != null ? item.Original_PRICE.toLocaleString() : "-"}</td>
                                    <td className="py-4 px-6">{item.Currency || "-"}</td>
                                    <td className="py-4 px-6">{item.Supplier_Name || "-"}</td>
                                    <td className="py-4 px-6">{item.PR_No || "-"}</td>
                                    <td className="py-4 px-6">{item.PR_Date ? new Date(item.PR_Date).toLocaleDateString() : "-"}</td>
                                    <td className="py-4 px-6">{item.PR_Ref_A || "-"}</td>
                                    <td className="py-4 px-6">{item.PR_Ref_B || "-"}</td>
                                    <td className="py-4 px-6">{item.Term_Payment_at_PO || "-"}</td>
                                    <td className="py-4 px-6">{item.RECEIVED_DATE ? new Date(item.RECEIVED_DATE).toLocaleDateString() : "-"}</td>
                                    <td className="py-4 px-6">{item.Sum_of_Order_Amount_IDR != null ? item.Sum_of_Order_Amount_IDR.toLocaleString() : "-"}</td>
                                    <td className="py-4 px-6">
                                        <input type="checkbox" checked={!!item.Checklist} readOnly className="form-checkbox h-5 w-5 text-blue-600" />
                                    </td>
                                    <td className="py-4 px-6">{item.Keterangan || "-"}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={18} className="py-4 px-6 text-center">No items found in this category.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
