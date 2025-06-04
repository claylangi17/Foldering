"use client";

import React, { useState, useEffect } from 'react';
import { SimpleModal } from "@/components/custom/simple-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { updatePOChecklist, updatePOKeterangan } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { FrontendItemInLayer } from '@/lib/api';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';

interface PODetailsModalSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPO: FrontendItemInLayer;
  onItemUpdated?: (updatedItem: FrontendItemInLayer) => void;
  isSPV?: boolean;
  showCumulativeData?: boolean; // New prop to control cumulative data visibility
}

export function PODetailsModalSimple({ 
  isOpen, 
  onClose, 
  selectedPO, 
  onItemUpdated, 
  isSPV,
  showCumulativeData = false // Default to false if not provided
}: PODetailsModalSimpleProps) {
  const { token, user } = useAuth(); // Added user
  console.log("[PODetailsModalSimple] Received isSPV prop:", isSPV);
  
  // Check if user is SPV (able to edit)
  const isSpvUser = isSPV !== undefined ? isSPV : false;
  console.log("[PODetailsModalSimple] Calculated isSpvUser:", isSpvUser);

  // Determine if Keterangan can be edited
  const canEditKeterangan = isSpvUser || user?.role?.toUpperCase() === 'USER';
  const showSaveChangesButton = isSpvUser || user?.role?.toUpperCase() === 'USER';
  
  // Local state for editable fields
  const [isChecked, setIsChecked] = useState<boolean>(selectedPO?.Checklist ?? false);
  const [keterangan, setKeterangan] = useState<string>(selectedPO?.Keterangan ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form values when modal opens with new PO
  useEffect(() => {
    if (selectedPO) {
      setIsChecked(selectedPO.Checklist ?? false);
      setKeterangan(selectedPO.Keterangan ?? '');
    }
  }, [selectedPO]);

  const handleSave = async () => {
    if (!selectedPO?.id || !token) {
      toast({
        title: "Error",
        description: "Missing required data to update PO",
        variant: "destructive"
      });
      return;
    }

    console.log('[handleSave] Attempting to save. States:', {
      isSpvUser,
      originalChecklist: selectedPO.Checklist,
      currentChecklist: isChecked,
      originalKeterangan: selectedPO.Keterangan,
      currentKeterangan: keterangan,
      tokenExists: !!token
    });
    setIsSubmitting(true);

    try {
      let updatedItem = { ...selectedPO }; // Start with a copy of selectedPO
      let changesMade = false;

      // Update checklist if changed and user is SPV
      if (isChecked !== selectedPO.Checklist) {
        console.log('[handleSave] Checklist changed. Original:', selectedPO.Checklist, 'New:', isChecked);
        if (!isSpvUser) {
          toast({
            title: "Permission Denied",
            description: "Only SPV users can update the checklist.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          console.log('[handleSave] Non-SPV tried to change checklist. Aborting save for checklist.');
          return; // Stop if non-SPV tries to change checklist
        }
        console.log('[handleSave] Calling updatePOChecklist API.');
        updatedItem = await updatePOChecklist(selectedPO.id, isChecked, token);
        console.log('[handleSave] updatePOChecklist API success.');
        changesMade = true;
      }
      
      // Update keterangan if changed (user role is already checked by canEditKeterangan for UI)
      if (keterangan !== selectedPO.Keterangan) {
        console.log('[handleSave] Keterangan changed. Original:', selectedPO.Keterangan, 'New:', keterangan);
        // If checklist was updated, pass the updatedItem from that step
        const baseItemForKeteranganUpdate = changesMade ? updatedItem : selectedPO;
        console.log('[handleSave] Calling updatePOKeterangan API with itemId:', baseItemForKeteranganUpdate.id);
        updatedItem = await updatePOKeterangan(baseItemForKeteranganUpdate.id, keterangan, token);
        console.log('[handleSave] updatePOKeterangan API success.');
        // Ensure checklist status from a potential previous update is preserved
        if (changesMade && baseItemForKeteranganUpdate.Checklist !== undefined) {
            updatedItem.Checklist = baseItemForKeteranganUpdate.Checklist;
        } else if (!changesMade) {
            updatedItem.Checklist = isChecked; // Keterangan changed, checklist did not but preserve its current UI state
        }
        changesMade = true;
      }
      
      if (changesMade) {
        // Notify parent component about the update
        if (onItemUpdated) {
          onItemUpdated(updatedItem);
        }
        toast({
          title: "Success",
          description: "Purchase order updated successfully"
        });
      } else {
        toast({
          title: "No Changes",
          description: "No changes were detected to save."
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error('[handleSave] Error during save:', error);
      console.error('[handleSave] Error message:', error.message);
      console.error('[handleSave] Error stack:', error.stack);
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format dates nicely
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  if (!selectedPO) return null;

  // Create footer content for the SimpleModal
  const footerContent = (
    <> 
      <Button variant="outline" onClick={onClose}>Close</Button>
      {showSaveChangesButton && (
        <Button onClick={handleSave} disabled={isSubmitting} className="ml-2">
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </>
  );

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Order Details"
      className="sm:max-w-[600px]"
      footerContent={footerContent}
    >
      <div className="grid gap-6 py-4">
        {/* Basic PO Info */}
        {/* Basic PO Info - Refined to 2 columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <Label className="text-muted-foreground">PO Number</Label>
            <p className="font-medium">{selectedPO.PO_NO || 'N/A'}</p> {/* Corrected to PO_NO */}
          </div>
          <div>
            <Label className="text-muted-foreground">PO Date</Label>
            <p className="font-medium">{formatDate(selectedPO.TGL_PO)}</p>
          </div>
        </div>
        
        <Separator />
        
        {/* Item Details */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Item Code</Label>
          <p className="font-medium">{selectedPO.ITEM || 'N/A'}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Item Description</Label>
          <p className="font-medium">{selectedPO.ITEM_DESC || 'N/A'}</p>
        </div>
        {/* Item Details - Refined to 2 columns where appropriate */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <Label className="text-muted-foreground">Quantity</Label>
            <p className="font-medium">{selectedPO.QTY_ORDER || 0} {selectedPO.UNIT || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Unit Price</Label>
            <p className="font-medium">{formatCurrency(Number(selectedPO.Original_PRICE || 0))}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Currency</Label>
            <p className="font-medium">{selectedPO.Currency || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Item Order Amount (IDR)</Label>
            <p className="font-medium">{formatCurrency(Number(selectedPO.Order_Amount_IDR || 0))}</p>
          </div>
        </div>
        
        <Separator />
        
        {/* Supplier Info */}
        <div>
          <Label className="text-muted-foreground">Supplier</Label>
          <p className="font-medium">{selectedPO.Supplier_Name || 'N/A'}</p>
        </div>
        
        <div> {/* This div is for the Total PO Amount, keeping it separate for emphasis */}
          <Label className="text-muted-foreground">Total PO Amount (IDR)</Label>
          <p className="font-medium">{formatCurrency(Number(selectedPO.Sum_of_Order_Amount_IDR || 0))}</p>
        </div>

        <Separator />

        {/* Purchase Requisition Details - Refined to 2 columns */}
        <h4 className="text-md font-semibold mt-4 mb-2">Purchase Requisition Details</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <Label className="text-muted-foreground">PR Number</Label>
            <p className="font-medium">{selectedPO.PR_No || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">PR Date</Label>
            <p className="font-medium">{formatDate(selectedPO.PR_Date)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">PR Ref A</Label>
            <p className="font-medium">{selectedPO.PR_Ref_A || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">PR Ref B</Label>
            <p className="font-medium">{selectedPO.PR_Ref_B || 'N/A'}</p>
          </div>
        </div>
        
        <Separator />

        {/* PO Status and Terms - Refined to 2 columns */}
        <h4 className="text-md font-semibold mt-4 mb-2">PO Status & Terms</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <Label className="text-muted-foreground">PO Status</Label>
            <p className="font-medium">{selectedPO.PO_Status || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Payment Terms</Label>
            <p className="font-medium">{selectedPO.Term_Payment_at_PO || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Received Date</Label>
            <p className="font-medium">{formatDate(selectedPO.RECEIVED_DATE)}</p>
          </div>
        </div>

        {/* Conditional Cumulative Data - Refined to 2 columns */}
        {showCumulativeData && (
          <>
            <Separator />
            <h4 className="text-md font-semibold mt-4 mb-2">Cumulative Data (Layer Specific)</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <Label className="text-muted-foreground">Cumulative Item Quantity (This Item)</Label>
                <p className="font-medium">{selectedPO.Cumulative_Item_QTY || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cumulative Item Amount (This Item)</Label>
                <p className="font-medium">{formatCurrency(Number(selectedPO.Cumulative_Item_Amount_IDR || 0))}</p>
              </div>
            </div>
          </>
        )}
        
        <Separator className="my-4" />
        
        {/* Editable Fields - Only SPV can edit */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="checklist"
              checked={isChecked}
              onCheckedChange={(checked) => isSpvUser && setIsChecked(!!checked)}
              disabled={!isSpvUser || isSubmitting}
            />
            <Label 
              htmlFor="checklist" 
              className={!isSpvUser ? "text-muted-foreground cursor-not-allowed" : ""}
            >
              Approved
            </Label>
            {!isSpvUser && <span className="text-sm text-muted-foreground">(SPV only)</span>}
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="keterangan">Notes (Keterangan)</Label>
          <Textarea
            id="keterangan"
            placeholder={canEditKeterangan ? "Enter notes here..." : "Notes are view-only for your role"}
            value={keterangan}
            onChange={(e) => canEditKeterangan && setKeterangan(e.target.value)}
            rows={3}
            disabled={!canEditKeterangan || isSubmitting}
            className={!canEditKeterangan ? "bg-muted cursor-not-allowed" : ""}
          />
        </div>
      </div>
    </SimpleModal>
  );
}
