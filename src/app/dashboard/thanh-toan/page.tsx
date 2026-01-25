"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Pencil, Trash2, CreditCard, Search } from "lucide-react";

interface Contract { id: string; contractNumber: string; }
interface Invoice { id: string; invoiceNumber: string; }
interface Payment {
    id: string; contractId: string; contract: Contract; paymentNumber: string;
    invoiceId: string | null; invoice: Invoice | null;
    prevCumulativeComplete: number; prevAdvancePayment: number; prevDirectPayment: number; prevAdvanceBalance: number;
    requestedAmount: number; advancePayment: number; directPayment: number; paymentDate: string;
}

export default function PaymentPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";

    const [items, setItems] = useState<Payment[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Payment | null>(null);
    const [formData, setFormData] = useState({
        contractId: "", paymentNumber: "", invoiceId: "",
        prevCumulativeComplete: "0", prevAdvancePayment: "0", prevDirectPayment: "0", prevAdvanceBalance: "0",
        requestedAmount: "", advancePayment: "0", directPayment: "0", paymentDate: ""
    });

    useEffect(() => { fetchData(); fetchContracts(); fetchInvoices(); }, []);

    async function fetchData() {
        try { const res = await fetch("/api/payments"); setItems(await res.json()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function fetchContracts() {
        try { const res = await fetch("/api/contracts"); setContracts(await res.json()); }
        catch (e) { console.error(e); }
    }

    async function fetchInvoices() {
        try { const res = await fetch("/api/invoices"); setInvoices(await res.json()); }
        catch (e) { console.error(e); }
    }

    const filtered = items.filter((i) =>
        i.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function openCreate() {
        setEditing(null);
        setFormData({
            contractId: "", paymentNumber: "", invoiceId: "",
            prevCumulativeComplete: "0", prevAdvancePayment: "0", prevDirectPayment: "0", prevAdvanceBalance: "0",
            requestedAmount: "", advancePayment: "0", directPayment: "0", paymentDate: ""
        });
        setIsDialogOpen(true);
    }

    function openEdit(item: Payment) {
        setEditing(item);
        setFormData({
            contractId: item.contractId, paymentNumber: item.paymentNumber, invoiceId: item.invoiceId || "",
            prevCumulativeComplete: item.prevCumulativeComplete.toString(), prevAdvancePayment: item.prevAdvancePayment.toString(),
            prevDirectPayment: item.prevDirectPayment.toString(), prevAdvanceBalance: item.prevAdvanceBalance.toString(),
            requestedAmount: item.requestedAmount.toString(), advancePayment: item.advancePayment.toString(),
            directPayment: item.directPayment.toString(), paymentDate: item.paymentDate.split("T")[0]
        });
        setIsDialogOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const url = editing ? `/api/payments/${editing.id}` : "/api/payments";
        const method = editing ? "PUT" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
        if (res.ok) { setIsDialogOpen(false); fetchData(); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Xác nhận xóa?")) return;
        const res = await fetch(`/api/payments/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    }

    const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
    const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-7 h-7 text-yellow-500" />
                        Thanh toán Hợp đồng
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý thanh toán hợp đồng</p>
                </div>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-200">
                                <Plus className="w-4 h-4 mr-2" />Thêm thanh toán
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">{editing ? "Sửa thanh toán" : "Thêm thanh toán mới"}</DialogTitle>
                                <DialogDescription className="text-slate-500">Điền thông tin thanh toán</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Hợp đồng *</Label>
                                        <Select value={formData.contractId} onValueChange={(v) => setFormData({ ...formData, contractId: v })}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {contracts.map((c) => <SelectItem key={c.id} value={c.id} className="hover:bg-slate-100 cursor-pointer">{c.contractNumber}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Số thanh toán *</Label>
                                        <Input value={formData.paymentNumber} onChange={(e) => setFormData({ ...formData, paymentNumber: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Số hóa đơn</Label>
                                        <Select value={formData.invoiceId} onValueChange={(v) => setFormData({ ...formData, invoiceId: v })}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"><SelectValue placeholder="Chọn" /></SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {invoices.map((i) => <SelectItem key={i.id} value={i.id} className="hover:bg-slate-100 cursor-pointer">{i.invoiceNumber}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator className="bg-slate-200" />
                                <h4 className="text-sm font-medium text-slate-700">Thông tin kỳ trước</h4>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Lũy kế hoàn thành</Label>
                                        <Input type="number" value={formData.prevCumulativeComplete} onChange={(e) => setFormData({ ...formData, prevCumulativeComplete: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">TT tạm ứng</Label>
                                        <Input type="number" value={formData.prevAdvancePayment} onChange={(e) => setFormData({ ...formData, prevAdvancePayment: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">TT trực tiếp</Label>
                                        <Input type="number" value={formData.prevDirectPayment} onChange={(e) => setFormData({ ...formData, prevDirectPayment: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Số dư tạm ứng</Label>
                                        <Input type="number" value={formData.prevAdvanceBalance} onChange={(e) => setFormData({ ...formData, prevAdvanceBalance: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                </div>

                                <Separator className="bg-slate-200" />
                                <h4 className="text-sm font-medium text-slate-700">Thông tin kỳ này</h4>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Số tiền đề nghị TT *</Label>
                                        <Input type="number" value={formData.requestedAmount} onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">TT tạm ứng</Label>
                                        <Input type="number" value={formData.advancePayment} onChange={(e) => setFormData({ ...formData, advancePayment: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">TT trực tiếp</Label>
                                        <Input type="number" value={formData.directPayment} onChange={(e) => setFormData({ ...formData, directPayment: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-600">Ngày thanh toán *</Label>
                                        <Input type="date" value={formData.paymentDate} onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">Hủy</Button>
                                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{editing ? "Cập nhật" : "Thêm mới"}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Thanh toán ({filtered.length})</CardTitle>
                    <CardDescription className="text-slate-500">Danh sách thanh toán hợp đồng</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-8 text-slate-500">Đang tải...</div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 hover:bg-transparent">
                                        <TableHead className="text-slate-500">Hợp đồng</TableHead>
                                        <TableHead className="text-slate-500">Số TT</TableHead>
                                        <TableHead className="text-slate-500">Hóa đơn</TableHead>
                                        <TableHead className="text-slate-500">Số tiền đề nghị</TableHead>
                                        <TableHead className="text-slate-500">Ngày TT</TableHead>
                                        {canEdit && <TableHead className="text-slate-500 text-right">Thao tác</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Không có dữ liệu</TableCell></TableRow>
                                    ) : filtered.map((item) => (
                                        <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                                            <TableCell className="text-slate-800 font-medium">{item.contract.contractNumber}</TableCell>
                                            <TableCell className="text-slate-600">{item.paymentNumber}</TableCell>
                                            <TableCell className="text-slate-600">{item.invoice?.invoiceNumber || "-"}</TableCell>
                                            <TableCell className="text-slate-600">{formatCurrency(item.requestedAmount)}</TableCell>
                                            <TableCell className="text-slate-600">{formatDate(item.paymentDate)}</TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
