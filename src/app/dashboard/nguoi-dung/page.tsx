"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    createdAt: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    KHOA_DUOC: "Khoa Dược",
    KE_TOAN: "Kế Toán",
    LANH_DAO: "Lãnh Đạo",
};

const roleBadgeColors: Record<string, string> = {
    ADMIN: "bg-red-50 text-red-700 border-red-200",
    KHOA_DUOC: "bg-blue-50 text-blue-700 border-blue-200",
    KE_TOAN: "bg-green-50 text-green-700 border-green-200",
    LANH_DAO: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function UsersPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "KHOA_DUOC",
    });
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const userRole = (session?.user as { role?: string })?.role;

    // Check if user is Admin
    useEffect(() => {
        if (session && userRole !== "ADMIN") {
            router.push("/dashboard");
        }
    }, [session, userRole, router]);

    // Fetch users
    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (fetchUsersError) {
            console.error("Error fetching users:", fetchUsersError);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
            const method = editingUser ? "PUT" : "POST";

            // For editing, only send password if it's not empty
            const body = editingUser && !formData.password
                ? { username: formData.username, name: formData.name, role: formData.role }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({
                    type: "success",
                    text: editingUser ? "Cập nhật người dùng thành công!" : "Tạo người dùng thành công!",
                });
                fetchUsers();
                setDialogOpen(false);
                resetForm();
            } else {
                setMessage({ type: "error", text: data.error || "Đã xảy ra lỗi" });
            }
        } catch {
            setMessage({ type: "error", text: "Không thể kết nối đến server" });
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMessage({ type: "success", text: "Xóa người dùng thành công!" });
                fetchUsers();
            } else {
                const data = await res.json();
                setMessage({ type: "error", text: data.error || "Không thể xóa người dùng" });
            }
        } catch {
            setMessage({ type: "error", text: "Không thể kết nối đến server" });
        }
    }

    function openEditDialog(user: User) {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: "",
            name: user.name,
            role: user.role,
        });
        setDialogOpen(true);
    }

    function resetForm() {
        setEditingUser(null);
        setFormData({
            username: "",
            password: "",
            name: "",
            role: "KHOA_DUOC",
        });
        setMessage(null);
    }

    if (userRole !== "ADMIN") {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">Quản lý người dùng</h1>
                            <p className="text-slate-500">Tạo và quản lý tài khoản người dùng</p>
                        </div>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md">
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo người dùng mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white">
                            <DialogHeader>
                                <DialogTitle className="text-slate-800">
                                    {editingUser ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-slate-700">Tên đăng nhập</Label>
                                    <Input
                                        id="username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                        disabled={!!editingUser}
                                        className="bg-white border-slate-200 text-slate-800"
                                        placeholder="Nhập tên đăng nhập"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-700">Họ và tên</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="bg-white border-slate-200 text-slate-800"
                                        placeholder="Nhập họ và tên"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-slate-700">
                                        Mật khẩu {editingUser && "(để trống nếu không đổi)"}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required={!editingUser}
                                            className="pr-10 bg-white border-slate-200 text-slate-800"
                                            placeholder="Nhập mật khẩu"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role" className="text-slate-700">Vai trò</Label>
                                    <Select
                                        value={formData.role}
                                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                                    >
                                        <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <SelectItem value="KHOA_DUOC">Khoa Dược</SelectItem>
                                            <SelectItem value="KE_TOAN">Kế Toán</SelectItem>
                                            <SelectItem value="LANH_DAO">Lãnh Đạo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {message && (
                                    <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                                        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                                            {message.text}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                                        {editingUser ? "Cập nhật" : "Tạo mới"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDialogOpen(false);
                                            resetForm();
                                        }}
                                        className="flex-1"
                                    >
                                        Hủy
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Message */}
                {message && (
                    <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                        <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* Users Table */}
                <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">Danh sách người dùng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-center text-slate-500 py-8">Đang tải...</p>
                        ) : users.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Chưa có người dùng nào</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-slate-700">Tên đăng nhập</TableHead>
                                        <TableHead className="text-slate-700">Họ và tên</TableHead>
                                        <TableHead className="text-slate-700">Vai trò</TableHead>
                                        <TableHead className="text-slate-700">Ngày tạo</TableHead>
                                        <TableHead className="text-slate-700 text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium text-slate-800">{user.username}</TableCell>
                                            <TableCell className="text-slate-700">{user.name}</TableCell>
                                            <TableCell>
                                                <Badge className={roleBadgeColors[user.role]}>
                                                    {roleLabels[user.role]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-600">
                                                {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(user)}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
