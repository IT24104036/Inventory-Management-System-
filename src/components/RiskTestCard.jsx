import { useState } from "react";
import { predictExpiryRisk } from "../lib/aiApi";
import { getAuthToken } from "@/lib/session";

export default function RiskTestCard() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePredict = async () => {
        try {
            setLoading(true);

            const token = getAuthToken();
            if (!token) {
                alert("No token found. Please log in first.");
                return;
            }

            const data = await predictExpiryRisk(
                {
                    days_to_expiry: 2,
                    remaining_quantity: 28,
                    total_units_sold: 1135,
                    average_daily_sales: 2.986842,
                    sales_velocity: 2.986842,
                    sell_through_rate: 0.8,
                    stock_pressure_ratio: 9.37,
                    recent_sales_trend: 1.1,
                    category: "Ready_to_Eat",
                    is_weekend: 0,
                    month: 4,
                },
                token
            );

            setResult(data);
        } catch (error) {
            console.error(error);
            alert("Prediction failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg">
            <button
                onClick={handlePredict}
                disabled={loading}
                className="px-4 py-2 rounded bg-black text-white"
            >
                {loading ? "Predicting..." : "Predict Expiry Risk"}
            </button>

            {result && (
                <div className="mt-4 space-y-2">
                    <p><strong>Probability:</strong> {result.expiry_risk_probability}</p>
                    <p><strong>Risk:</strong> {result.risk_label}</p>
                    <p><strong>Action:</strong> {result.suggested_action}</p>
                </div>
            )}
        </div>
    );
}
