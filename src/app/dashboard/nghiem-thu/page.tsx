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
import { Plus, Pencil, Trash2, FileCheck, Search } from "lucide-react";

interface Contract { id: string; contractNumber: string; company: { name: string }; value: number; }
interface Acceptance {
    id: string; contractId: string; contract: Contract;
    acceptanceBatch: number; totalValue: number; acceptanceValue: number; cumulativeValue: number; acceptanceDate: string;
}

export default function AcceptancePage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";

    const [items, setItems] = useState<Acceptance[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Acceptance | null>(null);
    const [formData, setFormData] = useState({ contractId: "", acceptanceBatch: "", totalValue: "", acceptanceValue: "", cumulativeValue: "", acceptanceDate: "" });

    useEffect(() => { fetchData(); fetchContracts(); }, []);

    async function fetchData() {
        try {
            const res = await fetch("/api/acceptances");
            setItems(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function fetchContracts() {
        try {
            const res = await fetch("/api/contracts");
            setContracts(await res.json());
        } catch (e) { console.error(e); }
    }

    const filtered = items.filter((i) => i.contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    function openCreate() {
        setEditing(null);
        setFormData({ contractId: "", acceptanceBatch: "", totalValue: "", acceptanceValue: "", cumulativeValue: "", acceptanceDate: "" });
        setIsDialogOpen(true);
    }

    function openEdit(item: Acceptance) {
        setEditing(item);
        setFormData({
            contractId: item.contractId, acceptanceBatch: item.acceptanceBatch.toString(),
            totalValue: item.totalValue.toString(), acceptanceValue: item.acceptanceValue.toString(),
            cumulativeValue: item.cumulativeValue.toString(), acceptanceDate: item.acceptanceDate.split("T")[0]
        });
        setIsDialogOpen(true);
    }

    function handleContractChange(contractId: string) {
        const contract = contracts.find(c => c.id === contractId);
        setFormData({ ...formData, contractId, totalValue: contract?.value.toString() || "" });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const url = editing ? `/api/acceptances/${editing.id}` : "/api/acceptances";
        const method = editing ? "PUT" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
        if (res.ok) { setIsDialogOpen(false); fetchData(); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Xác nhận xóa?")) return;
        const res = await fetch(`/api/acceptances/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    }

    const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
    const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileCheck className="w-7 h-7 text-cyan-600" />
                        Nghiệm thu Hợp đồng
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý nghiệm thu hợp đồng</p>
                </div>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-200">
                                <Plus className="w-4 h-4 mr-2" />Thêm nghiệm thu
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">{editing ? "Sửa nghiệm thu" : "Thêm nghiệm thu mới"}</DialogTitle>
                                <DialogDescription className="text-slate-500">Điền thông tin nghiệm thu</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Hợp đồng *</Label>
                                        <Select value={formData.contractId} onValueChange={handleContractChange}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"><SelectValue placeholder="Chọn hợp đồng" /></SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {contracts.map((c) => <SelectItem key={c.id} value={c.id} className="hover:bg-slate-100 cursor-pointer">{c.contractNumber}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Đợt nghiệm thu *</Label>
                                        <Input type="number" value={formData.acceptanceBatch} onChange={(e) => setFormData({ ...formData, acceptanceBatch: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Tổng giá trị HĐ</Label>
                                        <Input type="number" value={formData.totalValue} onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Giá trị nghiệm thu *</Label>
                                        <Input type="number" value={formData.acceptanceValue} onChange={(e) => setFormData({ ...formData, acceptanceValue: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Lũy kế *</Label>
                                        <Input type="number" value={formData.cumulativeValue} onChange={(e) => setFormData({ ...formData, cumulativeValue: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ngày nghiệm thu *</Label>
                                        <Input type="date" value={formData.acceptanceDate} onChange={(e) => setFormData({ ...formData, acceptanceDate: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
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
                    <CardTitle className="text-slate-800">Nghiệm thu ({filtered.length})</CardTitle>
                    <CardDescription className="text-slate-500">Danh sách nghiệm thu hợp đồng</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-8 text-slate-500">Đang tải...</div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 hover:bg-transparent">
                                        <TableHead className="text-slate-500">Hợp đồng</TableHead>
                                        <TableHead className="text-slate-500">Đợt</TableHead>
                                        <TableHead className="text-slate-500">Tổng GT HĐ</TableHead>
                                        <TableHead className="text-slate-500">GT nghiệm thu</TableHead>
                                        <TableHead className="text-slate-500">Lũy kế</TableHead>
                                        <TableHead className="text-slate-500">Ngày NT</TableHead>
                                        {canEdit && <TableHead className="text-slate-500 text-right">Thao tác</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Không có dữ liệu</TableCell></TableRow>
                                    ) : filtered.map((item) => (
                                        <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                                            <TableCell className="text-slate-800 font-medium">{item.contract.contractNumber}</TableCell>
                                            <TableCell className="text-slate-600">{item.acceptanceBatch}</TableCell>
                                            <TableCell className="text-slate-600">{formatCurrency(item.totalValue)}</TableCell>
                                            <TableCell className="text-slate-600">{formatCurrency(item.acceptanceValue)}</TableCell>
                                            <TableCell className="text-slate-600">{formatCurrency(item.cumulativeValue)}</TableCell>
                                            <TableCell className="text-slate-600">{formatDate(item.acceptanceDate)}</TableCell>
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
