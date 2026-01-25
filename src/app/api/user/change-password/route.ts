import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        // Check authentication
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { currentPassword, newPassword, confirmPassword } = await req.json();

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ error: "Mật khẩu mới và xác nhận mật khẩu không khớp" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 });
        }

        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "Mật khẩu mới không được trùng với mật khẩu hiện tại" }, { status: 400 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true }
        });

        if (!user) {
            return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ message: "Đổi mật khẩu thành công" }, { status: 200 });

    } catch (error) {
        console.error("Password change error:", error);
        return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
    }
}
