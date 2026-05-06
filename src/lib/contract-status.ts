export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";

const CONTRACT_DATE_TIME_ZONE = "Asia/Ho_Chi_Minh";

const contractDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CONTRACT_DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

function getDateKey(date: Date | string): string {
    const parsedDate = date instanceof Date ? date : new Date(date);
    const parts = contractDateFormatter.formatToParts(parsedDate);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

export function calculateContractStatus(contract: {
    expiryDate: Date | string;
    status?: ContractStatus | null;
}): ContractStatus {
    if (contract.status === "TERMINATED") {
        return "TERMINATED";
    }

    return getDateKey(contract.expiryDate) < getDateKey(new Date()) ? "EXPIRED" : "ACTIVE";
}
