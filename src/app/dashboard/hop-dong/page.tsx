"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import {
    Plus, Pencil, Trash2, FileText, Search, ChevronLeft, ChevronRight, Download, Upload, SlidersHorizontal, X,
} from "lucide-react";

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
type PresenceFilter = "HAS" | "NONE";
type ExpiringInDaysFilter = "" | "30" | "60" | "90";
type PresenceFilterField =
    | "goodsCategoryPresence"
    | "appendixPresence"
    | "acceptancePresence"
    | "paymentPresence"
    | "invoicePresence";

interface ContractFilters {
    companyIds: string[];
    statuses: Contract["status"][];
    priorities: Contract["priority"][];
    signDateFrom: string;
    signDateTo: string;
    expiryDateFrom: string;
    expiryDateTo: string;
    expiringInDays: ExpiringInDaysFilter;
    goodsCategoryPresence: PresenceFilter[];
    goodsCategoryTypes: GoodsCategoryType[];
    appendixPresence: PresenceFilter[];
    acceptancePresence: PresenceFilter[];
    paymentPresence: PresenceFilter[];
    invoicePresence: PresenceFilter[];
}

interface MedicineItemResponse {
    id: string;
    orderNumber: number;
    bidNoticeOrder: string | null;
    drugName: string;
    activeIngredient: string;
    concentration: string;
    unit: string | null;
    dosageForm: string;
    route: string;
    technicalGroup: string | null;
    registrationNumber: string | null;
    manufacturer: string | null;
    countryOfOrigin: string | null;
    packaging: string | null;
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
    bidNoticeOrder: string;
    drugName: string;
    activeIngredient: string;
    concentration: string;
    unit: string;
    dosageForm: string;
    route: string;
    technicalGroup: string;
    registrationNumber: string;
    manufacturer: string;
    countryOfOrigin: string;
    packaging: string;
    unitPrice: string;
    quantity: string;
}

interface SupplyFormItem {
    goodsName: string;
    technicalRequirement: string;
    quantity: string;
    unitPrice: string;
}

type ExcelImportRows = MedicineFormItem[] | SupplyFormItem[];

interface ExcelImportPreview {
    type: GoodsCategoryType;
    fileName: string;
    totalRows: number;
    validRows: number;
    errorRows: number;
    rows: ExcelImportRows;
    errors: string[];
}

interface ExcelColumn {
    header: string;
    field?: string;
    required?: boolean;
    numeric?: boolean;
    sample: string | number;
}

const CONTRACT_PAGE_SIZE = 50;

const emptyContractFilters: ContractFilters = {
    companyIds: [],
    statuses: [],
    priorities: [],
    signDateFrom: "",
    signDateTo: "",
    expiryDateFrom: "",
    expiryDateTo: "",
    expiringInDays: "",
    goodsCategoryPresence: [],
    goodsCategoryTypes: [],
    appendixPresence: [],
    acceptancePresence: [],
    paymentPresence: [],
    invoicePresence: [],
};

const statusFilterOptions: { value: Contract["status"]; label: string }[] = [
    { value: "ACTIVE", label: "Còn hiệu lực" },
    { value: "EXPIRED", label: "Hết hạn" },
    { value: "TERMINATED", label: "Đã hủy" },
];

const priorityFilterOptions: { value: Contract["priority"]; label: string }[] = [
    { value: "HIGH", label: "Cao" },
    { value: "NORMAL", label: "Bình thường" },
    { value: "LOW", label: "Thấp" },
];

const goodsCategoryFilterOptions: { value: GoodsCategoryType; label: string }[] = [
    { value: "MEDICINE", label: "Thuốc" },
    { value: "SUPPLY", label: "Vật tư" },
];

const presenceFilterOptions: { value: PresenceFilter; label: string }[] = [
    { value: "HAS", label: "Có" },
    { value: "NONE", label: "Chưa có" },
];

const expiringInDaysOptions: { value: Exclude<ExpiringInDaysFilter, "">; label: string }[] = [
    { value: "30", label: "30 ngày" },
    { value: "60", label: "60 ngày" },
    { value: "90", label: "90 ngày" },
];

function cloneContractFilters(filters: ContractFilters): ContractFilters {
    return {
        ...filters,
        companyIds: [...filters.companyIds],
        statuses: [...filters.statuses],
        priorities: [...filters.priorities],
        goodsCategoryPresence: [...filters.goodsCategoryPresence],
        goodsCategoryTypes: [...filters.goodsCategoryTypes],
        appendixPresence: [...filters.appendixPresence],
        acceptancePresence: [...filters.acceptancePresence],
        paymentPresence: [...filters.paymentPresence],
        invoicePresence: [...filters.invoicePresence],
    };
}

