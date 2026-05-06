"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Receipt, Search, Eye, ArrowUpDown, ArrowUp, ArrowDown, FileText, Upload, X } from "lucide-react";

interface Contract {
    id: string;
    contractNumber: string;
    company: {
        id: string;
        name: string;
    };
}
interface Invoice {
    id: string; invoiceNumber: string; contractId: string; contract: Contract;
    totalAmount: number; issueDate: string; dueDate: string; status: "PENDING" | "PAID" | "OVERDUE";
    approvedAt?: string; approvedByUserId?: string;
    paidAmount?: number; paymentDate?: string;
    pdfFilePath?: string | null; pdfFileName?: string | null;
}

const statusLabels = {
    PENDING: { label: "Chờ thanh toán", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    PAID: { label: "Đã thanh toán", color: "bg-green-100 text-green-700 border-green-200" },
    OVERDUE: { label: "Quá hạn-Chưa thanh toán", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function InvoicePage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";
    const isAccountant = userRole === "KE_TOAN";
    const [items, setItems] = useState<Invoice[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        status: "ALL",
        issueDateFrom: "",
        issueDateTo: "",
        dueDateFrom: "",
        dueDateTo: ""
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Invoice | null>(null);
    const [formData, setFormData] = useState({ invoiceNumber: "", contractId: "", totalAmount: "", issueDate: "", dueDate: "" });
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [removePdf, setRemovePdf] = useState(false);
    const [fileError, setFileError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [approvalData, setApprovalData] = useState({ paidAmount: "", paymentDate: "" });
    const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);
    const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
    const [approvalError, setApprovalError] = useState("");
    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [sortColumn, setSortColumn] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    useEffect(() => { fetchData(); fetchContracts(); }, []);

    async function fetchData() {
        const res = await fetch("/api/invoices"); setItems(await res.json()); setLoading(false);
    }
    async function fetchContracts() {
        const res = await fetch("/api/contracts"); setContracts(await res.json());
    }

    // Calculate days remaining until due date (must be before sorted array)
    const calculateDaysRemaining = (dueDate: string): number => {
        const today = new Date();
        const due = new Date(dueDate);
        // Reset time to midnight for accurate day calculation
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const filtered = items.filter(i => {
        // Search filter
        const matchesSearch = i.invoiceNumber.includes(searchTerm) || i.contract.contractNumber.includes(searchTerm);

        // Status filter
        const matchesStatus = filters.status === "ALL" || i.status === filters.status;

        // Issue date filter
        let matchesIssueDate = true;
        if (filters.issueDateFrom) {
            matchesIssueDate = matchesIssueDate && new Date(i.issueDate) >= new Date(filters.issueDateFrom);
        }
        if (filters.issueDateTo) {
            matchesIssueDate = matchesIssueDate && new Date(i.issueDate) <= new Date(filters.issueDateTo);
        }

        // Due date filter
        let matchesDueDate = true;
        if (filters.dueDateFrom) {
            matchesDueDate = matchesDueDate && new Date(i.dueDate) >= new Date(filters.dueDateFrom);
        }
        if (filters.dueDateTo) {
            matchesDueDate = matchesDueDate && new Date(i.dueDate) <= new Date(filters.dueDateTo);
        }

        return matchesSearch && matchesStatus && matchesIssueDate && matchesDueDate;
    });

    // Sort filtered data
    const sorted = [...filtered].sort((a, b) => {
        if (!sortColumn) return 0;

        let aVal: string | number;
        let bVal: string | number;

        switch (sortColumn) {
            case "invoiceNumber":
                aVal = a.invoiceNumber;
                bVal = b.invoiceNumber;
                break;
            case "contract":
                aVal = a.contract.contractNumber;
                bVal = b.contract.contractNumber;
                break;
            case "totalAmount":
                aVal = a.totalAmount;
                bVal = b.totalAmount;
                break;
            case "issueDate":
                aVal = new Date(a.issueDate).getTime();
                bVal = new Date(b.issueDate).getTime();
                break;
            case "dueDate":
                aVal = new Date(a.dueDate).getTime();
                bVal = new Date(b.dueDate).getTime();
                break;
            case "daysRemaining":
                aVal = calculateDaysRemaining(a.dueDate);
                bVal = calculateDaysRemaining(b.dueDate);
                break;
            case "status":
                aVal = a.status;
                bVal = b.status;
                break;
            case "paidAmount":
                aVal = a.paidAmount || 0;
                bVal = b.paidAmount || 0;
                break;
            case "paymentDate":
                aVal = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
                bVal = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    function openCreate() {
        setEditing(null);
        setFormData({ invoiceNumber: "", contractId: "", totalAmount: "", issueDate: "", dueDate: "" });
        setPdfFile(null);
        setRemovePdf(false);
        setFileError("");
        setIsDialogOpen(true);
    }

    function openEdit(item: Invoice) {
        setEditing(item);
        setFormData({ invoiceNumber: item.invoiceNumber, contractId: item.contractId, totalAmount: item.totalAmount.toString(), issueDate: item.issueDate.split("T")[0], dueDate: item.dueDate.split("T")[0] });
        setPdfFile(null);
        setRemovePdf(false);
        setFileError("");
        setIsDialogOpen(true);
    }

    function openView(item: Invoice) {
        setViewingInvoice(item);
        setIsViewDialogOpen(true);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        setFileError("");

        if (!file) {
            setPdfFile(null);
            return;
        }

        // Validate file type
        if (file.type !== "application/pdf") {
            setFileError("Chỉ chấp nhận file PDF");
            setPdfFile(null);
            e.target.value = "";
            return;
        }

        // Validate file size (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setFileError("File không được vượt quá 10MB");
            setPdfFile(null);
            e.target.value = "";
            return;
        }

        setPdfFile(file);
        setRemovePdf(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setUploading(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append("invoiceNumber", formData.invoiceNumber);
            formDataToSend.append("contractId", formData.contractId);
            formDataToSend.append("totalAmount", formData.totalAmount);
            formDataToSend.append("issueDate", formData.issueDate);
            formDataToSend.append("dueDate", formData.dueDate);

            if (pdfFile) {
                formDataToSend.append("pdfFile", pdfFile);
            }

            if (removePdf) {
                formDataToSend.append("removePdf", "true");
            }

            const url = editing ? `/api/invoices/${editing.id}` : "/api/invoices";
            const response = await fetch(url, {
                method: editing ? "PUT" : "POST",
                body: formDataToSend
            });

            if (!response.ok) {
                const error = await response.json();
                setFileError(error.error || "Có lỗi xảy ra");
                setUploading(false);
                return;
            }

            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error submitting form:", error);
            setFileError("Có lỗi xảy ra khi gửi form");
        } finally {
            setUploading(false);
        }
    }
    async function handleDelete(id: string) { if (!confirm("Xác nhận xóa?")) return; await fetch(`/api/invoices/${id}`, { method: "DELETE" }); fetchData(); }

    function openApproval(item: Invoice) {
        setApprovingInvoice(item);
        setApprovalData({ paidAmount: item.totalAmount.toString(), paymentDate: new Date().toISOString().split('T')[0] });
        setApprovalError("");
        setIsApprovalDialogOpen(true);
    }

    async function handleApprove(e: React.FormEvent) {
        e.preventDefault();
        if (!approvingInvoice) return;

        setApprovalError("");

        const response = await fetch(`/api/invoices/${approvingInvoice.id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(approvalData)
        });

        if (!response.ok) {
            const error = await response.json();
            setApprovalError(error.error || "Có lỗi xảy ra");
            return;
        }

        setIsApprovalDialogOpen(false);
        fetchData();
    }

    function resetFilters() {
        setFilters({
            status: "ALL",
            issueDateFrom: "",
            issueDateTo: "",
            dueDateFrom: "",
            dueDateTo: ""
        });
    }

    function handleSort(column: string) {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }

    function getSortIcon(column: string) {
        if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
        return sortDirection === "asc"
            ? <ArrowUp className="w-3 h-3 ml-1" />
            : <ArrowDown className="w-3 h-3 ml-1" />;
    }

    const fmt = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
    const fmtD = (d: string) => new Date(d).toLocaleDateString("vi-VN");

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-7 h-7 text-orange-600" />Hóa đơn</h1>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600"><Plus className="w-4 h-4 mr-2" />Thêm</Button></DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                            <DialogHeader><DialogTitle className="text-slate-800">{editing ? "Sửa" : "Thêm"} hóa đơn</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Số HĐ *</Label>
                                        <Input
                                            value={formData.invoiceNumber}
                                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Hợp đồng *</Label>
                                        <Select
                                            value={formData.contractId}
                                            onValueChange={(v) => setFormData({ ...formData, contractId: v })}
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500">
                                                <SelectValue placeholder="Chọn" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {contracts.map((c) => (
                                                    <SelectItem key={c.id} value={c.id} className="hover:bg-slate-100 cursor-pointer">
                                                        {c.contractNumber}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Tổng tiền *</Label>
                                    <Input
                                        type="number"
                                        value={formData.totalAmount}
                                        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                                        required
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ngày xuất *</Label>
                                        <Input
                                            type="date"
                                            value={formData.issueDate}
                                            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Thời hạn *</Label>
                                        <Input
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* PDF Upload */}
                                <div className="space-y-2">
                                    <Label className="text-slate-700">File PDF (không bắt buộc)</Label>

                                    {editing && editing.pdfFileName && !removePdf && !pdfFile && (
                                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-blue-800 flex-1">{editing.pdfFileName}</span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setRemovePdf(true)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {(!editing || !editing.pdfFileName || removePdf || pdfFile) && (
                                        <div className="space-y-2">
                                            {pdfFile ? (
                                                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                                                    <FileText className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm text-green-800 flex-1">{pdfFile.name}</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => { setPdfFile(null); setRemovePdf(false); }}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                                                    <Upload className="w-5 h-5 text-slate-400" />
                                                    <span className="text-sm text-slate-600">Chọn file PDF (Max 10MB)</span>
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    {fileError && (
                                        <p className="text-xs text-red-600">{fileError}</p>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-200">
                                        {uploading ? "Đang xử lý..." : (editing ? "Lưu" : "Thêm")}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Approval Modal */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Duyệt thanh toán hóa đơn</DialogTitle>
                    </DialogHeader>
                    {approvingInvoice && (
                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <p className="text-slate-600">Số HĐ: <span className="font-semibold text-slate-800">{approvingInvoice.invoiceNumber}</span></p>
                                <p className="text-slate-600">Tổng tiền: <span className="font-semibold text-slate-800">{fmt(approvingInvoice.totalAmount)}</span></p>
                            </div>
                            {approvalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-700 text-sm">{approvalError}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <form onSubmit={handleApprove} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-700">Số tiền thanh toán * (Tự động = Tổng tiền)</Label>
                            <Input
                                type="number"
                                value={approvalData.paidAmount}
                                readOnly
                                className="bg-slate-100 border-slate-200 text-slate-800 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-500">Số tiền thanh toán phải bằng tổng tiền hóa đơn</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Ngày thanh toán *</Label>
                            <Input
                                type="date"
                                value={approvalData.paymentDate}
                                onChange={(e) => setApprovalData({ ...approvalData, paymentDate: e.target.value })}
                                required
                                className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsApprovalDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                Hủy
                            </Button>
                            <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-200">
                                Xác nhận duyệt
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Invoice Modal */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Chi tiết hóa đơn</DialogTitle>
                    </DialogHeader>
                    {viewingInvoice && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm text-slate-600">Tên công ty:</span>
                                        <span className="text-sm font-semibold text-slate-800 text-right">{viewingInvoice.contract.company.name}</span>
                                    </div>
                                    <div className="h-px bg-slate-200"></div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm text-slate-600">Số hợp đồng:</span>
                                        <span className="text-sm font-semibold text-slate-800">{viewingInvoice.contract.contractNumber}</span>
                                    </div>
                                    <div className="h-px bg-slate-200"></div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm text-slate-600">Tổng tiền:</span>
                                        <span className="text-lg font-bold text-blue-600">{fmt(viewingInvoice.totalAmount)}</span>
                                    </div>
                                    {viewingInvoice.pdfFileName && (
                                        <>
                                            <div className="h-px bg-slate-200"></div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-slate-600">File PDF:</span>
                                                <a
                                                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/invoice-pdfs/${viewingInvoice.pdfFilePath}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    {viewingInvoice.pdfFileName}
                                                </a>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" onClick={() => setIsViewDialogOpen(false)} className="bg-slate-600 text-white hover:bg-slate-700">
                            Đóng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Filters Card */}
            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo số HĐ, hợp đồng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                        />
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status Filter */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">Trạng thái</Label>
                            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                                <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-800">
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                                    <SelectItem value="PAID">Đã thanh toán</SelectItem>
                                    <SelectItem value="OVERDUE">Quá hạn-Chưa thanh toán</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Issue Date From */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">Ngày xuất (Từ)</Label>
                            <Input
                                type="date"
                                value={filters.issueDateFrom}
                                onChange={(e) => setFilters({ ...filters, issueDateFrom: e.target.value })}
                                className="bg-white border-slate-200 text-slate-800"
                            />
                        </div>

                        {/* Issue Date To */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">Ngày xuất (Đến)</Label>
                            <Input
                                type="date"
                                value={filters.issueDateTo}
                                onChange={(e) => setFilters({ ...filters, issueDateTo: e.target.value })}
                                className="bg-white border-slate-200 text-slate-800"
                            />
                        </div>

                        {/* Reset Button */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">&nbsp;</Label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetFilters}
                                className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                Đặt lại bộ lọc
                            </Button>
                        </div>
                    </div>

                    {/* Second Row - Due Date Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Due Date From */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">Thời hạn (Từ)</Label>
                            <Input
                                type="date"
                                value={filters.dueDateFrom}
                                onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value })}
                                className="bg-white border-slate-200 text-slate-800"
                            />
                        </div>

                        {/* Due Date To */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 text-sm">Thời hạn (Đến)</Label>
                            <Input
                                type="date"
                                value={filters.dueDateTo}
                                onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value })}
                                className="bg-white border-slate-200 text-slate-800"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Hóa đơn ({sorted.length})</CardTitle>
                    <CardDescription className="text-slate-500">Danh sách hóa đơn</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Đang tải...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="text-slate-500">STT</TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("invoiceNumber")}>
                                        <div className="flex items-center">Số HĐ {getSortIcon("invoiceNumber")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("contract")}>
                                        <div className="flex items-center">Hợp đồng {getSortIcon("contract")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("totalAmount")}>
                                        <div className="flex items-center">Tổng tiền {getSortIcon("totalAmount")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("issueDate")}>
                                        <div className="flex items-center">Ngày xuất {getSortIcon("issueDate")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("dueDate")}>
                                        <div className="flex items-center">Thời hạn {getSortIcon("dueDate")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("daysRemaining")}>
                                        <div className="flex items-center">Số ngày còn lại {getSortIcon("daysRemaining")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("status")}>
                                        <div className="flex items-center">Trạng thái {getSortIcon("status")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("paidAmount")}>
                                        <div className="flex items-center">Số tiền đã TT {getSortIcon("paidAmount")}</div>
                                    </TableHead>
                                    <TableHead className="text-slate-500 cursor-pointer hover:bg-slate-50" onClick={() => handleSort("paymentDate")}>
                                        <div className="flex items-center">Ngày TT {getSortIcon("paymentDate")}</div>
                                    </TableHead>
                                    {(canEdit || isAccountant) && <TableHead className="text-right text-slate-500">Thao tác</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sorted.map((item, i) => (
                                    <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                                        <TableCell className="text-slate-500">{i + 1}</TableCell>
                                        <TableCell className="text-slate-800 font-medium">{item.invoiceNumber}</TableCell>
                                        <TableCell className="text-slate-600">{item.contract.contractNumber}</TableCell>
                                        <TableCell className="text-slate-600">{fmt(item.totalAmount)}</TableCell>
                                        <TableCell className="text-slate-600">{fmtD(item.issueDate)}</TableCell>
                                        <TableCell className="text-slate-600">{fmtD(item.dueDate)}</TableCell>
                                        <TableCell className={`font-semibold ${calculateDaysRemaining(item.dueDate) < 0
                                            ? 'text-red-600'
                                            : calculateDaysRemaining(item.dueDate) <= 7
                                                ? 'text-orange-600'
                                                : 'text-green-600'
                                            }`}>
                                            {calculateDaysRemaining(item.dueDate)} ngày
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusLabels[item.status].color}>
                                                {statusLabels[item.status].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{item.paidAmount ? fmt(item.paidAmount) : "-"}</TableCell>
                                        <TableCell className="text-slate-600">{item.paymentDate ? fmtD(item.paymentDate) : "-"}</TableCell>
                                        {(canEdit || isAccountant) && (
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost" onClick={() => openView(item)} className="text-slate-600 hover:text-slate-700 hover:bg-slate-50">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {canEdit && (
                                                    <>
                                                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {isAccountant && !item.approvedAt && (
                                                    <Button size="sm" variant="default" onClick={() => openApproval(item)} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                                                        Duyệt
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
