"use client";

import React, { useState, useEffect } from 'react';
import { FrontendItemInLayer, updatePOChecklist, updatePOKeterangan } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  Building,
  Package as PackageIcon,
  FileText as FileTextIcon,
  Eye as EyeIcon,
  Edit as EditIcon,
  NotebookPen,
  Settings,
  GripVertical,
  Building2,
  CalendarDays,
  ListChecks,
  BarChartBig,
  Edit3,
  CheckCircle,
  Circle,
  Save
} from 'lucide-react';

interface CardViewItemsProps {
  items: FrontendItemInLayer[];
  onShowDetails: (item: FrontendItemInLayer) => void;
  currentUserRole?: string;
  onItemsUpdate?: (updatedItems: FrontendItemInLayer[]) => void;
}

const formatCurrency = (amount: number | null | undefined, currencyCode: string = "IDR") => {
  if (amount == null) return "-";
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return dateString; // Return original if parsing fails
  }
};

import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea"; 
import { cn } from "@/lib/utils";

const CardItem: React.FC<{ item: FrontendItemInLayer; onShowDetails: (item: FrontendItemInLayer) => void; currentUserRole?: string; onUpdateItem: (updatedItem: FrontendItemInLayer) => void; }> = ({ item, onShowDetails, currentUserRole, onUpdateItem }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { token } = useAuth();
  const isSpv = currentUserRole?.toLowerCase() === 'spv';
  const canEditKeteranganInCard = isSpv || currentUserRole?.toLowerCase() === 'user';
  const showSaveButtonInCard = isSpv || currentUserRole?.toLowerCase() === 'user'; // Show if SPV (can edit both) or USER (can edit Keterangan)

  const [keterangan, setKeterangan] = useState(item.Keterangan || "");
  const [checklist, setChecklist] = useState(item.Checklist || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChanges = async () => {
    if (!token) {
      toast.error("Authentication token not found. Please log in again.");
      return;
    }
    // No longer strictly checking for SPV here, as USER can save Keterangan

    if (typeof item.id !== 'number') { // Check item.id instead of item.db_id
      console.error("Save Changes Error: item.id is missing or invalid. Item:", JSON.stringify(item, null, 2));
      toast.error("Cannot save changes: Item ID (item.id) is missing. Please refresh and try again.");
      setIsSaving(false); // Ensure saving state is reset
      return;
    }
    setIsSaving(true);

    const originalPropChecklist = item.Checklist; // Use item prop for original value
    const originalPropKeterangan = item.Keterangan || ""; // Use item prop for original value

    let itemActuallyUpdated = false;

    try {
      // Update Checklist if local state 'checklist' differs from original prop value (SPV only)
      if (isSpv && checklist !== originalPropChecklist) {
        await updatePOChecklist(item.id, checklist, token); // Use item.id
        itemActuallyUpdated = true;
      }

      // Update Keterangan if local state 'keterangan' differs from original prop value
      if (keterangan !== originalPropKeterangan) {
        await updatePOKeterangan(item.id, keterangan, token); // Use item.id
        itemActuallyUpdated = true;
      }

      if (itemActuallyUpdated) {
        toast.success("Changes saved successfully!");
        // Call onUpdateItem (prop of CardItem) to notify parent (CardViewItems)
        if (onUpdateItem) { 
          onUpdateItem({ ...item, Checklist: checklist, Keterangan: keterangan });
        }
      } else {
        toast.info("No changes to save.");
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
      // Optionally revert local state to original prop values on error
      // setChecklist(originalPropChecklist);
      // setKeterangan(originalPropKeterangan);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    setKeterangan(item.Keterangan || "");
    setChecklist(!!item.Checklist);
  }, [item.Keterangan, item.Checklist]);

  const poStatusDisplay = (status: string | null | undefined) => {
    if (!status) return { text: "N/A", className: "bg-gray-100 text-gray-800" };
    if (status.toLowerCase().includes("sent")) return { text: status, className: "bg-green-100 text-green-800" };
    if (status.toLowerCase().includes("pending")) return { text: status, className: "bg-yellow-100 text-yellow-800" };
    return { text: status, className: "bg-blue-100 text-blue-800" };
  };

  const statusInfo = poStatusDisplay(item.PO_Status);

  return (
    <Card className={cn(
      "w-full shadow-md hover:shadow-lg transition-shadow duration-200",
      checklist && "bg-green-50 border-l-4 border-green-500"
    )}>
      <CardHeader onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="bg-blue-50 p-2 md:p-3 rounded-lg">
              <FileTextIcon className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base md:text-lg font-semibold text-gray-900">PO #{item.PO_NO || 'N/A'}</CardTitle>
              <CardDescription className="text-sm md:text-base text-gray-500 mt-1 truncate max-w-[200px] sm:max-w-[300px] md:max-w-xs" title={item.ITEM_DESC || ''}>
                {item.ITEM_DESC || 'No description'}
              </CardDescription>
              <div className="mt-1"> 
                <div className="text-xs md:text-sm text-gray-500">
                  <span className="font-medium text-gray-600">Cum. Qty:</span> {item.Cumulative_Item_QTY ?? '-'}
                </div>
                <div className="text-xs md:text-sm text-gray-500">
                  <span className="font-medium text-gray-600">Cum. Amt:</span> {formatCurrency(item.Cumulative_Item_Amount_IDR ? parseFloat(item.Cumulative_Item_Amount_IDR as any) : null, 'IDR')}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="text-right">
              <div className="text-base md:text-xl font-bold text-green-600">{formatCurrency(item.Sum_of_Order_Amount_IDR ? parseFloat(item.Sum_of_Order_Amount_IDR as any) : null, 'IDR')}</div>
              <div className="text-xs md:text-sm text-gray-500">
                {item.QTY_ORDER?.toLocaleString() || 'N/A'} {item.UNIT || ''}
              </div>
            </div>
            <span className={`px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium ${statusInfo.className}`}>
              {statusInfo.text}
            </span>
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-gray-400" /> :
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            }
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t border-gray-200 bg-gray-50 p-4 md:p-6">
          <div>
            <div>
              <div>
                <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2 flex items-center"><Building2 className="w-4 h-4 mr-2 text-primary" />Supplier</h4>
                <p className="text-xs md:text-sm text-gray-700 truncate" title={item.Supplier_Name || ''}>{item.Supplier_Name || '-'}</p>
              </div>
              <hr className="my-4 border-gray-200" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div> 
                  <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2 flex items-center"><CalendarDays className="w-4 h-4 mr-2 text-primary" />Dates</h4>
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">PO Date:</span><span className="font-medium">{formatDate(item.TGL_PO)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">PR Date:</span><span className="font-medium">{formatDate(item.PR_Date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Received Date:</span><span className="font-medium">{formatDate(item.RECEIVED_DATE)}</span></div> 
                  </div>
                </div>
                <div> 
                  <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2 flex items-center"><ListChecks className="w-4 h-4 mr-2 text-primary" />Item Details</h4>
                  <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Code:</span><span className="font-medium truncate" title={item.ITEM || ''}>{item.ITEM || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Unit Price:</span><span className="font-medium">{formatCurrency(item.Original_PRICE, item.Currency || undefined)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Order Amount (IDR):</span><span className="font-medium">{formatCurrency(parseFloat(item.Order_Amount_IDR as any) || 0, 'IDR')}</span></div>
                  </div>
                </div>
              </div>
              <hr className="my-4 border-gray-200" />
              <div>
                <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-2 flex items-center"><FileTextIcon className="w-4 h-4 mr-2 text-primary" />References</h4>
                <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">PR No:</span><span className="font-medium truncate" title={item.PR_No || ''}>{item.PR_No || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">PR Ref A:</span><span className="font-medium truncate" title={item.PR_Ref_A || ''}>{item.PR_Ref_A || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">PR Ref B:</span><span className="font-medium truncate" title={item.PR_Ref_B || ''}>{item.PR_Ref_B || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Payment Term:</span><span className="font-medium truncate" title={item.Term_Payment_at_PO || ''}>{item.Term_Payment_at_PO || '-'}</span></div>
                </div>
              </div>

              <hr className="my-4 border-gray-200" />
            </div>
          </div> 
          <div className="mt-4 p-4 border-t">
            <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
              <Edit3 className="inline-block mr-2 h-4 w-4 text-gray-500" />
              Keterangan
            </h4>
            {canEditKeteranganInCard ? (
              <Textarea
                value={keterangan}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKeterangan(e.target.value)}
                placeholder={isSpv ? "Add note (SPV)..." : "Add note (User)..."}
                className="w-full text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.Keterangan || "-"}</p>
            )}
          </div>

          <div className="mt-1 p-4 border-t">
            <h4 className="text-sm font-semibold mb-2 text-gray-700 flex items-center">
              <ListChecks className="inline-block mr-2 h-5 w-5 text-gray-500" />
              Actions
            </h4>
            <div className="flex items-center space-x-2">
              {isSpv ? (
                <Checkbox
                  id={`checklist-${item.id}`}
                  checked={checklist}
                  onCheckedChange={(checked) => setChecklist(Boolean(checked))}
                  className="h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
              ) : (
                <Checkbox id={`checklist-${item.id}`} checked={item.Checklist || false} disabled className="h-5 w-5" />
              )}
              <label htmlFor={`checklist-${item.id}`} className="text-base text-gray-700 font-medium">Checklist</label>
            </div>
            {showSaveButtonInCard && (
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const CardViewItems: React.FC<CardViewItemsProps> = ({ items, onShowDetails, currentUserRole, onItemsUpdate }) => {
  if (!items || items.length === 0) {
    return <div className="text-center text-gray-500 py-8">No items to display.</div>;
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <CardItem 
          key={item.id} 
          item={item} 
          onShowDetails={onShowDetails} 
          currentUserRole={currentUserRole} 
          onUpdateItem={(updatedItem) => {
            if(onItemsUpdate) {
              const updatedItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
              onItemsUpdate(updatedItems);
            }
          }}
        />
      ))}
    </div>
  );
};
