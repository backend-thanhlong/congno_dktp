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
interface Appendix {
    id: string; appendixNumber: string; contractId: string;
    contract: Contract; value: number; signDate: string; content: string | null;
}

export default function AppendixPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";

    const [items, setItems] = useState<Appendix[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Appendix | null>(null);
    const [formData, setFormData] = useState({ appendixNumber: "", contractId: "", value: "", signDate: "", content: "" });

    useEffect(() => { fetchData(); fetchContracts(); }, []);

    async function fetchData() {
        try {
            const res = await fetch("/api/appendices");
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

    const filtered = items.filter((i) =>
        i.appendixNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function openCreate() {
        setEditing(null);
        setFormData({ appendixNumber: "", contractId: "", value: "", signDate: "", content: "" });
        setIsDialogOpen(true);
    }

    function openEdit(item: Appendix) {
        setEditing(item);
        setFormData({
            appendixNumber: item.appendixNumber, contractId: item.contractId,
            value: item.value.toString(), signDate: item.signDate.split("T")[0], content: item.content || ""
        });
        setIsDialogOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const url = editing ? `/api/appendices/${editing.id}` : "/api/appendices";
        const method = editing ? "PUT" : "POST";
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
        if (res.ok) { setIsDialogOpen(false); fetchData(); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Xác nhận xóa?")) return;
        const res = await fetch(`/api/appendices/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    }

    const formatCurrency = (v: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
    const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileCheck className="w-7 h-7 text-green-600" />
                        Phụ lục Hợp đồng
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý phụ lục hợp đồng</p>
                </div>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-200">
                                <Plus className="w-4 h-4 mr-2" />Thêm phụ lục
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">{editing ? "Sửa phụ lục" : "Thêm phụ lục mới"}</DialogTitle>
                                <DialogDescription className="text-slate-500">Điền thông tin phụ lục</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Số phụ lục *</Label>
                                        <Input value={formData.appendixNumber} onChange={(e) => setFormData({ ...formData, appendixNumber: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Hợp đồng *</Label>
                                        <Select value={formData.contractId} onValueChange={(v) => setFormData({ ...formData, contractId: v })}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"><SelectValue placeholder="Chọn hợp đồng" /></SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {contracts.map((c) => <SelectItem key={c.id} value={c.id} className="hover:bg-slate-100 cursor-pointer">{c.contractNumber}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Giá trị *</Label>
                                        <Input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ngày ký *</Label>
                                        <Input type="date" value={formData.signDate} onChange={(e) => setFormData({ ...formData, signDate: e.target.value })} required className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Nội dung</Label>
                                    <Input value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="bg-white border-slate-200 text-slate-800 focus:border-blue-500" />
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
                    <CardTitle className="text-slate-800">Phụ lục ({filtered.length})</CardTitle>
                    <CardDescription className="text-slate-500">Danh sách phụ lục hợp đồng</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="text-center py-8 text-slate-500">Đang tải...</div> : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 hover:bg-transparent">
                                        <TableHead className="text-slate-500 w-16">STT</TableHead>
                                        <TableHead className="text-slate-500">Số phụ lục</TableHead>
                                        <TableHead className="text-slate-500">Hợp đồng</TableHead>
                                        <TableHead className="text-slate-500">Giá trị</TableHead>
                                        <TableHead className="text-slate-500">Ngày ký</TableHead>
                                        <TableHead className="text-slate-500">Nội dung</TableHead>
                                        {canEdit && <TableHead className="text-slate-500 text-right">Thao tác</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Không có dữ liệu</TableCell></TableRow>
                                    ) : filtered.map((item, idx) => (
                                        <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50">
                                            <TableCell className="text-slate-500">{idx + 1}</TableCell>
                                            <TableCell className="text-slate-800 font-medium">{item.appendixNumber}</TableCell>
                                            <TableCell className="text-slate-600">{item.contract.contractNumber}</TableCell>
                                            <TableCell className="text-slate-600">{formatCurrency(item.value)}</TableCell>
                                            <TableCell className="text-slate-600">{formatDate(item.signDate)}</TableCell>
                                            <TableCell className="text-slate-600 max-w-xs truncate">{item.content || "-"}</TableCell>
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