function toggleFilterValue<T extends string>(values: T[], value: T) {
    return values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
}

function appendCsvParam(params: URLSearchParams, key: string, values: string[]) {
    if (values.length > 0) {
        params.set(key, values.join(","));
    }
}

function isNoGoodsCategoryOnly(filters: ContractFilters) {
    return filters.goodsCategoryPresence.length === 1 && filters.goodsCategoryPresence[0] === "NONE";
}

function appendContractFilters(params: URLSearchParams, filters: ContractFilters) {
    appendCsvParam(params, "companyIds", filters.companyIds);
    appendCsvParam(params, "statuses", filters.statuses);
    appendCsvParam(params, "priorities", filters.priorities);
    appendCsvParam(params, "goodsCategoryPresence", filters.goodsCategoryPresence);
    appendCsvParam(params, "appendixPresence", filters.appendixPresence);
    appendCsvParam(params, "acceptancePresence", filters.acceptancePresence);
    appendCsvParam(params, "paymentPresence", filters.paymentPresence);
    appendCsvParam(params, "invoicePresence", filters.invoicePresence);

    if (!isNoGoodsCategoryOnly(filters)) {
        appendCsvParam(params, "goodsCategoryTypes", filters.goodsCategoryTypes);
    }

    if (filters.signDateFrom) params.set("signDateFrom", filters.signDateFrom);
    if (filters.signDateTo) params.set("signDateTo", filters.signDateTo);
    if (filters.expiryDateFrom) params.set("expiryDateFrom", filters.expiryDateFrom);
    if (filters.expiryDateTo) params.set("expiryDateTo", filters.expiryDateTo);
    if (filters.expiringInDays) params.set("expiringInDays", filters.expiringInDays);
}

function hasEffectivePresenceFilter(values: PresenceFilter[]) {
    return values.length === 1;
}

function countActiveFilterGroups(filters: ContractFilters) {
    let count = 0;

    if (filters.companyIds.length > 0) count += 1;
    if (filters.statuses.length > 0 && filters.statuses.length < statusFilterOptions.length) count += 1;
    if (filters.priorities.length > 0 && filters.priorities.length < priorityFilterOptions.length) count += 1;
    if (filters.signDateFrom || filters.signDateTo) count += 1;
    if (filters.expiryDateFrom || filters.expiryDateTo) count += 1;
    if (filters.expiringInDays) count += 1;
    if (hasEffectivePresenceFilter(filters.goodsCategoryPresence)) count += 1;
    if (filters.goodsCategoryTypes.length > 0 && !isNoGoodsCategoryOnly(filters)) count += 1;
    if (hasEffectivePresenceFilter(filters.appendixPresence)) count += 1;
    if (hasEffectivePresenceFilter(filters.acceptancePresence)) count += 1;
    if (hasEffectivePresenceFilter(filters.paymentPresence)) count += 1;
    if (hasEffectivePresenceFilter(filters.invoicePresence)) count += 1;

    return count;
}

const categoryTypeLabels = {
    MEDICINE: "Thuốc",
    SUPPLY: "Vật tư",
};

const medicineExcelColumns: ExcelColumn[] = [
    { header: "STT", sample: 1 },
    { header: "STT Thông báo chào giá", field: "bidNoticeOrder", sample: "1" },
    { header: "Tên thuốc", field: "drugName", required: true, sample: "Paracetamol" },
    { header: "Tên hoạt chất", field: "activeIngredient", required: true, sample: "Paracetamol" },
    { header: "Nồng độ/Hàm lượng", field: "concentration", required: true, sample: "500mg" },
    { header: "Đơn vị tính", field: "unit", sample: "Viên" },
    { header: "Dạng bào chế", field: "dosageForm", required: true, sample: "Viên nén" },
    { header: "Đường dùng", field: "route", required: true, sample: "Uống" },
    { header: "Nhóm TCKT", field: "technicalGroup", sample: "Nhóm 1" },
    { header: "SĐK/ GPNK", field: "registrationNumber", sample: "VD-00000-00" },
    { header: "Hãng sản xuất", field: "manufacturer", sample: "Công ty dược" },
    { header: "Nước sản xuất", field: "countryOfOrigin", sample: "Việt Nam" },
    { header: "Quy cách đóng gói", field: "packaging", sample: "Hộp 10 vỉ x 10 viên" },
    { header: "Đơn giá", field: "unitPrice", required: true, numeric: true, sample: 1000 },
    { header: "Số lượng", field: "quantity", required: true, numeric: true, sample: 100 },
];

