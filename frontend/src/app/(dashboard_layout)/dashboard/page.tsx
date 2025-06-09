"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Clock,
  CheckCircle2,
  DollarSign,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const summaryCards = [
  { title: "Total POs", value: "1,250", icon: FileText, color: "text-blue-500" },
  { title: "Pending POs", value: "75", icon: Clock, color: "text-yellow-500" },
  { title: "Completed POs", value: "1,150", icon: CheckCircle2, color: "text-green-500" },
  { title: "Total Amount (IDR)", value: "Rp 2.5B", icon: DollarSign, color: "text-purple-500" },
];

const recentPOs = [
  { poNo: "PO-00123", tglPo: "2023-10-26", status: "Completed", item: "ITM-001", itemDesc: "Laptop Pro 15", qtyOrder: 5, unit: "PCS" },
  { poNo: "PO-00124", tglPo: "2023-10-28", status: "Pending", item: "ITM-002", itemDesc: "Office Chairs", qtyOrder: 20, unit: "UNI" },
  { poNo: "PO-00125", tglPo: "2023-11-01", status: "In Progress", item: "SRV-001", itemDesc: "Cloud Hosting Annual", qtyOrder: 1, unit: "YEA" },
  { poNo: "PO-00126", tglPo: "2023-11-05", status: "Cancelled", item: "ITM-003", itemDesc: "External Hard Drive 2TB", qtyOrder: 2, unit: "PCS" },
  // Add more mock data if needed
];

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'in progress':
      return 'default';
    case 'cancelled':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export default function DashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 4; // Or make this configurable

  const filteredPOs = useMemo(() => {
    if (!searchTerm) {
      return recentPOs;
    }
    return recentPOs.filter(po => 
      po.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.itemDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalItems = filteredPOs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Reset to page 1 when search term changes and current page becomes invalid
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1); // Handles case where search yields no results
    }
  }, [searchTerm, totalPages, currentPage]);

  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPOs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPOs, currentPage, itemsPerPage]);

  const handlePreviousPage = () => console.log("Previous page");
  const handleNextPage = () => console.log("Next page");
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchase Order Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Purchase Order data.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search PO No, Item, Status..."
                className="max-w-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO NO</TableHead>
                <TableHead>TGL PO</TableHead>
                <TableHead>PO STATUS</TableHead>
                <TableHead>ITEM</TableHead>
                <TableHead>ITEM DESC</TableHead>
                <TableHead className="text-right">QTY ORDER</TableHead>
                <TableHead>UNIT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPOs.map((po) => (
                <TableRow key={po.poNo}>
                  <TableCell className="font-medium">{po.poNo}</TableCell>
                  <TableCell>{po.tglPo}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(po.status) as any}>{po.status}</Badge>
                  </TableCell>
                  <TableCell>{po.item}</TableCell>
                  <TableCell>{po.itemDesc}</TableCell>
                  <TableCell className="text-right">{po.qtyOrder}</TableCell>
                  <TableCell>{po.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between border-t bg-background px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Showing <strong>{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}-{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            {/* Basic page number display - can be enhanced */}
            {[...Array(Math.min(3, totalPages))].map((_, i) => {
              let pageNum = i + 1;
              // Adjust page numbers if current page is near the end
              if (totalPages > 3 && currentPage > totalPages - 2) {
                pageNum = totalPages - (2-i);
              } else if (totalPages > 3 && currentPage > 2) {
                pageNum = currentPage -1 + i;
              }

              if (pageNum <= 0 || pageNum > totalPages) return null; // Don't render invalid page numbers

              // Ellipses logic (simplified for brevity, can be expanded)
              if (totalPages > 5) {
                if (i === 0 && pageNum > 1 && currentPage > 3) return <span key={`start-ellipsis-${pageNum}`} className="px-2 py-1 text-sm">...</span>;
                if (i === 2 && pageNum < totalPages && currentPage < totalPages - 2) return <span key={`end-ellipsis-${pageNum}`} className="px-2 py-1 text-sm">...</span>;
              }
              
              // Show first page, last page, and pages around current page
              if (totalPages > 5 && !(pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage -1 && pageNum <= currentPage + 1) )) {
                if (!((currentPage <=3 && pageNum <=3) || (currentPage >= totalPages -2 && pageNum >= totalPages -2))) {
                    return null;
                }
              }

              return (
                <Button
                  key={`page-${pageNum}`}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageClick(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 3 && currentPage < totalPages - 1 && (
                <Button variant="outline" size="sm" onClick={() => handlePageClick(totalPages)}>{totalPages}</Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
