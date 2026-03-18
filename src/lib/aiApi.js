import { apiUrl } from "@/lib/apiConfig";

export async function predictExpiryRisk(payload, token) {
    const res = await fetch(apiUrl("/ai/predict"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw new Error("Failed to fetch expiry risk prediction");
    }

    return res.json();
}
