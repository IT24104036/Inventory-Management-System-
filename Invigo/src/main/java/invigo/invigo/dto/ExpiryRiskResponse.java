package invigo.invigo.dto;

import java.util.Map;

public class ExpiryRiskResponse {
    private double expiry_risk_probability;
    private Double model_expiry_risk_probability;
    private Double sell_through_before_expiry_probability;
    private Double suggested_discount_pct;
    private Map<String, Double> engineered_features;
    private Double estimated_days_to_sell;
    private Double sales_capacity_before_expiry;
    private Double sales_pace_coverage_ratio;
    private Double sales_pace_risk_probability;
    private Double sales_pace_sell_through_probability;
    private String sales_pace_message;
    private int predicted_label;
    private String risk_label;
    private String suggested_action;
    private Double impact_score;
    private Double decision_threshold;
    private String prediction_source;

    public double getExpiry_risk_probability() { return expiry_risk_probability; }
    public void setExpiry_risk_probability(double expiry_risk_probability) { this.expiry_risk_probability = expiry_risk_probability; }

    public Double getModel_expiry_risk_probability() { return model_expiry_risk_probability; }
    public void setModel_expiry_risk_probability(Double model_expiry_risk_probability) { this.model_expiry_risk_probability = model_expiry_risk_probability; }

    public Double getSell_through_before_expiry_probability() { return sell_through_before_expiry_probability; }
    public void setSell_through_before_expiry_probability(Double sell_through_before_expiry_probability) { this.sell_through_before_expiry_probability = sell_through_before_expiry_probability; }

    public Double getSuggested_discount_pct() { return suggested_discount_pct; }
    public void setSuggested_discount_pct(Double suggested_discount_pct) { this.suggested_discount_pct = suggested_discount_pct; }

    public Map<String, Double> getEngineered_features() { return engineered_features; }
    public void setEngineered_features(Map<String, Double> engineered_features) { this.engineered_features = engineered_features; }

    public Double getEstimated_days_to_sell() { return estimated_days_to_sell; }
    public void setEstimated_days_to_sell(Double estimated_days_to_sell) { this.estimated_days_to_sell = estimated_days_to_sell; }

    public Double getSales_capacity_before_expiry() { return sales_capacity_before_expiry; }
    public void setSales_capacity_before_expiry(Double sales_capacity_before_expiry) { this.sales_capacity_before_expiry = sales_capacity_before_expiry; }

    public Double getSales_pace_coverage_ratio() { return sales_pace_coverage_ratio; }
    public void setSales_pace_coverage_ratio(Double sales_pace_coverage_ratio) { this.sales_pace_coverage_ratio = sales_pace_coverage_ratio; }

    public Double getSales_pace_risk_probability() { return sales_pace_risk_probability; }
    public void setSales_pace_risk_probability(Double sales_pace_risk_probability) { this.sales_pace_risk_probability = sales_pace_risk_probability; }

    public Double getSales_pace_sell_through_probability() { return sales_pace_sell_through_probability; }
    public void setSales_pace_sell_through_probability(Double sales_pace_sell_through_probability) { this.sales_pace_sell_through_probability = sales_pace_sell_through_probability; }

    public String getSales_pace_message() { return sales_pace_message; }
    public void setSales_pace_message(String sales_pace_message) { this.sales_pace_message = sales_pace_message; }

    public int getPredicted_label() { return predicted_label; }
    public void setPredicted_label(int predicted_label) { this.predicted_label = predicted_label; }

    public String getRisk_label() { return risk_label; }
    public void setRisk_label(String risk_label) { this.risk_label = risk_label; }

    public String getSuggested_action() { return suggested_action; }
    public void setSuggested_action(String suggested_action) { this.suggested_action = suggested_action; }

    public Double getImpact_score() { return impact_score; }
    public void setImpact_score(Double impact_score) { this.impact_score = impact_score; }

    public Double getDecision_threshold() { return decision_threshold; }
    public void setDecision_threshold(Double decision_threshold) { this.decision_threshold = decision_threshold; }

    public String getPrediction_source() { return prediction_source; }
    public void setPrediction_source(String prediction_source) { this.prediction_source = prediction_source; }
}
