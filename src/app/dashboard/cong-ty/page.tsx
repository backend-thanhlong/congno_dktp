"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";

interface Company {
    id: string;
    name: string;
    address: string | null;
    taxCode: string | null;
    contactName: string | null;
    phone: string | null;
    _count?: { contracts: number };
}

export default function CompanyPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        taxCode: "",
        contactName: "",
        phone: "",
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    async function fetchCompanies() {
        try {
            const response = await fetch("/api/companies");
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            console.error("Error fetching companies:", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredCompanies = companies.filter(
        (company) =>
            company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.taxCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            company.phone?.includes(searchTerm)
    );

    function openCreateDialog() {
        setEditingCompany(null);
        setFormData({ name: "", address: "", taxCode: "", contactName: "", phone: "" });
        setIsDialogOpen(true);
    }

    function openEditDialog(company: Company) {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            address: company.address || "",
            taxCode: company.taxCode || "",
            contactName: company.contactName || "",
            phone: company.phone || "",
        });
        setIsDialogOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            const url = editingCompany
                ? `/api/companies/${editingCompany.id}`
                : "/api/companies";
            const method = editingCompany ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setIsDialogOpen(false);
                fetchCompanies();
            }
        } catch (error) {
            console.error("Error saving company:", error);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bạn có chắc muốn xóa công ty này?")) return;

        try {
            const response = await fetch(`/api/companies/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                fetchCompanies();
            }
        } catch (error) {
            console.error("Error deleting company:", error);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-blue-500" />
                        Danh sách Công ty
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý thông tin các công ty đối tác</p>
                </div>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                onClick={openCreateDialog}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-200"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm công ty
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-md shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">
                                    {editingCompany ? "Sửa thông tin công ty" : "Thêm công ty mới"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500">
                                    Điền thông tin công ty bên dưới
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-700">Tên công ty *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        required
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-slate-700">Địa chỉ</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) =>
                                            setFormData({ ...formData, address: e.target.value })
                                        }
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxCode" className="text-slate-700">Mã số thuế</Label>
                                    <Input
                                        id="taxCode"
                                        value={formData.taxCode}
                                        onChange={(e) =>
                                            setFormData({ ...formData, taxCode: e.target.value })
                                        }
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactName" className="text-slate-700">Người liên hệ</Label>
                                    <Input
                                        id="contactName"
                                        value={formData.contactName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contactName: e.target.value })
                                        }
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-slate-700">Số điện thoại</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) =>
                                            setFormData({ ...formData, phone: e.target.value })
                                        }
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                    >
                                        {editingCompany ? "Cập nhật" : "Thêm mới"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Search */}
            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, mã số thuế, số điện thoại..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Công ty ({filteredCompanies.length})</CardTitle>
                    <CardDescription className="text-slate-500">
                        Danh sách tất cả các công ty trong hệ thống
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Đang tải...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 hover:bg-transparent">
                                        <TableHead className="text-slate-500 w-16">STT</TableHead>
                                        <TableHead className="text-slate-500">Tên công ty</TableHead>
                                        <TableHead className="text-slate-500">Địa chỉ</TableHead>
                                        <TableHead className="text-slate-500">Mã số thuế</TableHead>
                                        <TableHead className="text-slate-500">Người liên hệ</TableHead>
                                        <TableHead className="text-slate-500">Số điện thoại</TableHead>
                                        {canEdit && (
                                            <TableHead className="text-slate-500 text-right">Thao tác</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCompanies.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={canEdit ? 7 : 6}
                                                className="text-center py-8 text-slate-500"
                                            >
                                                Không có dữ liệu
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCompanies.map((company, index) => (
                                            <TableRow
                                                key={company.id}
                                                className="border-slate-100 hover:bg-slate-50"
                                            >
                                                <TableCell className="text-slate-500">{index + 1}</TableCell>
                                                <TableCell className="text-slate-800 font-medium">
                                                    {company.name}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {company.address || "-"}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {company.taxCode || "-"}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {company.contactName || "-"}
                                                </TableCell>
                                                <TableCell className="text-slate-600">
                                                    {company.phone || "-"}
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openEditDialog(company)}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(company.id)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
