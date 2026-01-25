import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:123456@localhost:5432/congno_db" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: hashedPassword,
            name: "Administrator",
            role: "ADMIN",
        },
    });

    console.log("Created admin user:", admin);

    // Create sample users for each role
    const khoaDuocPassword = await bcrypt.hash("khoaluoc123", 10);
    const khoaDuoc = await prisma.user.upsert({
        where: { username: "khoaduoc" },
        update: {},
        create: {
            username: "khoaduoc",
            password: khoaDuocPassword,
            name: "Nhân viên Khoa Dược",
            role: "KHOA_DUOC",
        },
    });
    console.log("Created Khoa Duoc user:", khoaDuoc);

    const keToanPassword = await bcrypt.hash("ketoan123", 10);
    const keToan = await prisma.user.upsert({
        where: { username: "ketoan" },
        update: {},
        create: {
            username: "ketoan",
            password: keToanPassword,
            name: "Nhân viên Kế Toán",
            role: "KE_TOAN",
        },
    });
    console.log("Created Ke Toan user:", keToan);

    const lanhDaoPassword = await bcrypt.hash("lanhdao123", 10);
    const lanhDao = await prisma.user.upsert({
        where: { username: "lanhdao" },
        update: {},
        create: {
            username: "lanhdao",
            password: lanhDaoPassword,
            name: "Lãnh Đạo",
            role: "LANH_DAO",
        },
    });
    console.log("Created Lanh Dao user:", lanhDao);

    // Create sample companies
    const company1 = await prisma.company.upsert({
        where: { id: "sample-company-1" },
        update: {},
        create: {
            id: "sample-company-1",
            name: "Công ty Dược phẩm ABC",
            address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
            taxCode: "0123456789",
            contactName: "Nguyễn Văn A",
            phone: "0901234567",
        },
    });
    console.log("Created sample company:", company1);

    const company2 = await prisma.company.upsert({
        where: { id: "sample-company-2" },
        update: {},
        create: {
            id: "sample-company-2",
            name: "Công ty TNHH Thiết bị Y tế XYZ",
            address: "456 Lê Lợi, Quận 3, TP.HCM",
            taxCode: "9876543210",
            contactName: "Trần Thị B",
            phone: "0912345678",
        },
    });
    console.log("Created sample company:", company2);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
