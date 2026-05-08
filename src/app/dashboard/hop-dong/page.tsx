"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Company {
    id: string;
    name: string;
}

interface Contract {
    id: string;
    contractNumber: string;
    companyId: string;
    company: Company;
    signDate: string;
    expiryDate: string;
    value: number;
    status: "ACTIVE" | "EXPIRED" | "TERMINATED";
    priority: "HIGH" | "NORMAL" | "LOW";
    appendices: { value: number }[];
}

interface ContractsResponse {
    data: Contract[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

type GoodsCategoryType = "MEDICINE" | "SUPPLY";

interface MedicineItemResponse {
    id: string;
    orderNumber: number;
    drugName: string;
    activeIngredient: string;
    concentration: string;
    dosageForm: string;
    route: string;
    unitPrice: number | string;
    quantity: number | string;
    lineTotal: number | string;
}

interface SupplyItemResponse {
    id: string;
    orderNumber: number;
    goodsName: string;
    technicalRequirement: string | null;
    quantity: number | string;
    unitPrice: number | string;
    lineTotal: number | string;
}

interface ContractGoodsCategory {
    id: string;
    contractId: string;
    type: GoodsCategoryType;
    medicines: MedicineItemResponse[];
    supplies: SupplyItemResponse[];
}

interface MedicineFormItem {
    drugName: string;
    activeIngredient: string;
    concentration: string;
    dosageForm: string;
    route: string;
    unitPrice: string;
    quantity: string;
}

interface SupplyFormItem {
    goodsName: string;
    technicalRequirement: string;
    quantity: string;
    unitPrice: string;
}

const CONTRACT_PAGE_SIZE = 50;

const categoryTypeLabels = {
    MEDICINE: "Thuốc",
    SUPPLY: "Vật tư",
};

const statusLabels = {
    ACTIVE: { label: "Còn hiệu lực", color: "bg-transparent text-green-700 border-green-600 font-semibold" },
    EXPIRED: { label: "Hết hạn", color: "bg-transparent text-amber-700 border-amber-600 font-semibold" },
    TERMINATED: { label: "Đã hủy", color: "bg-transparent text-red-700 border-red-600 font-semibold" },
};

const priorityLabels = {
    HIGH: { label: "Cao", color: "bg-transparent text-red-700 border-red-600 font-semibold" },
    NORMAL: { label: "Bình thường", color: "bg-transparent text-blue-700 border-blue-600 font-semibold" },
    LOW: { label: "Thấp", color: "bg-transparent text-slate-700 border-slate-500 font-semibold" },
};

export default function ContractPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const canEdit = userRole === "ADMIN" || userRole === "KHOA_DUOC";

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: CONTRACT_PAGE_SIZE,
        total: 0,
        totalPages: 1,
    });
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [formData, setFormData] = useState({
        contractNumber: "",
        companyId: "",
        signDate: "",
        expiryDate: "",
        value: "",
        status: "ACTIVE",
        priority: "NORMAL",
    });
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [goodsCategory, setGoodsCategory] = useState<ContractGoodsCategory | null>(null);
    const [categoryType, setCategoryType] = useState<GoodsCategoryType | "">("");
    const [medicineItems, setMedicineItems] = useState<MedicineFormItem[]>([]);
    const [supplyItems, setSupplyItems] = useState<SupplyFormItem[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryError, setCategoryError] = useState("");

    const fetchContracts = useCallback(async (targetPage: number, targetSearch: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: targetPage.toString(),
                pageSize: CONTRACT_PAGE_SIZE.toString(),
            });

            if (targetSearch) {
                params.set("search", targetSearch);
            }

            const response = await fetch(`/api/contracts?${params.toString()}`);
            if (!response.ok) {
                throw new Error("Failed to fetch contracts");
            }

            const data: ContractsResponse = await response.json();
            setContracts(data.data);
            setPagination(data.pagination);
            setPage((currentPage) => (
                data.pagination.page === currentPage ? currentPage : data.pagination.page
            ));
        } catch (error) {
            console.error("Error fetching contracts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCompanies = useCallback(async () => {
        try {
            const response = await fetch("/api/companies");
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            console.error("Error fetching companies:", error);
        }
    }, []);

    useEffect(() => {
        fetchContracts(page, searchTerm);
    }, [fetchContracts, page, searchTerm]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setPage(1);
            setSearchTerm(searchInput.trim());
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    function createEmptyMedicineItem(): MedicineFormItem {
        return {
            drugName: "",
            activeIngredient: "",
            concentration: "",
            dosageForm: "",
            route: "",
            unitPrice: "",
            quantity: "",
        };
    }

    function createEmptySupplyItem(): SupplyFormItem {
        return {
            goodsName: "",
            technicalRequirement: "",
            quantity: "",
            unitPrice: "",
        };
    }

    function toInputValue(value: number | string | null | undefined) {
        return value === null || value === undefined ? "" : value.toString();
    }

    function hydrateGoodsCategory(category: ContractGoodsCategory | null) {
        setGoodsCategory(category);

        if (!category) {
            setCategoryType("");
            setMedicineItems([]);
            setSupplyItems([]);
            return;
        }

        setCategoryType(category.type);
        setMedicineItems(category.medicines.map((item) => ({
            drugName: item.drugName,
            activeIngredient: item.activeIngredient,
            concentration: item.concentration,
            dosageForm: item.dosageForm,
            route: item.route,
            unitPrice: toInputValue(item.unitPrice),
            quantity: toInputValue(item.quantity),
        })));
        setSupplyItems(category.supplies.map((item) => ({
            goodsName: item.goodsName,
            technicalRequirement: item.technicalRequirement || "",
            quantity: toInputValue(item.quantity),
            unitPrice: toInputValue(item.unitPrice),
        })));
    }

    function resetCategoryDialog() {
        setSelectedContract(null);
        setGoodsCategory(null);
        setCategoryType("");
        setMedicineItems([]);
        setSupplyItems([]);
        setCategoryError("");
        setCategoryLoading(false);
        setCategorySaving(false);
    }

    function handleCategoryDialogOpenChange(open: boolean) {
        setIsCategoryDialogOpen(open);
        if (!open) {
            resetCategoryDialog();
        }
    }

    async function openCategoryDialog(contract: Contract) {
        setSelectedContract(contract);
        setIsCategoryDialogOpen(true);
        setCategoryError("");
        setCategoryLoading(true);

        try {
            const response = await fetch(`/api/contracts/${contract.id}/goods-category`);
            if (!response.ok) {
                throw new Error("Failed to fetch goods category");
            }

            const data: ContractGoodsCategory | null = await response.json();
            hydrateGoodsCategory(data);
        } catch (error) {
            console.error("Error fetching goods category:", error);
            setCategoryError("Không tải được danh mục hàng hóa.");
            hydrateGoodsCategory(null);
        } finally {
            setCategoryLoading(false);
        }
    }

    function handleCategoryTypeChange(value: GoodsCategoryType) {
        setCategoryType(value);
        setCategoryError("");

        if (value === "MEDICINE" && medicineItems.length === 0) {
            setMedicineItems([createEmptyMedicineItem()]);
        }

        if (value === "SUPPLY" && supplyItems.length === 0) {
            setSupplyItems([createEmptySupplyItem()]);
        }
    }

    function addMedicineItem() {
        setMedicineItems((items) => [...items, createEmptyMedicineItem()]);
    }

    function updateMedicineItem(index: number, field: keyof MedicineFormItem, value: string) {
        setMedicineItems((items) => items.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [field]: value } : item
        )));
    }

    function removeMedicineItem(index: number) {
        setMedicineItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
    }

    function addSupplyItem() {
        setSupplyItems((items) => [...items, createEmptySupplyItem()]);
    }

    function updateSupplyItem(index: number, field: keyof SupplyFormItem, value: string) {
        setSupplyItems((items) => items.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [field]: value } : item
        )));
    }

    function removeSupplyItem(index: number) {
        setSupplyItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
    }

    function calculateLineTotal(unitPrice: string, quantity: string) {
        const parsedUnitPrice = Number(unitPrice);
        const parsedQuantity = Number(quantity);

        if (!Number.isFinite(parsedUnitPrice) || !Number.isFinite(parsedQuantity)) {
            return 0;
        }

        return parsedUnitPrice * parsedQuantity;
    }

    async function readApiError(response: Response) {
        try {
            const data = await response.json();
            return data?.error || "Không lưu được danh mục hàng hóa.";
        } catch {
            return "Không lưu được danh mục hàng hóa.";
        }
    }

    async function handleSaveCategory() {
        if (!selectedContract || !categoryType) {
            setCategoryError("Vui lòng chọn loại danh mục.");
            return;
        }

        setCategorySaving(true);
        setCategoryError("");

        const items = categoryType === "MEDICINE"
            ? medicineItems.map((item, index) => ({ ...item, orderNumber: index + 1 }))
            : supplyItems.map((item, index) => ({ ...item, orderNumber: index + 1 }));

        try {
            const response = await fetch(`/api/contracts/${selectedContract.id}/goods-category`, {
                method: goodsCategory ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: categoryType, items }),
            });

            if (!response.ok) {
                throw new Error(await readApiError(response));
            }

            const data: ContractGoodsCategory = await response.json();
            hydrateGoodsCategory(data);
        } catch (error) {
            console.error("Error saving goods category:", error);
            setCategoryError(error instanceof Error ? error.message : "Không lưu được danh mục hàng hóa.");
        } finally {
            setCategorySaving(false);
        }
    }

    async function handleDeleteCategory() {
        if (!selectedContract || !goodsCategory) return;
        if (!confirm("Bạn có chắc muốn xóa danh mục hàng hóa của hợp đồng này?")) return;

        setCategorySaving(true);
        setCategoryError("");

        try {
            const response = await fetch(`/api/contracts/${selectedContract.id}/goods-category`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(await readApiError(response));
            }

            hydrateGoodsCategory(null);
        } catch (error) {
            console.error("Error deleting goods category:", error);
            setCategoryError(error instanceof Error ? error.message : "Không xóa được danh mục hàng hóa.");
        } finally {
            setCategorySaving(false);
        }
    }

    function openCreateDialog() {
        setEditingContract(null);
        setFormData({
            contractNumber: "",
            companyId: "",
            signDate: "",
            expiryDate: "",
            value: "",
            status: "ACTIVE",
            priority: "NORMAL",
        });
        setIsDialogOpen(true);
    }

    function openEditDialog(contract: Contract) {
        setEditingContract(contract);
        setFormData({
            contractNumber: contract.contractNumber,
            companyId: contract.companyId,
            signDate: contract.signDate.split("T")[0],
            expiryDate: contract.expiryDate.split("T")[0],
            value: contract.value.toString(),
            status: contract.status,
            priority: contract.priority,
        });
        setIsDialogOpen(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const url = editingContract ? `/api/contracts/${editingContract.id}` : "/api/contracts";
            const method = editingContract ? "PUT" : "POST";
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setIsDialogOpen(false);
                fetchContracts(page, searchTerm);
            }
        } catch (error) {
            console.error("Error saving contract:", error);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bạn có chắc muốn xóa hợp đồng này?")) return;
        try {
            const response = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
            if (response.ok) {
                if (contracts.length === 1 && page > 1) {
                    setPage(page - 1);
                } else {
                    fetchContracts(page, searchTerm);
                }
            }
        } catch (error) {
            console.error("Error deleting contract:", error);
        }
    }

    function formatCurrency(value: number) {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
    }

    function formatDate(date: string) {
        return new Date(date).toLocaleDateString("vi-VN");
    }

    function renderMedicineTable() {
        return (
            <div className="space-y-3">
                {canEdit && (
                    <Button type="button" variant="outline" size="sm" onClick={addMedicineItem} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm dòng
                    </Button>
                )}
                {medicineItems.length === 0 ? (
                    <div className="rounded-md border border-slate-200 py-8 text-center text-sm text-slate-500">
                        Chưa có dòng thuốc
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-200">
                        <Table className="min-w-[1180px]">
                            <TableHeader>
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="text-slate-500 w-14">STT</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Tên thuốc</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Tên hoạt chất</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Nồng độ/Hàm lượng</TableHead>
                                    <TableHead className="text-slate-500 min-w-36">Dạng bào chế</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">Đường dùng</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">Đơn giá</TableHead>
                                    <TableHead className="text-slate-500 min-w-28">Số lượng</TableHead>
                                    <TableHead className="text-slate-500 min-w-36">Thành tiền</TableHead>
                                    {canEdit && <TableHead className="text-slate-500 text-right w-16">Xóa</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {medicineItems.map((item, index) => (
                                    <TableRow key={index} className="border-slate-100 hover:bg-slate-50">
                                        <TableCell className="text-slate-500">{index + 1}</TableCell>
                                        <TableCell>
                                            <Input value={item.drugName} onChange={(e) => updateMedicineItem(index, "drugName", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.activeIngredient} onChange={(e) => updateMedicineItem(index, "activeIngredient", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.concentration} onChange={(e) => updateMedicineItem(index, "concentration", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.dosageForm} onChange={(e) => updateMedicineItem(index, "dosageForm", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.route} onChange={(e) => updateMedicineItem(index, "route", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateMedicineItem(index, "unitPrice", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateMedicineItem(index, "quantity", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-700">
                                            {formatCurrency(calculateLineTotal(item.unitPrice, item.quantity))}
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="text-right">
                                                <Button type="button" size="sm" variant="ghost" onClick={() => removeMedicineItem(index)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        );
    }

    function renderSupplyTable() {
        return (
            <div className="space-y-3">
                {canEdit && (
                    <Button type="button" variant="outline" size="sm" onClick={addSupplyItem} className="border-slate-200 text-slate-700 hover:bg-slate-50">
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm dòng
                    </Button>
                )}
                {supplyItems.length === 0 ? (
                    <div className="rounded-md border border-slate-200 py-8 text-center text-sm text-slate-500">
                        Chưa có dòng vật tư
                    </div>
                ) : (
                    <div className="rounded-md border border-slate-200">
                        <Table className="min-w-[860px]">
                            <TableHeader>
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="text-slate-500 w-14">STT</TableHead>
                                    <TableHead className="text-slate-500 min-w-52">Tên hàng hóa</TableHead>
                                    <TableHead className="text-slate-500 min-w-72">Yêu cầu kỹ thuật</TableHead>
                                    <TableHead className="text-slate-500 min-w-28">Số lượng</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">Đơn giá</TableHead>
                                    <TableHead className="text-slate-500 min-w-36">Thành tiền</TableHead>
                                    {canEdit && <TableHead className="text-slate-500 text-right w-16">Xóa</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supplyItems.map((item, index) => (
                                    <TableRow key={index} className="border-slate-100 hover:bg-slate-50">
                                        <TableCell className="text-slate-500">{index + 1}</TableCell>
                                        <TableCell>
                                            <Input value={item.goodsName} onChange={(e) => updateSupplyItem(index, "goodsName", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.technicalRequirement} onChange={(e) => updateSupplyItem(index, "technicalRequirement", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateSupplyItem(index, "quantity", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateSupplyItem(index, "unitPrice", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell className="font-semibold text-green-700">
                                            {formatCurrency(calculateLineTotal(item.unitPrice, item.quantity))}
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="text-right">
                                                <Button type="button" size="sm" variant="ghost" onClick={() => removeSupplyItem(index)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        );
    }

    const startRow = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const endRow = Math.min(pagination.page * pagination.pageSize, pagination.total);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-purple-600" />
                        Danh sách Hợp đồng
                    </h1>
                    <p className="text-slate-500 mt-1">Quản lý các hợp đồng với công ty đối tác</p>
                </div>
                {canEdit && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md shadow-blue-200">
                                <Plus className="w-4 h-4 mr-2" />
                                Thêm hợp đồng
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-slate-200 text-slate-800 sm:max-w-lg shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">{editingContract ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}</DialogTitle>
                                <DialogDescription className="text-slate-500">Điền thông tin hợp đồng</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Số hợp đồng *</Label>
                                        <Input
                                            value={formData.contractNumber}
                                            onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Công ty *</Label>
                                        <Select
                                            value={formData.companyId}
                                            onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500">
                                                <SelectValue placeholder="Chọn công ty" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                {companies.map((company) => (
                                                    <SelectItem key={company.id} value={company.id} className="hover:bg-slate-100 cursor-pointer">
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ngày ký *</Label>
                                        <Input
                                            type="date"
                                            value={formData.signDate}
                                            onChange={(e) => setFormData({ ...formData, signDate: e.target.value })}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ngày hết hạn *</Label>
                                        <Input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => {
                                                const newExpiryDate = e.target.value;
                                                let newStatus = formData.status;

                                                if (newExpiryDate && formData.status !== "TERMINATED") {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const expiry = new Date(newExpiryDate);

                                                    if (expiry < today) {
                                                        newStatus = "EXPIRED";
                                                    } else {
                                                        newStatus = "ACTIVE";
                                                    }
                                                }

                                                setFormData({ ...formData, expiryDate: newExpiryDate, status: newStatus });
                                            }}
                                            required
                                            className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Giá trị hợp đồng *</Label>
                                    <Input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                        required
                                        className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Hiệu lực</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) => setFormData({ ...formData, status: value as Contract["status"] })}
                                            disabled
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                <SelectItem value="ACTIVE" className="hover:bg-slate-100 cursor-pointer">Còn hiệu lực</SelectItem>
                                                <SelectItem value="EXPIRED" className="hover:bg-slate-100 cursor-pointer">Hết hạn</SelectItem>
                                                <SelectItem value="TERMINATED" className="hover:bg-slate-100 cursor-pointer">Đã hủy</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Ưu tiên</Label>
                                        <Select
                                            value={formData.priority}
                                            onValueChange={(value) => setFormData({ ...formData, priority: value as Contract["priority"] })}
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                <SelectItem value="HIGH" className="hover:bg-slate-100 cursor-pointer">Cao</SelectItem>
                                                <SelectItem value="NORMAL" className="hover:bg-slate-100 cursor-pointer">Bình thường</SelectItem>
                                                <SelectItem value="LOW" className="hover:bg-slate-100 cursor-pointer">Thấp</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                        Hủy
                                    </Button>
                                    <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                        {editingContract ? "Cập nhật" : "Thêm mới"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Dialog open={isCategoryDialogOpen} onOpenChange={handleCategoryDialogOpenChange}>
                <DialogContent className="bg-white border-slate-200 text-slate-800 shadow-xl sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Danh mục hàng hóa</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {selectedContract ? `${selectedContract.contractNumber} - ${selectedContract.company.name}` : "Danh mục theo hợp đồng"}
                        </DialogDescription>
                    </DialogHeader>

                    {categoryLoading ? (
                        <div className="text-center py-8 text-slate-500">Đang tải...</div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Hợp đồng</Label>
                                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                                        {selectedContract?.contractNumber || ""}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Loại danh mục</Label>
                                    {goodsCategory || !canEdit ? (
                                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                                            {categoryType ? categoryTypeLabels[categoryType] : "Chưa có danh mục"}
                                        </div>
                                    ) : (
                                        <Select
                                            value={categoryType}
                                            onValueChange={(value) => handleCategoryTypeChange(value as GoodsCategoryType)}
                                        >
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-800 focus:border-blue-500">
                                                <SelectValue placeholder="Chọn Thuốc hoặc Vật tư" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-800">
                                                <SelectItem value="MEDICINE" className="hover:bg-slate-100 cursor-pointer">Thuốc</SelectItem>
                                                <SelectItem value="SUPPLY" className="hover:bg-slate-100 cursor-pointer">Vật tư</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            {categoryError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {categoryError}
                                </div>
                            )}

                            {!categoryType && (
                                <div className="rounded-md border border-slate-200 py-8 text-center text-sm text-slate-500">
                                    Chưa có danh mục hàng hóa
                                </div>
                            )}

                            {categoryType === "MEDICINE" && renderMedicineTable()}
                            {categoryType === "SUPPLY" && renderSupplyTable()}
                        </div>
                    )}

                    <DialogFooter>
                        {canEdit && goodsCategory && !categoryLoading && (
                            <Button type="button" variant="outline" onClick={handleDeleteCategory} disabled={categorySaving} className="border-red-200 text-red-600 hover:bg-red-50">
                                Xóa danh mục
                            </Button>
                        )}
                        <Button type="button" variant="outline" onClick={() => handleCategoryDialogOpenChange(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                            Đóng
                        </Button>
                        {canEdit && !categoryLoading && (
                            <Button type="button" onClick={handleSaveCategory} disabled={categorySaving || !categoryType} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                {categorySaving ? "Đang lưu..." : "Lưu danh mục"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo số hợp đồng, tên công ty..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Hợp đồng ({pagination.total})</CardTitle>
                    <CardDescription className="text-slate-500">Danh sách tất cả hợp đồng</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Đang tải...</div>
                    ) : (
                        <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 hover:bg-transparent">
                                        <TableHead className="text-slate-500 w-16">STT</TableHead>
                                        <TableHead className="text-slate-500">Số hợp đồng</TableHead>
                                        <TableHead className="text-slate-500">Công ty</TableHead>
                                        <TableHead className="text-slate-500">Ngày ký</TableHead>
                                        <TableHead className="text-slate-500">Ngày hết hạn</TableHead>
                                        <TableHead className="text-slate-500">Giá trị</TableHead>
                                        <TableHead className="text-slate-500">Hiệu lực</TableHead>
                                        <TableHead className="text-slate-500">Ưu tiên</TableHead>
                                        <TableHead className="text-slate-500">Giá trị Phụ lục</TableHead>
                                        <TableHead className="text-slate-500">Tổng giá trị</TableHead>
                                        <TableHead className="text-slate-500 text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contracts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                                                Không có dữ liệu
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        contracts.map((contract, index) => {
                                            const totalAppendixValue = contract.appendices?.reduce((sum, app) => sum + Number(app.value), 0) || 0;
                                            const totalValue = Number(contract.value) + totalAppendixValue;
                                            return (
                                                <TableRow key={contract.id} className="border-slate-100 hover:bg-slate-50">
                                                    <TableCell className="text-slate-500">{(pagination.page - 1) * pagination.pageSize + index + 1}</TableCell>
                                                    <TableCell className="text-slate-800 font-medium">{contract.contractNumber}</TableCell>
                                                    <TableCell className="text-slate-600">{contract.company.name}</TableCell>
                                                    <TableCell className="text-slate-600">{formatDate(contract.signDate)}</TableCell>
                                                    <TableCell className="text-slate-600">{formatDate(contract.expiryDate)}</TableCell>
                                                    <TableCell className="text-slate-600">{formatCurrency(Number(contract.value))}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={statusLabels[contract.status].color}>
                                                            {statusLabels[contract.status].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={priorityLabels[contract.priority].color}>
                                                            {priorityLabels[contract.priority].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium text-blue-600">
                                                        {formatCurrency(totalAppendixValue)}
                                                    </TableCell>
                                                    <TableCell className="text-slate-800 font-bold text-green-600">
                                                        {formatCurrency(totalValue)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="sm" variant="ghost" onClick={() => openCategoryDialog(contract)} title="Danh mục hàng hóa" aria-label="Danh mục hàng hóa" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                                <FileText className="w-4 h-4" />
                                                            </Button>
                                                            {canEdit && (
                                                                <>
                                                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(contract)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button size="sm" variant="ghost" onClick={() => handleDelete(contract.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
                            <p className="text-sm text-slate-500">
                                Hiển thị {startRow}-{endRow} / {pagination.total}
                            </p>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                                    disabled={loading || pagination.page <= 1}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Trước
                                </Button>
                                <span className="min-w-24 text-center text-sm text-slate-600">
                                    Trang {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
                                    disabled={loading || pagination.page >= pagination.totalPages}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    Sau
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