const supplyExcelColumns: ExcelColumn[] = [
    { header: "STT", sample: 1 },
    { header: "Tên hàng hóa", field: "goodsName", required: true, sample: "Bơm tiêm" },
    { header: "Yêu cầu kỹ thuật", field: "technicalRequirement", sample: "Dung tích 5ml, vô trùng" },
    { header: "Số lượng", field: "quantity", required: true, numeric: true, sample: 100 },
    { header: "Đơn giá", field: "unitPrice", required: true, numeric: true, sample: 5000 },
];

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
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [draftFilters, setDraftFilters] = useState<ContractFilters>(() => cloneContractFilters(emptyContractFilters));
    const [appliedFilters, setAppliedFilters] = useState<ContractFilters>(() => cloneContractFilters(emptyContractFilters));
    const [companyFilterSearch, setCompanyFilterSearch] = useState("");
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
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<ExcelImportPreview | null>(null);
    const excelFileInputRef = useRef<HTMLInputElement | null>(null);

    const fetchContracts = useCallback(async (
        targetPage: number,
        targetSearch: string,
        targetFilters: ContractFilters
    ) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: targetPage.toString(),
                pageSize: CONTRACT_PAGE_SIZE.toString(),
            });

            if (targetSearch) {
                params.set("search", targetSearch);
            }

            appendContractFilters(params, targetFilters);

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
        fetchContracts(page, searchTerm, appliedFilters);
    }, [fetchContracts, page, searchTerm, appliedFilters]);

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

    const appliedFilterCount = useMemo(() => countActiveFilterGroups(appliedFilters), [appliedFilters]);
    const draftFilterCount = useMemo(() => countActiveFilterGroups(draftFilters), [draftFilters]);
    const filteredCompanies = useMemo(() => {
        const search = companyFilterSearch.trim().toLowerCase();
        if (!search) return companies;

        return companies.filter((company) => company.name.toLowerCase().includes(search));
    }, [companies, companyFilterSearch]);

    const hasAppliedAdvancedFilters = appliedFilterCount > 0;
    const isGoodsCategoryTypeDisabled = isNoGoodsCategoryOnly(draftFilters);

    function handleFilterPanelToggle() {
        setIsFilterPanelOpen((isOpen) => {
            const nextOpen = !isOpen;
            if (nextOpen) {
                setDraftFilters(cloneContractFilters(appliedFilters));
            }
            return nextOpen;
        });
    }

    function handleApplyFilters() {
        setAppliedFilters(cloneContractFilters(draftFilters));
        setPage(1);
    }

    function handleClearAdvancedFilters() {
        const emptyFilters = cloneContractFilters(emptyContractFilters);
        setDraftFilters(emptyFilters);
        setAppliedFilters(cloneContractFilters(emptyContractFilters));
        setCompanyFilterSearch("");
        setPage(1);
    }

    function handleClearDraftFilters() {
        setDraftFilters(cloneContractFilters(emptyContractFilters));
        setCompanyFilterSearch("");
    }

    function createEmptyMedicineItem(): MedicineFormItem {
        return {
            bidNoticeOrder: "",
            drugName: "",
            activeIngredient: "",
            concentration: "",
            unit: "",
            dosageForm: "",
            route: "",
            technicalGroup: "",
            registrationNumber: "",
            manufacturer: "",
            countryOfOrigin: "",
            packaging: "",
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
            bidNoticeOrder: item.bidNoticeOrder || "",
            drugName: item.drugName,
            activeIngredient: item.activeIngredient,
            concentration: item.concentration,
            unit: item.unit || "",
            dosageForm: item.dosageForm,
            route: item.route,
            technicalGroup: item.technicalGroup || "",
            registrationNumber: item.registrationNumber || "",
            manufacturer: item.manufacturer || "",
            countryOfOrigin: item.countryOfOrigin || "",
            packaging: item.packaging || "",
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
        setImportPreview(null);
        setIsImportPreviewOpen(false);
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
        setImportPreview(null);
        setIsImportPreviewOpen(false);

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
                fetchContracts(page, searchTerm, appliedFilters);
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
                    fetchContracts(page, searchTerm, appliedFilters);
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

    function getExcelColumns(type: GoodsCategoryType) {
        return type === "MEDICINE" ? medicineExcelColumns : supplyExcelColumns;
    }

    function normalizeExcelHeader(value: string) {
        return value
            .normalize("NFD")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "")
            .toLowerCase();
    }

    function createExcelHeaderLookup(row: Record<string, unknown>) {
        return new Map(
            Object.entries(row).map(([key, value]) => [normalizeExcelHeader(key), value])
        );
    }

    function readExcelText(row: Map<string, unknown>, header: string) {
        const value = row.get(normalizeExcelHeader(header));
        return value === null || value === undefined ? "" : String(value).trim();
    }

    function isExcelDataRowEmpty(row: Map<string, unknown>, columns: ExcelColumn[]) {
        return columns
            .filter((column) => column.field)
            .every((column) => readExcelText(row, column.header) === "");
    }

    function findMissingRequiredHeaders(rows: Record<string, unknown>[], columns: ExcelColumn[]) {
        const availableHeaders = new Set(
            rows.flatMap((row) => Object.keys(row).map((key) => normalizeExcelHeader(key)))
        );

        return columns
            .filter((column) => column.required)
            .filter((column) => !availableHeaders.has(normalizeExcelHeader(column.header)))
            .map((column) => column.header);
    }

    function parseExcelNumber(value: string) {
        const text = value.trim().replace(/\s/g, "");
        if (!text) return null;

        let normalized = text;
        if (text.includes(",") && text.includes(".")) {
            normalized = text.lastIndexOf(",") > text.lastIndexOf(".")
                ? text.replace(/\./g, "").replace(",", ".")
                : text.replace(/,/g, "");
        } else if (text.includes(",")) {
            const parts = text.split(",");
            normalized = parts.length === 2 && parts[1].length === 3
                ? parts.join("")
                : text.replace(",", ".");
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    function readRequiredExcelText(
        row: Map<string, unknown>,
        header: string,
        rowNumber: number,
        errors: string[],
        missingHeaders: Set<string>
    ) {
        if (missingHeaders.has(header)) return "";

        const value = readExcelText(row, header);
        if (!value) {
            errors.push(`Dòng ${rowNumber}: ${header} là bắt buộc.`);
        }

        return value;
    }

    function readRequiredExcelNumber(
        row: Map<string, unknown>,
        header: string,
        rowNumber: number,
        errors: string[],
        missingHeaders: Set<string>
    ) {
        if (missingHeaders.has(header)) return "";

        const value = readExcelText(row, header);
        if (!value) {
            errors.push(`Dòng ${rowNumber}: ${header} là bắt buộc.`);
            return "";
        }

        const parsed = parseExcelNumber(value);
        if (parsed === null) {
            errors.push(`Dòng ${rowNumber}: ${header} phải là số không âm.`);
            return "";
        }

        return parsed.toString();
    }

    function getExcelRowNumber(row: Record<string, unknown>, fallbackIndex: number) {
        const rowNumber = (row as { __rowNum__?: number }).__rowNum__;
        return typeof rowNumber === "number" ? rowNumber + 1 : fallbackIndex + 2;
    }

    function parseMedicineExcelRows(rawRows: Record<string, unknown>[]) {
        const rows: MedicineFormItem[] = [];
        const errors: string[] = [];
        let validRows = 0;
        let errorRows = 0;
        const missingHeaders = new Set(findMissingRequiredHeaders(rawRows, medicineExcelColumns));

        missingHeaders.forEach((header) => {
            errors.push(`Thiếu cột bắt buộc: ${header}.`);
        });

        rawRows.forEach((rawRow, index) => {
            const row = createExcelHeaderLookup(rawRow);
            if (isExcelDataRowEmpty(row, medicineExcelColumns)) return;

            const rowNumber = getExcelRowNumber(rawRow, index);
            const rowErrors: string[] = [];
            rows.push({
                bidNoticeOrder: readExcelText(row, "STT Thông báo chào giá"),
                drugName: readRequiredExcelText(row, "Tên thuốc", rowNumber, rowErrors, missingHeaders),
                activeIngredient: readRequiredExcelText(row, "Tên hoạt chất", rowNumber, rowErrors, missingHeaders),
                concentration: readRequiredExcelText(row, "Nồng độ/Hàm lượng", rowNumber, rowErrors, missingHeaders),
                unit: readExcelText(row, "Đơn vị tính"),
                dosageForm: readRequiredExcelText(row, "Dạng bào chế", rowNumber, rowErrors, missingHeaders),
                route: readRequiredExcelText(row, "Đường dùng", rowNumber, rowErrors, missingHeaders),
                technicalGroup: readExcelText(row, "Nhóm TCKT"),
                registrationNumber: readExcelText(row, "SĐK/ GPNK"),
                manufacturer: readExcelText(row, "Hãng sản xuất"),
                countryOfOrigin: readExcelText(row, "Nước sản xuất"),
                packaging: readExcelText(row, "Quy cách đóng gói"),
                unitPrice: readRequiredExcelNumber(row, "Đơn giá", rowNumber, rowErrors, missingHeaders),
                quantity: readRequiredExcelNumber(row, "Số lượng", rowNumber, rowErrors, missingHeaders),
            });

            if (rowErrors.length > 0 || missingHeaders.size > 0) {
                errorRows += 1;
            } else {
                validRows += 1;
            }

            errors.push(...rowErrors);
        });

        if (rows.length === 0) {
            errors.push("File Excel không có dòng dữ liệu.");
        }

        return { rows, errors, validRows, errorRows };
    }

    function parseSupplyExcelRows(rawRows: Record<string, unknown>[]) {
        const rows: SupplyFormItem[] = [];
        const errors: string[] = [];
        let validRows = 0;
        let errorRows = 0;
        const missingHeaders = new Set(findMissingRequiredHeaders(rawRows, supplyExcelColumns));

        missingHeaders.forEach((header) => {
            errors.push(`Thiếu cột bắt buộc: ${header}.`);
        });

        rawRows.forEach((rawRow, index) => {
            const row = createExcelHeaderLookup(rawRow);
            if (isExcelDataRowEmpty(row, supplyExcelColumns)) return;

            const rowNumber = getExcelRowNumber(rawRow, index);
            const rowErrors: string[] = [];
            rows.push({
                goodsName: readRequiredExcelText(row, "Tên hàng hóa", rowNumber, rowErrors, missingHeaders),
                technicalRequirement: readExcelText(row, "Yêu cầu kỹ thuật"),
                quantity: readRequiredExcelNumber(row, "Số lượng", rowNumber, rowErrors, missingHeaders),
                unitPrice: readRequiredExcelNumber(row, "Đơn giá", rowNumber, rowErrors, missingHeaders),
            });

            if (rowErrors.length > 0 || missingHeaders.size > 0) {
                errorRows += 1;
            } else {
                validRows += 1;
            }

            errors.push(...rowErrors);
        });

        if (rows.length === 0) {
            errors.push("File Excel không có dòng dữ liệu.");
        }

        return { rows, errors, validRows, errorRows };
    }

    async function buildExcelImportPreview(file: File, type: GoodsCategoryType): Promise<ExcelImportPreview> {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            throw new Error("File Excel không có sheet dữ liệu.");
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
            raw: false,
        }) as Record<string, unknown>[];
        const parsed = type === "MEDICINE"
            ? parseMedicineExcelRows(rawRows)
            : parseSupplyExcelRows(rawRows);

        return {
            type,
            fileName: file.name,
            totalRows: parsed.rows.length,
            validRows: parsed.validRows,
            errorRows: parsed.errorRows,
            rows: parsed.rows,
            errors: parsed.errors,
        };
    }

    async function handleDownloadExcelTemplate() {
        if (!categoryType) {
            setCategoryError("Vui lòng chọn loại danh mục trước khi tải mẫu Excel.");
            return;
        }

        const XLSX = await import("xlsx");
        const columns = getExcelColumns(categoryType);
        const sampleRow = Object.fromEntries(columns.map((column) => [column.header, column.sample]));
        const worksheet = XLSX.utils.json_to_sheet([sampleRow], {
            header: columns.map((column) => column.header),
        });
        worksheet["!cols"] = columns.map((column) => ({
            wch: Math.max(12, column.header.length + 2),
        }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, categoryTypeLabels[categoryType]);
        XLSX.writeFile(
            workbook,
            categoryType === "MEDICINE" ? "mau-danh-muc-thuoc.xlsx" : "mau-danh-muc-vat-tu.xlsx"
        );
    }

    function handleTriggerExcelImport() {
        if (!categoryType) {
            setCategoryError("Vui lòng chọn loại danh mục trước khi import Excel.");
            return;
        }

        excelFileInputRef.current?.click();
    }

    async function handleExcelFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file || !categoryType) return;

        if (!/\.(xlsx|xls)$/i.test(file.name)) {
            setCategoryError("Chỉ chấp nhận file Excel .xlsx hoặc .xls.");
            return;
        }

        try {
            const preview = await buildExcelImportPreview(file, categoryType);
            setImportPreview(preview);
            setIsImportPreviewOpen(true);
            setCategoryError("");
        } catch (error) {
            console.error("Error importing Excel:", error);
            setCategoryError(error instanceof Error ? error.message : "Không đọc được file Excel.");
        }
    }

    function handleConfirmExcelImport() {
        if (!importPreview || importPreview.errors.length > 0 || importPreview.rows.length === 0) return;

        if (importPreview.type !== categoryType) {
            setCategoryError("Loại danh mục đã thay đổi. Vui lòng import lại file Excel.");
            setIsImportPreviewOpen(false);
            setImportPreview(null);
            return;
        }

        if (importPreview.type === "MEDICINE") {
            setMedicineItems(importPreview.rows as MedicineFormItem[]);
        } else {
            setSupplyItems(importPreview.rows as SupplyFormItem[]);
        }

        setIsImportPreviewOpen(false);
        setImportPreview(null);
        setCategoryError("");
    }

    function renderExcelActions() {
        if (!categoryType) return null;

        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <Button type="button" variant="outline" size="sm" onClick={handleDownloadExcelTemplate} className="border-slate-200 text-slate-700 hover:bg-white">
                    <Download className="w-4 h-4 mr-2" />
                    Tải Excel mẫu
                </Button>
                {canEdit && (
                    <>
                    <Button type="button" variant="outline" size="sm" onClick={handleTriggerExcelImport} className="border-slate-200 text-slate-700 hover:bg-white">
                        <Upload className="w-4 h-4 mr-2" />
                        Import Excel
                    </Button>
                    <input
                        ref={excelFileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleExcelFileChange}
                    />
                    </>
                )}
            </div>
        );
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
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                        <Table className="min-w-[2200px]">
                            <TableHeader>
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="text-slate-500 w-14">STT</TableHead>
                                    <TableHead className="text-slate-500 min-w-36">STT Thông báo chào giá</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Tên thuốc</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Tên hoạt chất</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Nồng độ/Hàm lượng</TableHead>
                                    <TableHead className="text-slate-500 min-w-28">Đơn vị tính</TableHead>
                                    <TableHead className="text-slate-500 min-w-36">Dạng bào chế</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">Đường dùng</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">Nhóm TCKT</TableHead>
                                    <TableHead className="text-slate-500 min-w-32">SĐK/ GPNK</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Hãng sản xuất</TableHead>
                                    <TableHead className="text-slate-500 min-w-40">Nước sản xuất</TableHead>
                                    <TableHead className="text-slate-500 min-w-44">Quy cách đóng gói</TableHead>
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
                                            <Input value={item.bidNoticeOrder} onChange={(e) => updateMedicineItem(index, "bidNoticeOrder", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
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
                                            <Input value={item.unit} onChange={(e) => updateMedicineItem(index, "unit", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.dosageForm} onChange={(e) => updateMedicineItem(index, "dosageForm", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.route} onChange={(e) => updateMedicineItem(index, "route", e.target.value)} disabled={!canEdit} required className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.technicalGroup} onChange={(e) => updateMedicineItem(index, "technicalGroup", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.registrationNumber} onChange={(e) => updateMedicineItem(index, "registrationNumber", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.manufacturer} onChange={(e) => updateMedicineItem(index, "manufacturer", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.countryOfOrigin} onChange={(e) => updateMedicineItem(index, "countryOfOrigin", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={item.packaging} onChange={(e) => updateMedicineItem(index, "packaging", e.target.value)} disabled={!canEdit} className="bg-white border-slate-200 text-slate-800" />
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

    function renderImportPreviewTable() {
        if (!importPreview) return null;

        const columns = getExcelColumns(importPreview.type);
        const previewRows = importPreview.rows.slice(0, 20);

        return (
            <div className="space-y-2">
                <div className="overflow-x-auto rounded-md border border-slate-200">
                    <Table className={importPreview.type === "MEDICINE" ? "min-w-[1900px]" : "min-w-[760px]"}>
                        <TableHeader>
                            <TableRow className="border-slate-200 hover:bg-transparent">
                                {columns.map((column) => (
                                    <TableHead key={column.header} className="text-slate-500 min-w-32">
                                        {column.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center py-8 text-slate-500">
                                        Không có dòng hợp lệ để xem trước
                                    </TableCell>
                                </TableRow>
                            ) : (
                                previewRows.map((row, index) => (
                                    <TableRow key={index} className="border-slate-100 hover:bg-slate-50">
                                        {columns.map((column) => (
                                            <TableCell key={column.header} className="text-slate-700">
                                                {column.field
                                                    ? ((row as unknown as Record<string, string>)[column.field] || "")
                                                    : index + 1}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {importPreview.rows.length > previewRows.length && (
                    <p className="text-xs text-slate-500">
                        Chỉ hiển thị 20 dòng đầu trong phần xem trước.
                    </p>
                )}
            </div>
        );
    }

    function renderCheckboxOption<T extends string>(
        value: T,
        label: string,
        checked: boolean,
        onChange: () => void,
        disabled = false
    ) {
        return (
            <label
                key={value}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${disabled
                    ? "cursor-not-allowed text-slate-400"
                    : "cursor-pointer text-slate-700 hover:bg-slate-50"
                }`}
            >
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                <span>{label}</span>
            </label>
        );
    }

    function renderPresenceFilter(label: string, field: PresenceFilterField) {
        const values = draftFilters[field];

        return (
            <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Label>
                <div className="flex flex-wrap gap-1">
                    {presenceFilterOptions.map((option) => renderCheckboxOption(
                        option.value,
                        option.label,
                        values.includes(option.value),
                        () => setDraftFilters((filters) => ({
                            ...filters,
                            [field]: toggleFilterValue(filters[field], option.value),
                        }))
                    ))}
                </div>
            </div>
        );
    }

    function renderAdvancedFilters() {
        return (
            <div className="mt-4 space-y-5 border-t border-slate-200 pt-4">
                <div className="grid gap-6 xl:grid-cols-3">
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-800">Thông tin hợp đồng</h3>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Công ty</Label>
                            <Input
                                value={companyFilterSearch}
                                onChange={(e) => setCompanyFilterSearch(e.target.value)}
                                placeholder="Tìm công ty..."
                                className="h-8 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                            />
                            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 p-2">
                                {filteredCompanies.length === 0 ? (
                                    <div className="px-2 py-4 text-center text-sm text-slate-500">
                                        Không có công ty phù hợp
                                    </div>
                                ) : (
                                    filteredCompanies.map((company) => renderCheckboxOption(
                                        company.id,
                                        company.name,
                                        draftFilters.companyIds.includes(company.id),
                                        () => setDraftFilters((filters) => ({
                                            ...filters,
                                            companyIds: toggleFilterValue(filters.companyIds, company.id),
                                        }))
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Hiệu lực</Label>
                            <div className="flex flex-wrap gap-1">
                                {statusFilterOptions.map((option) => renderCheckboxOption(
                                    option.value,
                                    option.label,
                                    draftFilters.statuses.includes(option.value),
                                    () => setDraftFilters((filters) => ({
                                        ...filters,
                                        statuses: toggleFilterValue(filters.statuses, option.value),
                                    }))
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Ưu tiên</Label>
                            <div className="flex flex-wrap gap-1">
                                {priorityFilterOptions.map((option) => renderCheckboxOption(
                                    option.value,
                                    option.label,
                                    draftFilters.priorities.includes(option.value),
                                    () => setDraftFilters((filters) => ({
                                        ...filters,
                                        priorities: toggleFilterValue(filters.priorities, option.value),
                                    }))
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-800">Thời gian</h3>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Ngày ký</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input
                                    type="date"
                                    value={draftFilters.signDateFrom}
                                    onChange={(e) => setDraftFilters((filters) => ({ ...filters, signDateFrom: e.target.value }))}
                                    className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                />
                                <Input
                                    type="date"
                                    value={draftFilters.signDateTo}
                                    onChange={(e) => setDraftFilters((filters) => ({ ...filters, signDateTo: e.target.value }))}
                                    className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Ngày hết hạn</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input
                                    type="date"
                                    value={draftFilters.expiryDateFrom}
                                    onChange={(e) => setDraftFilters((filters) => ({ ...filters, expiryDateFrom: e.target.value }))}
                                    className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                />
                                <Input
                                    type="date"
                                    value={draftFilters.expiryDateTo}
                                    onChange={(e) => setDraftFilters((filters) => ({ ...filters, expiryDateTo: e.target.value }))}
                                    className="bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-700">Sắp hết hạn</Label>
                            <div className="flex flex-wrap gap-1">
                                {expiringInDaysOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setDraftFilters((filters) => ({
                                            ...filters,
                                            expiringInDays: filters.expiringInDays === option.value ? "" : option.value,
                                        }))}
                                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${draftFilters.expiringInDays === option.value
                                            ? "border-blue-600 bg-blue-50 text-blue-700"
                                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-800">Vận hành</h3>
                        {renderPresenceFilter("Danh mục hàng hóa", "goodsCategoryPresence")}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Loại danh mục</Label>
                            <div className="flex flex-wrap gap-1">
                                {goodsCategoryFilterOptions.map((option) => renderCheckboxOption(
                                    option.value,
                                    option.label,
                                    draftFilters.goodsCategoryTypes.includes(option.value),
                                    () => setDraftFilters((filters) => ({
                                        ...filters,
                                        goodsCategoryTypes: toggleFilterValue(filters.goodsCategoryTypes, option.value),
                                    })),
                                    isGoodsCategoryTypeDisabled
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {renderPresenceFilter("Phụ lục", "appendixPresence")}
                            {renderPresenceFilter("Nghiệm thu", "acceptancePresence")}
                            {renderPresenceFilter("Thanh toán", "paymentPresence")}
                            {renderPresenceFilter("Hóa đơn", "invoicePresence")}
                        </div>
                    </section>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Đang chọn {draftFilterCount} nhóm điều kiện</p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClearDraftFilters}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Xóa lựa chọn
                        </Button>
                        <Button
                            type="button"
                            onClick={handleApplyFilters}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                            Áp dụng
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const startRow = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
    const endRow = Math.min(pagination.page * pagination.pageSize, pagination.total);
    const resultDescription = hasAppliedAdvancedFilters
        ? "Kết quả theo bộ lọc đang áp dụng"
        : searchTerm
            ? "Kết quả tìm kiếm"
            : "Danh sách tất cả hợp đồng";

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

                            {renderExcelActions()}

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

            <Dialog
                open={isImportPreviewOpen}
                onOpenChange={(open) => {
                    setIsImportPreviewOpen(open);
                    if (!open) {
                        setImportPreview(null);
                    }
                }}
            >
                <DialogContent className="bg-white border-slate-200 text-slate-800 shadow-xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-slate-800">Xem trước import Excel</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            {importPreview
                                ? `${importPreview.fileName} - ${categoryTypeLabels[importPreview.type]}`
                                : "Kiểm tra dữ liệu trước khi thay thế danh mục hiện tại"}
                        </DialogDescription>
                    </DialogHeader>

                    {importPreview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs text-slate-500">Dòng dữ liệu</div>
                                    <div className="text-xl font-semibold text-slate-800">{importPreview.totalRows}</div>
                                </div>
                                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                                    <div className="text-xs text-green-700">Dòng hợp lệ</div>
                                    <div className="text-xl font-semibold text-green-700">{importPreview.validRows}</div>
                                </div>
                                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                                    <div className="text-xs text-red-700">Dòng lỗi</div>
                                    <div className="text-xl font-semibold text-red-700">{importPreview.errorRows}</div>
                                </div>
                            </div>

                            {importPreview.errors.length > 0 && (
                                <div className="max-h-48 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {importPreview.errors.map((error, index) => (
                                        <div key={index}>{error}</div>
                                    ))}
                                </div>
                            )}

                            {renderImportPreviewTable()}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsImportPreviewOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmExcelImport}
                            disabled={!importPreview || importPreview.errors.length > 0 || importPreview.rows.length === 0}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                            Xác nhận import
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm theo số hợp đồng, tên công ty..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="pl-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleFilterPanelToggle}
                                className="border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                Bộ lọc
                                {appliedFilterCount > 0 && (
                                    <Badge variant="outline" className="ml-1 border-blue-200 bg-blue-50 text-blue-700">
                                        {appliedFilterCount}
                                    </Badge>
                                )}
                            </Button>
                            {hasAppliedAdvancedFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClearAdvancedFilters}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                    <X className="w-4 h-4" />
                                    Xóa lọc
                                </Button>
                            )}
                        </div>
                    </div>
                    {isFilterPanelOpen && renderAdvancedFilters()}
                </CardContent>
            </Card>

            <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Hợp đồng ({pagination.total})</CardTitle>
                    <CardDescription className="text-slate-500">{resultDescription}</CardDescription>
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
