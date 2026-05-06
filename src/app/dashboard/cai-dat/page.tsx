"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
    const { data: session } = useSession();
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        try {
            const res = await fetch("/api/user/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: data.message });
                setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                setMessage({ type: "error", text: data.error || "Đã xảy ra lỗi" });
            }
        } catch {
            setMessage({ type: "error", text: "Không thể kết nối đến server" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Cài đặt</h1>
                        <p className="text-slate-500">Quản lý thông tin tài khoản của bạn</p>
                    </div>
                </div>

                {/* User Info Card */}
                <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">Thông tin tài khoản</CardTitle>
                        <CardDescription className="text-slate-500">Thông tin người dùng hiện tại</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-600 text-sm">Tên đăng nhập:</span>
                            <span className="text-slate-800 font-semibold">{session?.user?.username || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="text-slate-600 text-sm">Vai trò:</span>
                            <span className="text-slate-800 font-semibold">{session?.user?.role || "N/A"}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Password Change Card */}
                <Card className="bg-white/80 border-slate-200 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">Đổi mật khẩu</CardTitle>
                        <CardDescription className="text-slate-500">Cập nhật mật khẩu của bạn</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Current Password */}
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword" className="text-slate-700">Mật khẩu hiện tại</Label>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={showPasswords.current ? "text" : "password"}
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        required
                                        className="pr-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        placeholder="Nhập mật khẩu hiện tại"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword" className="text-slate-700">Mật khẩu mới</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showPasswords.new ? "text" : "password"}
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        required
                                        className="pr-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-700">Xác nhận mật khẩu mới</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showPasswords.confirm ? "text" : "password"}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                        className="pr-10 bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                                        placeholder="Nhập lại mật khẩu mới"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Message */}
                            {message && (
                                <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                                    <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
                                        {message.text}
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"
                            >
                                {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
